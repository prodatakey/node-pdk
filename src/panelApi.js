import url from 'url';
import { getPanelToken } from './authApi';
import { makeSession as makeAuthSession } from './session';
import io from 'socket.io-client';
import Debug from 'debug';

const debug = Debug('pdk:panelapi');

export async function makeSession(authSession, {id, uri}) {
  debug('Creating panel session');

  // Set up a panel session
  const token = await getPanelToken(authSession, id);
  const session = makeAuthSession(
    token,
    url.resolve(uri, 'api/')
  );
  // Cache the id_token so the non-async reconnect_attempt handler can get to it
  let id_token = (await token()).id_token;

  session.createEventStream = function() {
    // Add the auth token to the socket.io connection URL querystring
    const socket = io(uri, { query: { token: id_token } });

    // Update the token for reconnect attempts
    socket.on('reconnect_attempt', () => {
      socket.io.opts.query = {
        token: id_token
      }
    });

    // In order to squelch multiple events while refreshing,
    // the invalidToken handler fires once and must be resubscribed after successful handling.
    // TODO: Set a timer to do this prospectively _before_ the token expires
    // Watch for an `invalidToken` message and respond with a `renewedToken` message
    const invalidHandler = () => {
      debug(`Got invalid Token event`);

      // Force a token refresh
      token.refresh()
        .then(token)
        .then(ts => {
          debug(`Panel token refreshed, updating event stream token`);
          id_token = ts.id_token;
          socket.emit('renewedToken', { token: id_token });

          // Reconnect the invalidToken message on the websocket
          socket.once('invalidToken', invalidHandler);
        })
        .catch(err => {
          debug(`Error refreshing token: ${err.message}`);
        });
    };
    socket.once('invalidToken', invalidHandler);

    return socket;
  }

  return session;
}

export default {makeSession};
