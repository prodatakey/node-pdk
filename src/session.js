import got from 'got';
import url from 'url';

/**
 * Create a wrapper around the `got` library for simplifying authenticated requests to API endpoints
 *
 * @param {string} id_token The JWT returned from the authentication process.
 * @param {string} baseUrl This base URL used for resolving relative URLs in the endpoint requests.
 */
export function makesession(id_token, baseUrl = 'https://accounts.pdk.io/api/') {
  // Curry some options to configure got for interacting with the API
  const options = {
    json: true,
    headers: {
      authorization: `Bearer ${id_token}`
    }
  };

  // Return an async function that makes a request to an API url and returns the body of the response
  return async(callurl, callopts = {}) => (
    (await got(url.resolve(baseUrl, callurl), {...options, ...callopts})).body
  );
}

export default {makesession};
