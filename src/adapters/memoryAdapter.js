/**
 * This is the base adapter for storing refresh tokens. Token will be stored in memory
 */
export default class MemoryAdapter {

  constructor() {
    this.refreshToken = null;
  }

  /**
   * Get stored value of the token
   * @returns {String|null}
   */
  getToken() {
    return this.refreshToken;
  }

  /**
   * Store new token value in memory
   * @param token
   */
  setToken(token) {
    this.refreshToken = token;
  }
}
