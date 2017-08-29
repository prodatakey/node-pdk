import url from 'url';
import io from 'socket.io-client';
import { getPanelToken } from './authApi';
import { makeSession as makeAuthSession } from './session';

export async function makeSession(authSession, {id, uri}) {
  const token = await getPanelToken(authSession, id);
  const session = makeAuthSession(
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

export default {makeSession};
