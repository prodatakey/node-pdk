import got from 'got'
import url from 'url'
import Debug from 'debug'
import parseLink from 'parse-link-header'

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
export async function makeSession(strategy, baseUrl = 'https://accounts.pdk.io/api') {
  if(typeof(strategy) !== 'function' && typeof(strategy.refresh) !== 'function')
    throw new Error('A strategy or token_set must be provided')

  const token_set =
    typeof(strategy.refresh) === 'function' ?
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
    let resp

    const call = async (resource) => (
      await freshHeaders(),
      await got(url.resolve(baseUrl, resource), { ...options, ...callopts })
    )

    try {
      debug(`Sending API request ${resource}, ${JSON.stringify(callopts)}`)
      resp = await call(resource, callopts)
    } catch (err) {
      debug(`Error from API request ${JSON.stringify(err)}`)

      if (err && err.statusCode === 401) {
        // When we get a status 401 we are in need a valid tokenset
        // this can happen for a number of reasons, the token should update optimistically
        // but things like excessive clock skew can throw that off.

        debug(`Forcing token set refresh`)
        await token_set.refresh()

        debug(`Retrying API call with fresh token set`)
        resp = await call(resource, callopts)
      } else {
        // If we get here then lets rethrow this error for the caller to handle
        throw err
      }
    }

    // Add a count property for responses with an array body and a total count header
    // This allows the call site to find the total number of paged items available on the server
    if(Array.isArray(resp.body) && 'x-total-count' in resp.headers) {
      resp.body.count = parseInt(resp.headers['x-total-count'])
      resp.body.link = parseLink(resp.headers['link'])
    }

    return resp.body
  }

  return session
}
