'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clientauth = undefined;

var _openidClient = require('openid-client');

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let debug = (0, _debug2.default)('pdk:auth:client');

//FIXME: Remove this default http options setter after 'got' library will release new version
_openidClient.Issuer.defaultHttpOptions = { form: true };

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
const clientauth = exports.clientauth = ({
  client_id,
  client_secret,
  issuer = 'https://accounts.pdk.io'
}) => async () => {
  debug(`Authenticating as client_id: ${client_id}`);

  const pdkIssuer = await _openidClient.Issuer.discover(issuer);
  const client = new pdkIssuer.Client({ client_id, client_secret });
  client.CLOCK_TOLERANCE = 20;

  debug(`Got configured oidc client`);

  let token_set = {};

  // This must conform to the token_set interface
  // see session.js for usage
  const oauthtoken_set = async () => {
    if (!token_set.id_token) {
      debug(`Initial fetch of oauthtoken`);
      await oauthtoken_set.refresh();
    }

    //TODO: Check expiration time of token and optimistically renew it

    return token_set;
  };

  oauthtoken_set.refresh = async () => {
    debug(`Getting token with client credentials`);

    token_set = await client.grant({ grant_type: 'client_credentials' });

    debug(`Got fresh token: ${JSON.stringify(token_set)}`);
  };

  oauthtoken_set.revoke = async () => {
    if (token_set.id_token) {
      client.revoke(token_set.id_token);
    }
  };

  // Force initial load of the oauthtoken_set
  await oauthtoken_set.refresh();
  return oauthtoken_set;
};