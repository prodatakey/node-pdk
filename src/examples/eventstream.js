import opener from 'opener';
import {authenticate} from '../authenticator';
import {makeSession} from '../session';
import {makeSession as makePanelSession } from '../panelApi';
import Debug from 'debug'
import _ from 'lodash/fp';

const debug = Debug('pdk:event-stream');

(async function() {
  let tokenset = await authenticate({
    client_id: process.env.PDK_CLIENT_ID,
    client_secret: process.env.PDK_CLIENT_SECRET,
    opener: opener,
    scope: 'openid offline_access',
  });
  const authsession = await makeSession(tokenset);
  const panel = await authsession('panels/10702GA')
  debug(`Got panel ${JSON.stringify(panel)}`);

  // Create an authentication session to the panel's API
  const panelsession = await makePanelSession(authsession, panel);

  debug(`Creating event stream connection`);
  const stream = panelsession.createEventStream();

  // Subscribe to the connect/disconnect event
  stream.event$.subscribe(d => debug(`connection event: ${JSON.stringify(d)}`));
}());
