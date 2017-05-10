import { writeFile } from 'fs';
import url from 'url';
import opener from 'opener';
import authenticate from '../authenticator';
import makesession from '../session';
import { getOu, getPanelToken } from '../authApi';
import _ from 'lodash/fp';
import p from 'asyncp';

process.on('unhandledRejection', r => console.log(r));

(async function() {
  let tokenset = await authenticate(
    process.env.PDK_CLIENT_ID,
    process.env.PDK_CLIENT_SECRET,
    opener,
  );
  const authsession = makesession(tokenset.id_token);

  // Connect to the panel and itemize asset info
  // Panel => InventoriedPanel
  const inventoryPanel = _.curry(async (authsession, { id, name, uri }) => {
    // Create an authentication session to the panel's API
    const panelsession = makesession(
      await getPanelToken(authsession, id),
      url.resolve(uri, 'api/')
    );

    // Get the list of configured devices
    let connected = false;
    let devices = [];
    try {
      devices = await panelsession('devices');
      connected = true;
    } catch(err) {
      //console.log('Unable to negotiate session with panel', err);
    }

    console.log(`${id}: online ${connected} devices ${devices.length}`);

    // Return what we found of the panel inventory
    return {
      id,
      name,
      connected,
      deviceCount: devices.length,
      devices,
    };
  });

  // Recursively processes asset info for every panel in an OU and its children OUs
  // OU => InventoriedOU
  const inventoryOu = _.curry(async (authsession, ouId) => {
    const { name, owner, panels, children } = await getOu(authsession, ouId);

    console.log(`${name}: panels ${panels.length} children ${children.length}`);

    // Return the inventoried OU
    return {
      name,
      owner,
      // Inventory each panel in the OU
      panels: await p.map(panels, inventoryPanel(authsession)),
      // Recurse to inventory any children of this OU
      children: await p.map(children, _.compose(inventoryOu(authsession), ou => ou.id)),
    };
  });

  // OU pseudo id 'mine' is the authenticated user's root organization
  const assets = await inventoryOu(authsession, 'mine');

  // Write the inventory out to a file
  writeFile('./inventory.json', JSON.stringify(assets, null, 2) , 'utf-8');
}())
