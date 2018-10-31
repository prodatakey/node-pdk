import got from 'got'
import url from 'url'
import Debug from 'debug'
import parseLink from 'parse-link-header'
import { authenticate } from './authenticator'

const debug = Debug('pdk:session')

/**
 * Create a wrapper around the `got` library for simplifying authenticated requests to API endpoints
 *
 * The session is meant to be a long-lived abstraction that simplifies interaction
 * with the API by handling authentication concerns automatically as calls happen.
 *
 * @param {object} authopts Options for authenticating
 * @param {function} authenticate The authentication strategy to use, currently `authenticator` and `clientauthenticator`.
 * @param {string} baseUrl This base URL used for resolving relative URLs in the endpoint requests.
 */
export async function makeSession(authopts, authstrategy, baseUrl = 'https://accounts.pdk.io/api/') {

  // If optional `authstrategy` param is provided as a string
  // it is meant as the optional `baseUrl` param, so shuffle the args
  if(typeof(authstrategy) === 'string') {
    baseUrl = authstrategy
    authstrategy = undefined
  }

  // Set authstrategy default if it wasn't defined
  authstrategy = authstrategy || authenticate

  let token_set
  if(typeof(authopts.refresh) === 'function')
    token_set = authopts
  else
    token_set = await authstrategy(authopts)

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
  const session = async (resource, callopts) => {
    let resp

    const call = async (resource, callopts = {}) => (
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

// Sugar for setting paging querystring values and communicating paging
// info back via the query reference parameter
export const page = async (session, resource, query, callopts = {}) => {
  // Make the call
  const resp = await session(resource, { query: { page: 0, sort: 'asc', per_page: 100, ...query }, ...callopts })

  // Set the next values into the paging context so the caller can call in a loop checking `more` on each iteration
  if(resp.link && resp.link.next) {
    query.page = resp.link.next.page
    query.per_page = resp.link.next.per_page
    query.more = true
  } else {
    query.more = false
  }

  return resp
}

export default {
  makeSession,
  page
}
