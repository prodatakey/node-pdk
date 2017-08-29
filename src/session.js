import got from 'got';
import url from 'url';

/**
 * Create a wrapper around the `got` library for simplifying authenticated requests to API endpoints
 *
 * The session is meant to be a long-lived abstraction that simplifies interaction
 * with the API by handling authentication concerns automatically as calls happen.
 *
 * @param {string} id_token The JWT returned from the authentication process.
 * @param {string} baseUrl This base URL used for resolving relative URLs in the endpoint requests.
 */
export function makeSession(token_set, baseUrl = 'https://accounts.pdk.io/api/') {
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
  return async (callurl, callopts = {}) => {
    const call = async() => (
      await freshHeaders(),
      (await got(url.resolve(baseUrl, callurl), { ...options, ...callopts })).body
    );

    try {
      return await call();
    } catch (err) {
      if (err && err.statusCode === 401) {
        // When we get a status 401 we are in need a valid tokenset
        // this can happen for a number of reasons, the token should update optimistically
        // but things like excessive clock skew can throw that off.

        // We force the token_set to refresh here
        await token_set.refresh();

        // Then retry the call
        return await call();
      }

      // If we get here then lets rethrow this error for the caller to handle
      throw err;
    }
  };
}

export default {
  makeSession,
};
