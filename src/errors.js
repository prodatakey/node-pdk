export class InvalidParameterError extends Error {
  constructor(message, name) {
    super(`Parameter ${name} is invalid: ${message}`)
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name

    this.parameter = name
  }
}

export class TokenRefreshError extends Error {
  constructor(error) {
    super(`There was an error refreshing the token: ${error.message}`)
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
  }
}
