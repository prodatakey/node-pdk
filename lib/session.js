'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = makesession;

var _got = require('got');

var _got2 = _interopRequireDefault(_got);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function makesession(id_token, baseUrl) {
  const options = {
    json: true,
    headers: {
      authorization: `Bearer ${ id_token }`
    }
  };

  return (callurl, callopts = {}) => (0, _got2.default)(_url2.default.resolve(baseUrl, callurl), Object.assign({}, options, callopts));
}