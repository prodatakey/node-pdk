import { Issuer } from 'openid-client';
import { createServer } from 'http';
import defaultOpener from 'opener';
import Debug from 'debug';
import { authenticateclient } from './clientauthenticator';

let debug = Debug('pdk:authenticator');

//FIXME: Remove this default http options setter after 'got' library will release new version
Issuer.defaultHttpOptions = {form: true};

export async function authenticate({ client_id, client_secret, scope = 'openid', issuer = 'https://accounts.pdk.io', opener = defaultOpener, refresh_token }) {
  debug(`Authenticating id: ${client_id}`);

  const pdkIssuer = await Issuer.discover(issuer);
  const client = new pdkIssuer.Client({ client_id, client_secret });
  client.CLOCK_TOLERANCE = 20;
  let callbackUri;

  debug(`Got configured oidc client`);

  let token_set = { refresh_token };

  // This must conform to the token_set interface
  // see session.js for usage
  const oauthtoken_set = async () => {
    if(!token_set.id_token) {
      debug(`Initial refresh of oauthtoken`);
      await oauthtoken_set.refresh()
    }

    //TODO: Check expiration time of token and optimistically renew it

    return token_set;
  };

  oauthtoken_set.refresh = async () => {
    if(token_set.refresh_token) {
      debug(`Refreshing with refresh token`);
      token_set = await client.refresh(token_set.refresh_token);
    } else {
      debug(`Refreshing with user flow`);
      token_set = await doUserFlow();
    }
    debug(`Got fresh token: ${JSON.stringify(token_set)}`);
  };

  oauthtoken_set.revoke = async () => {
    if(token_set.id_token) {
      client.revoke(token_set.id_token);
    }
  };

  // Force initial load of the oauthtoken_set
  await oauthtoken_set.refresh();
  return oauthtoken_set;

  // Resolve when response is delivered to the local http server
  //TODO: Handle a timeout case when a postback never happens
  async function doUserFlow() {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        debug(`Got an auth response server client`);

        // Parse the auth parameters off of the request
        const params = client.callbackParams(req);

        //TODO: Send a "you may close this window" body and/or auto-close JS
        res.end();

        // Ignore requests with no code and no error
        if(!params.code && !params.error) {
          debug(`Ignoring auth response with no code or error`);
          return;
        }

        // Got an auth response, shut the server down
        server.close();

        // Reject on error response
        if(params.error) {
          debug(`Error response from idp server: ${params.error_description || params.error}`);
          reject(params.error_description || params.error);
          return;
        }

        // Backchannel the code for token exchange
        debug(`Backchanneling the auth code for a token`);
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
        }

        callbackUri = `http://localhost:${server.address().port}/authCallback`;

        const ascope = scope ? scope.split(' ') : null;
        if (!ascope || ascope.indexOf('openid') === -1) {
          reject(new Error('"Scope" parameter must contain "openid" value'));
        }

        let authorizationUrlParams = {
          redirect_uri: callbackUri,
          scope: ascope.join(' ')
        };
        if (ascope.indexOf('offline_access') !== -1) {
          authorizationUrlParams.prompt = 'consent';
        }

        const authUrl = client.authorizationUrl(authorizationUrlParams);
        debug(`Opening the user flow auth interface to ${authUrl}`);
        opener(authUrl);
      });
    });
  }
}

export { authenticateclient };
export default {
  authenticate,
  authenticateclient
};
