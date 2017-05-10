'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _authenticator = require('./authenticator');

var authenticator = _interopRequireWildcard(_authenticator);

var _session = require('./session');

var session = _interopRequireWildcard(_session);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

exports.default = {
  authenticator,
  session
};