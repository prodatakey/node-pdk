import url from 'url'
import { makeSession } from './session'
import { getPanelToken } from './authApi'
import io from 'socket.io-client'
import Debug from 'debug'

const debug = Debug('pdk:panelapi')

function parseJwt (token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

function getTokenRefreshInterval (token) {
  const tokenPayload = parseJwt(token)
  const tokenLifeTime = tokenPayload.exp - tokenPayload.iat
  return Math.ceil(0.9 * tokenLifeTime)
}

export async function makePanelSession(authSession, {id, uri}) {
  debug('Creating panel session');

  let timeoutId; // needed to stop token refresh loop on 'disconnect' event

  // Set up a panel session
  const token = await getPanelToken(authSession, id);
  const session = await makeSession(
    token,
    url.resolve(uri, 'api/')
  );

  // Cache the id_token so the non-async reconnect_attempt handler can get to it
  let { id_token } = await token();

  const tokenRefreshInterval = getTokenRefreshInterval(id_token);

  async function tokenRefreshLoop (socket) {
    try {
      await token.refresh();
      const { id_token: newToken } = await token();

      socket.emit('renewedToken', { token: newToken });

      id_token = newToken;
      socket.io.opts.query = {
        token: newToken
      }
    } catch(err) {
      debug(`Error refreshing stream token: ${err.message}`);
    }

    timeoutId = setTimeout(
      async () => await tokenRefreshLoop(socket),
      tokenRefreshInterval
    )
  }

  session.createEventStream = function() {
    // Add the auth token to the socket.io connection URL querystring
    const socket = io(uri, { query: { token: id_token } });

    // Run token refresh loop
    setTimeout(
      async () => await tokenRefreshLoop(socket),
      tokenRefreshInterval
      )
      
    socket.on('disconnect', async (reason) => {
      if (reason !== 'io client disconnect') {
        return;
      }
  
      clearTimeout(timeoutId);
    })

    // Update the token for reconnect attempts
    socket.on('reconnect_attempt', () => {
      socket.io.opts.query = {
        token: id_token
      }
    });

    socket.on('connect_error', async (err) => {
      if (err.message === 'Authorization has failed.') {
        debug('Unable to connect due to auth failure, refresh token and reconnect')
        try {
          // Force a token refresh
          await token.refresh()
          const { id_token: newToken } = await token()
          id_token = newToken
          socket.io.opts.query = {
            token: newToken
          }
        } catch (err) {
          debug(`Error refreshing stream token: ${err.message}`)
        }
        socket.connect()
      }
    })

    // In order to squelch multiple events while refreshing,
    // the invalidToken handler fires once and must be resubscribed after successful handling.
    // Watch for an `invalidToken` message and respond with a `renewedToken` message
    const invalidHandler = async () => {
      debug(`Got invalid panel token message from stream`);

      try {
        // Force a token refresh
        await token.refresh()
        const { id_token: newToken } = await token()
        socket.emit('renewedToken', { token: newToken });
        id_token = newToken;

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

export default { makePanelSession };