'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.revokeToken = exports.refreshTokenSet = exports.getOidClient = exports.authenticate = undefined;

let authenticate = exports.authenticate = (() => {
  var _ref = _asyncToGenerator(function* (client_id, client_secret, opener, issuer = 'https://accounts.pdk.io') {
    //FIXME: Remove this default http options setter after 'got' library will release new version
    _openidClient.Issuer.defaultHttpOptions = { form: true };
    const pdkIssuer = yield _openidClient.Issuer.discover(issuer);
    const client = new pdkIssuer.Client({ client_id, client_secret });
    let callbackUri;

    // Resolve when response is delivered to the local http server
    //TODO: Handle a timeout case when a postback never happens
    return new Promise(function (resolve, reject) {
      const server = (0, _http.createServer)(function (req, res) {
        // Parse the auth parameters off of the request
        const params = client.callbackParams(req);

        //TODO: Send a "you may close this window" body and/or auto-close JS
        res.end();

        // Ignore requests with no code and no error
        if (!params.code && !params.error) return;

        // Got an auth response, shut the server down
        server.close();

        // Reject on error response
        if (params.error) {
          reject(params.error_description || params.error);
          return;
        }

        // Backchannel the code for token exchange
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
          return;
        }

        callbackUri = `http://localhost:${server.address().port}/authCallback`;

        const authUrl = client.authorizationUrl({ redirect_uri: callbackUri, scope: 'openid' });
        opener(authUrl);
      });
    });
  });

  return function authenticate(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
})();

let getOidClient = exports.getOidClient = (() => {
  var _ref2 = _asyncToGenerator(function* (client_id, client_secret, issuer = 'https://accounts.pdk.io') {
    const pdkIssuer = yield _openidClient.Issuer.discover(issuer);
    return new pdkIssuer.Client({ client_id, client_secret });
  });

  return function getOidClient(_x4, _x5) {
    return _ref2.apply(this, arguments);
  };
})();

/**
 * Refresh token set using provided refresh token
 * @param client_id the oAuth client identifier
 * @param client_secret the oAuth client secret
 * @param refresh_token token that will be used for  other tokens renewing
 * @param issuer url to the openid connect provider, default is: https://accounts.pdk.io
 * @returns {Promise} token set
 */


let refreshTokenSet = exports.refreshTokenSet = (() => {
  var _ref3 = _asyncToGenerator(function* (client_id, client_secret, refresh_token, issuer = 'https://accounts.pdk.io') {
    const pdkIssuer = yield _openidClient.Issuer.discover(issuer);
    const client = new pdkIssuer.Client({ client_id, client_secret });

    return client.refresh(refresh_token);
  });

  return function refreshTokenSet(_x6, _x7, _x8) {
    return _ref3.apply(this, arguments);
  };
})();

/**
 * Revoke provided token
 * @param client_id the oAuth client identifier
 * @param client_secret the oAuth client secret
 * @param token token that will be used for  other tokens renewing
 * @param issuer url to the openid connect provider, default is: https://accounts.pdk.io
 */


let revokeToken = exports.revokeToken = (() => {
  var _ref4 = _asyncToGenerator(function* (client_id, client_secret, token, issuer = 'https://accounts.pdk.io') {
    const pdkIssuer = yield _openidClient.Issuer.discover(issuer);
    const client = new pdkIssuer.Client({ client_id, client_secret });

    return client.revoke(token);
  });

  return function revokeToken(_x9, _x10, _x11) {
    return _ref4.apply(this, arguments);
  };
})();

var _openidClient = require('openid-client');

var _http = require('http');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = {
  authenticate,
  getOidClient,
  refreshTokenSet,
  revokeToken
};