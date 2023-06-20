import { makeSession, makePanelSession, userauth } from '../index.js';
import Debug from 'debug'

const debug = Debug('example:event-stream');

(async function() {
  // Authenticate and create a session to the pdk auth API
  const authsession = await makeSession(userauth({
    client_id: process.env.PDK_CLIENT_ID,
    client_secret: process.env.PDK_CLIENT_SECRET,
    scope: 'openid offline_access',
  }));

  // Get the panel
  const panel = await authsession('panels/10702GA')
  debug(`Got panel ${JSON.stringify(panel)}`);

  // Create an authentication session to the panel's API
  const panelsession = await makePanelSession(authsession, panel);

  debug(`Creating event stream connection`);
  const stream = panelsession.createEventStream();

  // Subscribe to the connect/disconnect event
  stream.on('liveEvent', d => debug(`liveEvent: ${JSON.stringify(d)}`));

}());
