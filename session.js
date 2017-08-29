'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeSession = makeSession;

var _got = require('got');

var _got2 = _interopRequireDefault(_got);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * Create a wrapper around the `got` library for simplifying authenticated requests to API endpoints
 *
 * The session is meant to be a long-lived abstraction that simplifies interaction
 * with the API by handling authentication concerns automatically as calls happen.
 *
 * @param {string} id_token The JWT returned from the authentication process.
 * @param {string} baseUrl This base URL used for resolving relative URLs in the endpoint requests.
 */
function makeSession(token_set, baseUrl = 'https://accounts.pdk.io/api/') {
  let freshHeaders = (() => {
    var _ref = _asyncToGenerator(function* () {
      options.headers.authorization = `Bearer ${(yield token_set()).id_token}`;
    });

    return function freshHeaders() {
      return _ref.apply(this, arguments);
    };
  })();

  // Return an async function that makes a request to an API url and returns the body of the response


  // Curry some options to configure got for interacting with the API
  const options = {
    json: true,
    headers: {
      authorization: ''
    }
  };

  return (() => {
    var _ref2 = _asyncToGenerator(function* (callurl, callopts = {}) {
      const call = (() => {
        var _ref3 = _asyncToGenerator(function* () {
          return yield freshHeaders(), (yield (0, _got2.default)(_url2.default.resolve(baseUrl, callurl), Object.assign({}, options, callopts))).body;
        });

        return function call() {
          return _ref3.apply(this, arguments);
        };
      })();

      try {
        return yield call();
      } catch (err) {
        if (err && err.statusCode === 401) {
          // When we get a status 401 we are in need a valid tokenset
          // this can happen for a number of reasons, the token should update optimistically
          // but things like excessive clock skew can throw that off.

          // We force the token_set to refresh here
          yield token_set.refresh();

          // Then retry the call
          return yield call();
        }

        // If we get here then lets rethrow this error for the caller to handle
        throw err;
      }
    });

    return function (_x) {
      return _ref2.apply(this, arguments);
    };
  })();
}

exports.default = {
  makeSession
};