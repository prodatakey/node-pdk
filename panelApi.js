'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makesession = undefined;

let makesession = exports.makesession = (() => {
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

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _socket = require('socket.io-client');

var _socket2 = _interopRequireDefault(_socket);

var _authApi = require('./authApi');

var _session = require('./session');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }