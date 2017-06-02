'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeAuthSession = exports.makePanelSession = undefined;

/**
 * Provides access to the panel api by the panel id, including refresh id tokens functionality.
 * After id_token has expired, new token will be requested from identity provider using auth session.
 * This function does not include auth session refresh, it should be processed outside.
 * @param authSession session to the identity provider
 * @param panel_id identifier of the panel
 * @returns {function(*=, *=)} panel session, function with two parameters: relative path to the resource
 * (e.g. 'persons' or 'groups/{id}') and options object that can include for example 'method', 'body' or 'query' properties
 */
let makePanelSession = exports.makePanelSession = (() => {
  var _ref2 = _asyncToGenerator(function* (authSession, panel_id) {

    let panel = yield _authApi2.default.getPanel(authSession, panel_id);

    const options = { id: panel.id, uri: panel.uri };
    let panelSession = yield _panelApi2.default.makeSession(authSession, options);

    return (() => {
      var _ref3 = _asyncToGenerator(function* (callurl, callopts = {}) {
        try {
          return yield panelSession(callurl, callopts);
        } catch (err) {
          if (err && err.statusCode === 401) {
            panelSession = yield _panelApi2.default.makeSession(authSession, options);
            return yield panelSession(callurl, callopts);
          }
          throw err;
        }
      });

      return function (_x4) {
        return _ref3.apply(this, arguments);
      };
    })();
  });

  return function makePanelSession(_x2, _x3) {
    return _ref2.apply(this, arguments);
  };
})();

/**
 * Provides access to the identity provider api, including refresh auth tokens functionality.
 * After id_token has expired, it will be refreshed using refresh_token
 * @param client_id client application identifier
 * @param client_secret client application secret
 * @param token_adapter adapter that will be used to get refresh token at the first time and store new refresh tokens.
 * Should have getToken() and setToken() methods
 * @param issuer openID connect provider url
 * @returns {function(*=, *=)} session, function with two parameters: relative path to the resource
 * (e.g. 'ous' or 'panels/{id}') and options object that can include for example 'method', 'body' or 'query' properties
 */


let makeAuthSession = exports.makeAuthSession = (() => {
  var _ref4 = _asyncToGenerator(function* (client_id, client_secret, token_adapter, issuer = 'https://accounts.pdk.io') {
    let tokenSet;
    if (!token_adapter) {
      //create auth session with refresh tokens
      tokenSet = yield _authenticator2.default.authenticate(client_id, client_secret, _opener2.default, 'openid offline_access', issuer);
      if (!tokenSet || !tokenSet.id_token) {
        throw new Error('Cannot get id_token from OpenID Connect provider');
      }
      //if there is refresh token in the response, we will use it for refreshing
      if (tokenSet.refresh_token) {
        token_adapter = new _memoryAdapter2.default();
        token_adapter.setToken(tokenSet.refresh_token);
      }
    } else {
      let refreshToken = yield token_adapter.getToken();
      if (!refreshToken) {
        throw new Error('Cannot get refresh token from adapter.');
      }
      tokenSet = yield _authenticator2.default.refreshTokenSet(client_id, client_secret, refreshToken, issuer);
      yield token_adapter.setToken(tokenSet.refresh_token);
    }

    let authSession = makeSession(tokenSet.id_token, _url2.default.resolve(issuer, 'api/'));

    return (() => {
      var _ref5 = _asyncToGenerator(function* (callurl, callopts = {}) {
        try {
          return yield authSession(callurl, callopts);
        } catch (err) {
          if (err && err.statusCode === 401) {
            if (token_adapter) {
              tokenSet = yield _authenticator2.default.refreshTokenSet(client_id, client_secret, tokenSet.refresh_token, issuer);
              yield token_adapter.setToken(tokenSet.refresh_token);
            } else {
              tokenSet = yield _authenticator2.default.authenticate(client_id, client_secret, _opener2.default, issuer);
            }
            authSession = makeSession(tokenSet.id_token, _url2.default.resolve(issuer, 'api/'));
            return yield authSession(callurl, callopts);
          }
          throw err;
        }
      });

      return function (_x8) {
        return _ref5.apply(this, arguments);
      };
    })();
  });

  return function makeAuthSession(_x5, _x6, _x7) {
    return _ref4.apply(this, arguments);
  };
})();

exports.makeSession = makeSession;

var _got = require('got');

var _got2 = _interopRequireDefault(_got);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _opener = require('opener');

var _opener2 = _interopRequireDefault(_opener);

var _panelApi = require('./panelApi');

var _panelApi2 = _interopRequireDefault(_panelApi);

var _authApi = require('./authApi');

var _authApi2 = _interopRequireDefault(_authApi);

var _authenticator = require('./authenticator');

var _authenticator2 = _interopRequireDefault(_authenticator);

var _memoryAdapter = require('./adapters/memoryAdapter');

var _memoryAdapter2 = _interopRequireDefault(_memoryAdapter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * Create a wrapper around the `got` library for simplifying authenticated requests to API endpoints
 *
 * @param {string} id_token The JWT returned from the authentication process.
 * @param {string} baseUrl This base URL used for resolving relative URLs in the endpoint requests.
 */
function makeSession(id_token, baseUrl = 'https://accounts.pdk.io/api/') {
  // Curry some options to configure got for interacting with the API
  const options = {
    json: true,
    headers: {
      authorization: `Bearer ${id_token}`
    }
  };

  // Return an async function that makes a request to an API url and returns the body of the response
  return (() => {
    var _ref = _asyncToGenerator(function* (callurl, callopts = {}) {
      return (yield (0, _got2.default)(_url2.default.resolve(baseUrl, callurl), Object.assign({}, options, callopts))).body;
    });

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  })();
}exports.default = {
  makeSession,
  makePanelSession,
  makeAuthSession
};