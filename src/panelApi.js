import url from 'url'
import { makeSession } from './session'
import { getPanelToken } from './authApi'
import io from 'socket.io-client'
import Debug from 'debug'
import * as jose from 'jose'

const debug = Debug('pdk:panelapi')

function getTokenRefreshInterval (token) {
  const tokenPayload = jose.decodeJwt(token)
  const tokenLifeTime = tokenPayload.exp - tokenPayload.iat
  return Math.ceil(0.9 * tokenLifeTime)
}

export async function makePanelSession(authSession, {id, uri}) {
  debug('Creating panel session');

  // Set up a panel session
  const token = await getPanelToken(authSession, id);
  const session = await makeSession(
    token,
    url.resolve(uri, 'api/')
  );

  // Cache the id_token so the non-async reconnect_attempt handler can get to it
  let { id_token } = await token();
  let tokenRefreshInterval = getTokenRefreshInterval(id_token);

  async function refreshToken () {
    await token.refresh();
    id_token = (await token()).id_token;
    tokenRefreshInterval = getTokenRefreshInterval(id_token)
    return id_token;
  }

  session.createEventStream = function() {
    // Add the auth token to the socket.io connection URL querystring
    const socket = io(uri, { query: { token: id_token } });
    let intervalId;

    socket.on('disconnect', async (reason) => {
      if (reason !== 'io client disconnect') {
        return;
      }
      clearInterval(intervalId)
      intervalId = undefined
    })

    socket.on('connect', () => {
      if (intervalId !== undefined) {
        return
      }

      intervalId = setInterval(
        async () => {
          try {
            const token = await refreshToken()
            socket.emit('renewedToken', { token });
            socket.io.opts.query = { token }
          } catch(err) {
            debug(`Error refreshing stream token: ${err.message}`);
          }
        }, 
        tokenRefreshInterval * 1000
      )
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
          const token = await refreshToken()
          socket.io.opts.query = { token }
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
        const token = await refreshToken()
        socket.emit('renewedToken', { token });

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
