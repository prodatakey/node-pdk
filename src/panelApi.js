import url from 'url';
import io from 'socket.io-client';
import { getPanelToken } from './authApi';
import { makesession as makeauthsession } from './session';

export async function makesession(authsession, { id, uri }) {
  const token = await getPanelToken(authsession, id);
  const session = makeauthsession(
    token,
    url.resolve(uri, 'api/')
  );

  session.connectStream = function() {
    const stream = io(uri, { query: `token=${token}` });
    return new Promise((resolve, reject) => {
      stream.once('connect', () => resolve(stream));
      stream.once('error', reject);
    });
  };

  return session;
}

