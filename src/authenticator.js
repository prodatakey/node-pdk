import { Issuer } from 'openid-client';
import { createServer } from 'http';
import defaultOpener from 'opener';

//FIXME: Remove this default http options setter after 'got' library will release new version
Issuer.defaultHttpOptions = {form: true};

export async function authenticate(client_id, client_secret, opener, scope, issuer = 'https://accounts.pdk.io') {
  const pdkIssuer = await Issuer.discover(issuer);
  const client = new pdkIssuer.Client({ client_id, client_secret });
  if (!opener) {
    opener = defaultOpener;
  }
  let callbackUri;

  // Resolve when response is delivered to the local http server
  //TODO: Handle a timeout case when a postback never happens
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      // Parse the auth parameters off of the request
      const params = client.callbackParams(req);

      //TODO: Send a "you may close this window" body and/or auto-close JS
      res.end();

      // Ignore requests with no code and no error
      if(!params.code && !params.error)
        return;

      // Got an auth response, shut the server down
      server.close();

      // Reject on error response
      if(params.error) {
        reject(params.error_description || params.error);
        return;
      }

      // Backchannel the code for token exchange
      client.authorizationCallback(callbackUri, params)
        .then(resolve)
        .catch(reject);
    });

    // Unref client sockets so keep-alive connections don't stall server close
    server.on('connection', socket => socket.unref());
    //Listen on random port
    server.listen(0, '127.0.0.1', (err) => {
      if(err) {
        reject(new Error(`Could not listen for authentication callback: ${err.message}`));
        return;
      }

      callbackUri = `http://localhost:${server.address().port}/authCallback`;

      scope = scope ? scope.split(' ') : null;
      if (!scope || scope.indexOf('openid') === -1) {
        throw new Error('"Scope" parameter must contain "openid" value');
      }
      let authorizationUrlParams = {
        redirect_uri: callbackUri,
        scope: scope.join(' ')
      };
      if (scope.indexOf('offline_access') !== -1) {
        authorizationUrlParams.prompt = 'consent';
      }

      const authUrl = client.authorizationUrl(authorizationUrlParams);
      opener(authUrl);
    });
  });
}

export async function getOidClient(client_id, client_secret, issuer = 'https://accounts.pdk.io') {
  const pdkIssuer = await Issuer.discover(issuer);
  return new pdkIssuer.Client({ client_id, client_secret });
}

/**
 * Refresh token set using provided refresh token
 * @param client_id the oAuth client identifier
 * @param client_secret the oAuth client secret
 * @param refresh_token token that will be used for  other tokens renewing
 * @param issuer url to the openid connect provider, default is: https://accounts.pdk.io
 * @returns {Promise} token set
 */
export async function refreshTokenSet(client_id, client_secret, refresh_token, issuer = 'https://accounts.pdk.io') {
  const pdkIssuer = await Issuer.discover(issuer);
  const client = new pdkIssuer.Client({client_id, client_secret});

  return client.refresh(refresh_token);
}

/**
 * Revoke provided token
 * @param client_id the oAuth client identifier
 * @param client_secret the oAuth client secret
 * @param token token that will be used for  other tokens renewing
 * @param issuer url to the openid connect provider, default is: https://accounts.pdk.io
 */
export async function revokeToken(client_id, client_secret, token, issuer = 'https://accounts.pdk.io') {
  const pdkIssuer = await Issuer.discover(issuer);
  const client = new pdkIssuer.Client({client_id, client_secret});

  return client.revoke(token);
}

export default {
  authenticate,
  getOidClient,
  refreshTokenSet,
  revokeToken
};
