'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _authenticator = require('./authenticator');

var authenticator = _interopRequireWildcard(_authenticator);

var _session = require('./session');

var _session2 = _interopRequireDefault(_session);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

exports.default = {
  authenticator,
  makesession: _session2.default
};
