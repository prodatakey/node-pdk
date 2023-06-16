import { writeFile } from 'fs';
import url from 'url';
import { clientauth, makeSession, makePanelSession, getOu } from '../index.js';
import _ from 'lodash/fp';
import p from 'asyncp';
import Debug from 'debug';

let debug = Debug('pdk:inventory');
const IDP_URI = process.env.IDP_URI || 'https://accounts.pdk.io';

(async function() {
  // Connect to the panel and itemize asset info
  // Panel => InventoriedPanel
  const inventoryPanel = _.curry(async (authsession, { id, name, uri }) => {
    // Create an authentication session to the panel's API
    const panelsession = makePanelSession(authsession, { id, uri });

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
  const inventoryOu = _.curry(async(authsession, ouId) => {
    const ou = await getOu(authsession, ouId);

    console.log(`${ou.name}: panels ${ou.panels.length} children ${ou.children.length}`);

    // Return the inventoried OU
    return {
      name: ou.name,
      owner: ou.owner,
      // Inventory each panel in the OU
      panels: await p.map(ou.panels, inventoryPanel(authsession)),
      // Recurse to inventory any children of this OU
      children: await p.map(ou.children, _.compose(inventoryOu(authsession), ou => ou.id)),
    };
  });

  try {
    let authsession = await makeSession(
      clientauth({
        client_id: process.env.PDK_CLIENT_ID,
        client_secret: process.env.PDK_CLIENT_SECRET,
        issuer: IDP_URI
      }),
      url.resolve(IDP_URI, `api/`)
    );

    // OU pseudo id 'mine' is the authenticated user's root organization
    const assets = await inventoryOu(authsession, 'mine');

    // Write the inventory out to a file
    writeFile('./inventory.json', JSON.stringify(assets, null, 2), 'utf-8');
  } catch(err) {
    debug(`Error retrieving inventory: ${err.message}`);
  }
}());
