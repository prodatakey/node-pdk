'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeSession = makeSession;

var _got = require('got');

var _got2 = _interopRequireDefault(_got);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const debug = (0, _debug2.default)('pdk:session');

/**
 * Create a wrapper around the `got` library for simplifying authenticated requests to API endpoints
 *
 * The session is meant to be a long-lived abstraction that simplifies interaction
 * with the API by handling authentication concerns automatically as calls happen.
 *
 * @param {function} token_set The token set returned from the authentication process.
 * @param {string} baseUrl This base URL used for resolving relative URLs in the endpoint requests.
 */
function makeSession(token_set, baseUrl = 'https://accounts.pdk.io/api/') {
  // Curry some options to configure got for interacting with the API
  const options = {
    json: true,
    headers: {
      authorization: ''
    }
  };

  async function freshHeaders() {
    options.headers.authorization = `Bearer ${(await token_set()).id_token}`;
  }

  // Return an async function that makes a request to an API url and returns the body of the response
  // Simply returns only the body of a resource
  // person = session('people/123');
  const session = async (resource, callopts) => {
    let resp;

    const call = async (resource, callopts = {}) => (await freshHeaders(), await (0, _got2.default)(_url2.default.resolve(baseUrl, resource), { ...options, ...callopts }));

    try {
      debug(`Sending API request ${resource}, ${JSON.stringify(callopts)}`);
      resp = await call(resource, callopts);
    } catch (err) {
      debug(`Error from API request ${JSON.stringify(err)}`);

      if (err && err.statusCode === 401) {
        // When we get a status 401 we are in need a valid tokenset
        // this can happen for a number of reasons, the token should update optimistically
        // but things like excessive clock skew can throw that off.

        debug(`Forcing token set refresh`);

        // We force the token_set to refresh here
        await token_set.refresh();

        debug(`Retrying API call with fresh token set`);
        // Then retry the call
        resp = await call(resource, callopts);
      }

      // If we get here then lets rethrow this error for the caller to handle
      throw err;
    }

    // Add a count property for requests with an array body and a total count header
    // This allows the call site to find the total number of paged items available on the server
    if (Array.isArray(resp.body) && 'x-total-count' in resp.headers) {
      resp.body.count = parseInt(resp.headers['x-total-count']);
    }

    return resp.body;
  };

  // Sugar for setting paging querystring values
  session.page = async (resource, page = 0, sort = 'asc', per_page = 100, callopts) => await session(resource, { query: { page, per_page, sort }, ...callopts });

  return session;
}

exports.default = {
  makeSession
};