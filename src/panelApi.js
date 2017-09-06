import url from 'url';
import { getPanelToken } from './authApi';
import { makeSession as makeAuthSession } from './session';
import { IO, ioEvent } from 'rxjs-socket.io';
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

  // Add the auth token to the socket.io connection URL querystring
  const siourl = url.parse(uri);
  siourl.query = { token: (await token()).id_token };

  session.createEventStream = function() {
    const socket = new IO();
    socket.connect(url.format(siourl));

    // In order to squelch multiple events while refreshing,
    // the handler fires once and must be resubscribed after successful handling.
    // TODO: Set a timer to do this prospectively _before_ the token expires
    const subInvalidToken = () => {
      // Watch for an `invalidToken` message and respond with a `renewedToken` message
      const onInvalidToken = new ioEvent('invalidToken', true);
      socket.listenToEvent(onInvalidToken).event$.subscribe(() => {
        debug(`Got invalid Token event`);

        // Force a token refresh
        setTimeout(() => {
        token.refresh().then(() => {
          return token().then(
            ts => {
              debug(`Panel token refreshed, updating event stream token`);
              socket.emit('renewedToken', { token: ts.id_token });
              subInvalidToken();
            }
          );
        });
        }, 10000);

      });
    };
    subInvalidToken();

    return socket;
  }

  return session;
}

export default {makeSession};
