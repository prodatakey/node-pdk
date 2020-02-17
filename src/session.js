import got from 'got'
import { URL } from 'url'
import Debug from 'debug'
import parseLink from 'parse-link-header'
import { InvalidParameterError, TokenRefreshError } from './errors'

const debug = Debug('pdk:session')

/**
 * Create a wrapper around the `got` library for simplifying authenticated requests to API endpoints
 *
 * The session is meant to be a long-lived abstraction that simplifies interaction
 * with the API by handling authentication concerns automatically as calls happen.
 *
 * @param {function|object} strategy A configured authentication strategy to use when creating the session, currently `userauth` and `clientauth`. This can alternatively be an existing token_set previously retrieved directly from an auth strategy.
 * @param {string} [baseUrl=https://accounts.pdk.io/api] - The base url used to when calling API endpoints
 */
export async function makeSession(strategy, baseUrl = 'https://accounts.pdk.io/api/') {
  // Test auth strategy for validity
  if(!strategy || typeof(strategy) !== 'function' && typeof(strategy.refresh) !== 'function')
    throw new InvalidParameterError('strategy', 'A strategy or token_set must be provided')

  // Test the baseUrl for validity
  try {
    new URL(baseUrl)
  } catch(err) {
    throw new InvalidParameterError('baseUrl', 'Must be a valid URL')
  }

  // Set the token_set
  const token_set =
    typeof(strategy.refresh) === 'function' ? // If this _is_ a token set, just set it
    strategy :
    await strategy()

  // Curry some options to configure got for interacting with the API
  const options = {
    json: true,
    headers: {
      authorization: ''
    }
  }

  async function freshHeaders() {
    options.headers.authorization = `Bearer ${(await token_set()).id_token}`
  }

  // Return an async function that makes a request to an API url and returns the body of the response
  // Simply returns only the body of a resource
  // person = session('people/123')
  const session = async (resource, callopts = {}) => {
    // Check that the resource arg is a string
    if(typeof(resource) !== 'string')
      throw new InvalidParameterError('resource', 'must provide a valid relative Url')

    // Build the absolute call URL
    const callUrl = new URL(resource, baseUrl)

    // Check the validity of the call URL
    // It should not have query string or hash added
    if(callUrl.search || callUrl.hash)
      throw new InvalidParameterError('resource', 'must not include querystring or hash, put them in callopts instead')

    // Function to make the call with fresh headers
    // and to enrich and project the response body
    const call = async () => {
      await freshHeaders()
      // clientOptions in callopts is a special object that may contain params for our custom logic
      const returnRawResponse = callopts.clientOptions && callopts.clientOptions.returnRawResponse
      delete callopts.clientOptions
      // merge header values
      callopts.headers && Object.assign(callopts.headers, options.headers)
      const resp = await got(callUrl.toString(), { ...options, ...callopts })

      // Add a count property for responses with an array body and a total count header
      // This allows the call site to find the total number of paged items available on the server
      if(Array.isArray(resp.body) && 'x-total-count' in resp.headers) {
        resp.body.count = parseInt(resp.headers['x-total-count'])
        resp.body.link = parseLink(resp.headers['link'])
      }

      return returnRawResponse ? resp : resp.body;
    }

    // Attempt the call with a single retry after refreshing the token
    // if the call fails with a 401
    try {
      debug(`Sending API request for ${resource}, ${JSON.stringify(callopts)}`)
      return await call()
    } catch (err) {
      debug(`Error from API request ${JSON.stringify(err)}`)

      if (err && err instanceof got.HTTPError && err.statusCode === 401) {
        // When we get a status 401 we are in need a valid tokenset
        // this can happen for a number of reasons, the token should update optimistically
        // but things like excessive clock skew can throw that off.

        debug(`Forcing token set refresh`)
        try {
          await token_set.refresh()
        } catch(err) {
          // Wrap errors refreshing the token into a specific error type
          throw new TokenRefreshError(err)
        }

        // If this throws, the caller will get the actual error
        debug(`Retrying API call with fresh token set`)
        return await call()
      } else {
        // If we get here then lets rethrow this error for the caller to handle
        throw err
      }
    }
  }

  return session
}
