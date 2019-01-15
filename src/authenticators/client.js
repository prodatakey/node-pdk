import { Issuer } from 'openid-client';
import Debug from 'debug';

let debug = Debug('pdk:auth:client');

/**
 * Authenticate as a client using the client credentials flow.
 * This give the client permissions to operate as its pdk.io proxy user.
 *
 * @param {object} opts
 * @param {string} opts.client_id The provided oauth client_id.
 * @param {string} opts.client_secret The provided oauth client_secret.
 * @param {string} [opts.issuer=https://accounts.pdk.io/api/] - The base issuer URL used for finding openid connect auth endpoints.
 *
 * @returns {function} A configured authentication strategy
 */
export const clientauth = ({
  client_id,
  client_secret,
  issuer = 'https://accounts.pdk.io',
  default_http_options = {},
}) =>
async () => {
  // merge provided default http options with PDK defaults and set it to the Issuer object
  Issuer.defaultHttpOptions = {timeout: 10000, retries: 1, ...default_http_options}

  debug(`Authenticating as client_id: ${client_id}`);

  const pdkIssuer = await Issuer.discover(issuer);
  const client = new pdkIssuer.Client({ client_id, client_secret });
  client.CLOCK_TOLERANCE = 20;

  debug(`Got configured oidc client`);

  let token_set = { };

  // This must conform to the token_set interface
  // see session.js for usage
  const oauthtoken_set = async () => {
    if(!token_set.id_token) {
      debug(`Initial fetch of oauthtoken`);
      await oauthtoken_set.refresh()
    }

    //TODO: Check expiration time of token and optimistically renew it

    return token_set;
  };

  let outstanding
  oauthtoken_set.refresh = async () => {
    if(!outstanding) {
      debug(`Getting token with client credentials`);

      outstanding = client.grant({ grant_type: 'client_credentials' })

      token_set = await outstanding
      outstanding = undefined

      debug(`Got fresh token: ${JSON.stringify(token_set)}`);
    } else {
      debug(`Waiting for outstanding client credential token refresh`);
      await outstanding
    }
  };

  oauthtoken_set.revoke = async () => {
    if(token_set.id_token) {
      client.revoke(token_set.id_token);
    }
  };

  // Force initial load of the oauthtoken_set
  await oauthtoken_set.refresh();
  return oauthtoken_set;
}
