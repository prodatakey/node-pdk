'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

let makesession = (() => {
  var _ref = _asyncToGenerator(function* (authsession, { id, uri }) {
    const token = yield (0, _authApi.getPanelToken)(authsession, id);
    const session = (0, _session.makesession)(token, _url2.default.resolve(uri, 'api/'));

    session.connectStream = function () {
      const stream = (0, _socket2.default)(uri, { query: `token=${token}` });
      return new Promise((resolve, reject) => {
        stream.once('connect', () => resolve(stream));
        stream.once('error', reject);
      });
    };

    return session;
  });

  return function makesession(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

/**
 * Provides access to the panel api by the panel id, including refresh id tokens functionality
 * @param client_id client application identifier
 * @param client_secret client application secret
 * @param panel_id identifier of the panel
 * @param issuer openID connect provider url
 * @returns {function(*=, *=)} panel session, function with two parameters: relative path to the resource
 * (e.g. 'persons' or 'groups/{id}') and options object that can include for example 'method', 'body' or 'query' properties
 */


var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _socket = require('socket.io-client');

var _socket2 = _interopRequireDefault(_socket);

var _opener = require('opener');

var _opener2 = _interopRequireDefault(_opener);

var _authApi = require('./authApi');

var _session = require('./session');

var _authenticator = require('./authenticator');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = (() => {
  var _ref2 = _asyncToGenerator(function* (client_id, client_secret, panel_id, issuer = 'https://accounts.pdk.io') {
    let tokenset = yield (0, _authenticator.authenticate)(client_id, client_secret, _opener2.default, issuer);
    if (!tokenset || !tokenset.id_token) {
      throw new Error('Cannot get id_token from OpenID Connect provider');
    }

    let authsession = (0, _session.makesession)(tokenset.id_token);

    let panel = yield (0, _authApi.getPanel)(authsession, panel_id);

    const options = { id: panel.id, uri: panel.uri };
    let panelSession = yield makesession(authsession, options);

    return (() => {
      var _ref3 = _asyncToGenerator(function* (callurl, callopts = {}) {
        try {
          return yield panelSession(callurl, callopts);
        } catch (err) {
          if (err && err.statusCode === 401) {
            console.log('Panel token is expired, refresh all tokens');
            try {
              if (!tokenset.refresh_token) {
                //if client does not support refresh tokens (implicit authentication flow) we will get token set from /auth
                throw new Error();
              }
              tokenset = yield (0, _authenticator.refreshTokenSet)(client_id, client_secret, tokenset.refresh_token, issuer);
            } catch (err) {
              tokenset = yield (0, _authenticator.authenticate)(client_id, client_secret, _opener2.default, issuer);
            }
            authsession = (0, _session.makesession)(tokenset.id_token);
            panelSession = yield makesession(authsession, options);
            return yield panelSession(callurl, callopts);
          }
          throw err;
        }
      });

      return function (_x6) {
        return _ref3.apply(this, arguments);
      };
    })();
  });

  return function (_x3, _x4, _x5) {
    return _ref2.apply(this, arguments);
  };
})();