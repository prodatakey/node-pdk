'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makesession = makesession;

var _got = require('got');

var _got2 = _interopRequireDefault(_got);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * Create a wrapper around the `got` library for simplifying authenticated requests to API endpoints
 *
 * @param {string} id_token The JWT returned from the authentication process.
 * @param {string} baseUrl This base URL used for resolving relative URLs in the endpoint requests.
 */
function makesession(id_token, baseUrl = 'https://accounts.pdk.io/api/') {
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
}

exports.default = { makesession };