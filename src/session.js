import got from 'got';
import url from 'url';
import opener from 'opener';

import panelApi from './panelApi';
import authApi from './authApi';
import authenticator from './authenticator';
import MemoryAdapter from './adapters/memoryAdapter';

/**
 * Create a wrapper around the `got` library for simplifying authenticated requests to API endpoints
 *
 * @param {string} id_token The JWT returned from the authentication process.
 * @param {string} baseUrl This base URL used for resolving relative URLs in the endpoint requests.
 */
export function makeSession(id_token, baseUrl = 'https://accounts.pdk.io/api/') {
  // Curry some options to configure got for interacting with the API
  const options = {
    json: true,
    headers: {
      authorization: `Bearer ${id_token}`
    }
  };

  // Return an async function that makes a request to an API url and returns the body of the response
  return async (callurl, callopts = {}) => (
    (await got(url.resolve(baseUrl, callurl), { ...options, ...callopts })).body
  );
}


/**
 * Provides access to the panel api by the panel id, including refresh id tokens functionality.
 * After id_token has expired, new token will be requested from identity provider using auth session.
 * This function does not include auth session refresh, it should be processed outside.
 * @param authSession session to the identity provider
 * @param panel_id identifier of the panel
 * @returns {function(*=, *=)} panel session, function with two parameters: relative path to the resource
 * (e.g. 'persons' or 'groups/{id}') and options object that can include for example 'method', 'body' or 'query' properties
 */
export async function makePanelSession(authSession, panel_id) {

  let panel = await authApi.getPanel(authSession, panel_id);

  const options = {id: panel.id, uri: panel.uri};
  let panelSession = await panelApi.makeSession(authSession, options);

  return async(callurl, callopts = {}) => {
    try {
      return await panelSession(callurl, callopts);
    } catch (err) {
      if (err && err.statusCode === 401) {
        panelSession = await panelApi.makeSession(authSession, options);
        return (await panelSession(callurl, callopts));
      }
      throw err;
    }
  };
}

/**
 * Provides access to the identity provider api, including refresh auth tokens functionality.
 * After id_token has expired, it will be refreshed using refresh_token
 * @param client_id client application identifier
 * @param client_secret client application secret
 * @param token_adapter adapter that will be used to get refresh token at the first time and store new refresh tokens.
 * Should have getToken() and setToken() methods
 * @param issuer openID connect provider url
 * @returns {function(*=, *=)} session, function with two parameters: relative path to the resource
 * (e.g. 'ous' or 'panels/{id}') and options object that can include for example 'method', 'body' or 'query' properties
 */
export async function makeAuthSession(client_id, client_secret, token_adapter, issuer = 'https://accounts.pdk.io') {
  let tokenSet;
  if (!token_adapter) {
    //create auth session with refresh tokens
    tokenSet = await authenticator.authenticate(client_id, client_secret, opener, 'openid offline_access', issuer);
    if (!tokenSet || !tokenSet.id_token) {
      throw new Error('Cannot get id_token from OpenID Connect provider');
    }
    //if there is refresh token in the response, we will use it for refreshing
    if (tokenSet.refresh_token) {
      token_adapter = new MemoryAdapter();
      token_adapter.setToken(tokenSet.refresh_token);
    }
  } else {
    let refreshToken = await token_adapter.getToken();
    if (!refreshToken) {
      throw new Error('Cannot get refresh token from adapter.');
    }
    tokenSet = await authenticator.refreshTokenSet(client_id, client_secret, refreshToken, issuer);
    await token_adapter.setToken(tokenSet.refresh_token);
  }

  let authSession = makeSession(tokenSet.id_token, url.resolve(issuer, 'api/'));

  return async(callurl, callopts = {}) => {
    try {
      return await authSession(callurl, callopts);
    } catch (err) {
      if (err && err.statusCode === 401) {
        if (token_adapter) {
          tokenSet = await authenticator.refreshTokenSet(client_id, client_secret, tokenSet.refresh_token, issuer);
          await token_adapter.setToken(tokenSet.refresh_token);
        } else {
          tokenSet = await authenticator.authenticate(client_id, client_secret, opener, issuer);
        }
        authSession = makeSession(tokenSet.id_token, url.resolve(issuer, 'api/'));
        return (await authSession(callurl, callopts));
      }
      throw err;
    }
  };
}

export default {
  makeSession,
  makePanelSession,
  makeAuthSession,
};
