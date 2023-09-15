import url from 'url'
import { makeSession } from './session.js'
import { getSystemToken } from './authApi.js'
import io from 'socket.io-client'
import Debug from 'debug'

const debug = Debug('pdk:systemapi')

export async function makeSystemSession(authSession, {id, uri}) {
  debug('Creating system session');

  // Set up a system session
  const token = await getSystemToken(authSession, id);
  const session = await makeSession(
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
    const invalidHandler = async () => {
      debug(`Got invalid system token message from stream`);

      try {
        // Force a token refresh
        await token.refresh()
        const { id_token } = await token()
        socket.emit('renewedToken', { token: id_token });

        // Reconnect the invalidToken message on the websocket
        socket.once('invalidToken', invalidHandler);
      } catch(err) {
        debug(`Error refreshing stream token: ${err.message}`);
      }
    };
    socket.once('invalidToken', invalidHandler);

    return socket;
  }

  return session;
}

export default { makeSystemSession };
