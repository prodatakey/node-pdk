"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
class InvalidParameterError extends Error {
  constructor(message, name) {
    super(`Parameter ${name} is invalid: ${message}`);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;

    this.parameter = name;
  }
}

exports.InvalidParameterError = InvalidParameterError;
class TokenRefreshError extends Error {
  constructor(error) {
    super(`There was an error refreshing the token: ${error.message}`);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}
exports.TokenRefreshError = TokenRefreshError;