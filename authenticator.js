'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.authenticate = undefined;

let authenticate = exports.authenticate = (() => {
  var _ref = _asyncToGenerator(function* ({ client_id, client_secret, scope = 'openid', issuer = 'https://accounts.pdk.io', opener = _opener2.default, refresh_token }) {

    // Resolve when response is delivered to the local http server
    //TODO: Handle a timeout case when a postback never happens
    let doUserFlow = (() => {
      var _ref5 = _asyncToGenerator(function* () {
        return new Promise(function (resolve, reject) {
          const server = (0, _http.createServer)(function (req, res) {
            debug(`Got an auth response server client`);

            // Parse the auth parameters off of the request
            const params = client.callbackParams(req);

            //TODO: Send a "you may close this window" body and/or auto-close JS
            res.end();

            // Ignore requests with no code and no error
            if (!params.code && !params.error) {
              debug(`Ignoring auth response with no code or error`);
              return;
            }

            // Got an auth response, shut the server down
            server.close();

            // Reject on error response
            if (params.error) {
              debug(`Error response from idp server: ${params.error_description || params.error}`);
              reject(params.error_description || params.error);
              return;
            }

            // Backchannel the code for token exchange
            debug(`Backchanneling the auth code for a token`);
            client.authorizationCallback(callbackUri, params).then(resolve).catch(reject);
          });

          // Unref client sockets so keep-alive connections don't stall server close
          server.on('connection', function (socket) {
            return socket.unref();
          });
          //Listen on random port
          server.listen(0, '127.0.0.1', function (err) {
            if (err) {
              reject(new Error(`Could not listen for authentication callback: ${err.message}`));
            }

            callbackUri = `http://localhost:${server.address().port}/authCallback`;

            scope = scope ? scope.split(' ') : null;
            if (!scope || scope.indexOf('openid') === -1) {
              reject(new Error('"Scope" parameter must contain "openid" value'));
            }
            let authorizationUrlParams = {
              redirect_uri: callbackUri,
              scope: scope.join(' ')
            };
            if (scope.indexOf('offline_access') !== -1) {
              authorizationUrlParams.prompt = 'consent';
            }

            const authUrl = client.authorizationUrl(authorizationUrlParams);
            debug(`Opening the user flow auth interface to ${authUrl}`);
            opener(authUrl);
          });
        });
      });

      return function doUserFlow() {
        return _ref5.apply(this, arguments);
      };
    })();

    debug(`Authenticating id: ${client_id} sec: ${client_secret}`);

    const pdkIssuer = yield _openidClient.Issuer.discover(issuer);
    const client = new pdkIssuer.Client({ client_id, client_secret });
    let callbackUri;

    debug(`Got client`);

    let token_set = { refresh_token };

    // This must conform to the token_set interface
    // see session.js for usage
    const oauthtoken_set = (() => {
      var _ref2 = _asyncToGenerator(function* () {
        if (!token_set.id_token) {
          debug(`Initial refresh of oauthtoken`);
          oauthtoken_set.refresh();
        }

        //TODO: Check expiration time of token and optimistically renew it

        return token_set;
      });

      return function oauthtoken_set() {
        return _ref2.apply(this, arguments);
      };
    })();

    oauthtoken_set.refresh = _asyncToGenerator(function* () {
      if (token_set.refresh_token) {
        debug(`Refreshing with refresh token`);
        token_set = yield client.refresh(token_set.refresh_token);
      } else {
        debug(`Refreshing with user flow`);
        token_set = yield doUserFlow();
      }
    });

    oauthtoken_set.revoke = _asyncToGenerator(function* () {
      if (token_set.id_token) {
        client.revoke(token_set.id_token);
      }
    });

    // Force initial load of the oauthtoken_set
    yield oauthtoken_set.refresh();
    return oauthtoken_set;
  });

  return function authenticate(_x) {
    return _ref.apply(this, arguments);
  };
})();

var _openidClient = require('openid-client');

var _http = require('http');

var _opener = require('opener');

var _opener2 = _interopRequireDefault(_opener);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

let debug = (0, _debug2.default)('pdk:authenticator');

//FIXME: Remove this default http options setter after 'got' library will release new version
_openidClient.Issuer.defaultHttpOptions = { form: true };

exports.default = {
  authenticate
};