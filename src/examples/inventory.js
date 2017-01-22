import { writeFile } from 'fs';
import { inspect } from 'util';
import authenticate from '../authenticator';
import makesession from '../session';
import { getOu, getPanelToken } from '../authApi';
import _ from 'lodash/fp';
import p from 'asyncp';

process.on('unhandledRejection', r => console.log(r));

const acompose = (fn, ...rest) =>
  rest.length
    ? async (...args) =>
        fn(await acompose(...rest)(...args))
    : fn;

(async function() {
  let tokenset = await authenticate(
    process.env.PDK_CLIENT_ID,
    process.env.PDK_CLIENT_SECRET,
  );
  const authsession = makesession(tokenset.id_token);

  // Connect to the panel and itemize asset info
  // Panel => InventoriedPanel
  const inventoryPanel = _.curry(async (authsession, { id, name, uri }) => {
    // Create an authentication session to the panel's API
    const panelsession = makesession(
      await getPanelToken(authsession, id),
      `${uri}api/`
    );

    // Get the list of configured devices
    let connected = false;
    let devices = [];
    try {
      devices = await panelsession('devices');
      connected = true;
    } catch(err) {
      console.log('Unable to negotiate session with panel', err);
    }

    // Return what we found of the inventory
    return {
      id,
      name,
      connected,
      deviceCount: devices.length,
      devices,
    };
  });

  // Processes asset info for every panel in an OU
  // OU => InventoriedOU
  const inventoryOu = _.curry(async (authsession, ouId) => {
    const { name, owner, panels, children } = await getOu(authsession, ouId);
    return {
      name,
      owner,
      panels: await p.map(panels, inventoryPanel(authsession)),
      // Recurse to inventory any children of this OU
      children: await p.map(children, _.compose(inventoryOu(authsession), ou => ou.id)),
    };
  });

  /*
  const myou = await getOu(authsession, 'mine');
  console.log(myou);
  */
  const assets = await inventoryOu(authsession, 'mine');
  console.log(inspect(assets, { depth: null }));

  writeFile('./inventory.json', JSON.stringify(assets, null, 2) , 'utf-8');
}())
