'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _openidClient = require('openid-client');

var _opener = require('opener');

var _opener2 = _interopRequireDefault(_opener);

var _http = require('http');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = (() => {
  var _ref = _asyncToGenerator(function* ({ client_id, client_secret }) {
    const pdkIssuer = yield _openidClient.Issuer.discover('https://accounts.pdk.io');

    const client = new pdkIssuer.Client({ client_id, client_secret });

    const authUrl = client.authorizationUrl({ redirect_uri: 'http://localhost:8433/authCallback', scope: 'openid' });

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
          return reject(params.error_description || params.error);
        }

        // Backchannel the code for token exchange
        return client.authorizationCallback('http://localhost:8433/authCallback', params).then(function (token) {
          resolve(token);
        });
      });
      // Unref client sockets so keep-alive connections don't stall server close
      server.on('connection', function (socket) {
        return socket.unref();
      });
      // TODO: Use random probed port assignment
      server.listen(8433, '127.0.0.1');

      (0, _opener2.default)(authUrl);
    });
  });

  function authenticate(_x) {
    return _ref.apply(this, arguments);
  }

  return authenticate;
})();