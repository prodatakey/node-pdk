import esmock from 'esmock'
import { InvalidParameterError, TokenRefreshError } from './errors.js'
import { HTTPError } from 'got'

const getuut = async ({
  body,
  headers,
  got,
  auth,
  id_token,
  baseUrl,
  refresh,
} = { }) => {
  id_token = id_token || 'blah'
  headers = headers || { }
  body = body || { foo: 'bar' }
  refresh = refresh || sinon.stub().resolves()

  got = got || sinon.stub().resolves({ body, headers })
  got.HTTPError = HTTPError

  const tokenset = sinon.stub().resolves({ id_token })
  tokenset.refresh = refresh

  auth = auth || (auth === null ? undefined : sinon.stub().resolves(tokenset))

  const { makeSession } = await esmock('./session.js', {
    got
  })

  return {
    session: await makeSession(auth, baseUrl),
    got,
    auth,
    refresh,
    id_token,
    body
  }
}

describe('session', () => {
  let uutstub

  describe('creating with auth strategy', () => {
    let session, got

    beforeEach(async () => {
      uutstub = await getuut()
      session = uutstub.session
      got = uutstub.got
    })

    it('it should create the session function', () => {
      expect(session).to.be.a('function')
    })

    it('it should call the auth strategy', () => {
      uutstub.auth.should.have.been.called()
    })

    describe('when calling session', () => {

      it('should prepend default baseUrl', async () => {
        await session('things')

        got.should.have.been.calledWith(sinon.match(/^https:\/\/accounts\.pdk\.io/))
      })

      it('should return response body', async () => {
        const body = await session('things')

        expect(body).to.eql(uutstub.body)
      })

      it('should use no call options by default', async () => {
        const resource = 'things'
        await session(resource)
        await session(resource, {})

        got.firstCall.args[1].should.eql(uutstub.got.secondCall.args[1])
      })

      it('should pass call options through to got', async () => {
        const options = { myopt: true }
        await session('things', options)

        got.should.have.been.calledWith(sinon.match.string, sinon.match(options))
      })

      it('should set json call option', async () => {
        await session('things')

        got.should.have.been.calledWith(sinon.match.string, sinon.match({ json: true }))
      })

      it('should set authorization header to Bearer token', async () => {
        await session('things')

        got.should.have.been.calledWith(
          sinon.match.string,
          sinon.match({ headers: { authorization: `Bearer ${uutstub.id_token}` } })
        )
      })

      it('should throw on undefined resource', () => {
        return session()
          .should.eventually.be.rejectedWith(InvalidParameterError)
      })

      it('should throw on invalid resource', () => {
        return session({})
          .should.eventually.be.rejectedWith(InvalidParameterError)
      })

      it('should throw on resource with querystring', () => {
        return session('hello?a=1')
          .should.eventually.be.rejectedWith(InvalidParameterError)
      })

      it('should throw on resource with hash', () => {
        return session('hello#abc123')
          .should.eventually.be.rejectedWith(InvalidParameterError)
      })

      describe('and request fails with 401', () => {
        let session, got, refresh
        beforeEach(async () => {
          uutstub = await getuut()
          session = uutstub.session
          got = uutstub.got
          refresh = uutstub.refresh
        })

        // Create a mock got.HTTPError
        const makeError = (statusCode, statusMessage) => {
          const response = { statusCode, statusMessage }
          // got uses _onResponse to detect a request obj
          const request = { response, _onResponse: 'blah' }
          response.request = request
          return new HTTPError(response)
        }

        it('should refresh token and retry', async () => {
          got.onFirstCall().rejects(makeError(401, 'unauthorized'))

          await session('potatoes')

          got.should.have.been.calledTwice()
          refresh.should.have.been.calledOnce()
        })

        it('should wait for pending token refresh', async () => {
          got.onFirstCall().rejects(makeError(401, 'unauthorized'))

          await session('potatoes')

          got.should.have.been.calledTwice()
          refresh.should.have.been.calledOnce()
        })

        it('should throw when retry fails after refresh', () => {
          const error = makeError(401, 'unauthorized')
          got.rejects(error)

          return session('potatoes').should.eventually.be.rejectedWith(error)
        })

        it('should throw when refresh fails', () => {
          const error = new Error('could not refresh token')
          refresh.onFirstCall().rejects(error)
          got.onFirstCall().rejects(makeError(401, 'unauthorized'))

          return session('potatoes').should.eventually.be.rejectedWith(TokenRefreshError)
        })
      })

    })
  })

  describe('when response is a list', () => {
    let session, body, length

    beforeEach(async () => {
      length = 20
      body = [1, 2, 3, 4]

      uutstub = await getuut({ body, headers: {
        'x-total-count': length,
        link: '<https://example.com/things?page=3&per_page=100>; rel="next",<https://example.com/things?page=1&per_page=100>; rel="prev"'
      } })
      session = uutstub.session
    })

    it('should return the array body', async () => {
      const res = await session('things')

      res.should.be.an('array')
      res.should.eql(body)
    })

    it('should add total count property to array', async () => {
      const res = await session('things')

      res.count.should.equal(length)
    })

    it('should parse link header', async () => {
      const res = await session('things')

      expect(res.link).to.be.an('object')
    })
  })

  describe('creating with custom baseUrl', () => {
    const baseUrl = 'https://example.com'

    describe('when calling session', () => {

      it('should prepend custom baseUrl', async () => {
        const resource = 'things'
        uutstub = await getuut({ baseUrl })

        await uutstub.session(resource)

        uutstub.got.should.have.been.calledWith(`${baseUrl}/${resource}`)
      })

      it('should reject non-string baseUrl', async () => {
        return getuut({ baseUrl: {} })
          .should.be.rejectedWith(InvalidParameterError)
      })

    })
  })

  describe('creating with throwing auth strategy', () => {
    const error = new Error('blah')

    it('it should rethrow strategy error', () => {
      return getuut({ auth: sinon.stub().rejects(error) })
        .should.be.rejectedWith(error)
    })
  })

  describe('creating with invalid auth strategy', () => {
    it('should throw on non-URL', () => {
      return getuut({ auth: 'blah' })
        .should.be.rejectedWith(InvalidParameterError)
    })

    it('should throw on non-string', () => {
      return getuut({ auth: {} })
        .should.be.rejectedWith(InvalidParameterError)
    })

    it('should throw on undefined', () => {
      return getuut({ auth: null })
        .should.be.rejectedWith(InvalidParameterError)
    })
  })

  describe('creating with token_set', () => {
    beforeEach(async() => {
      const auth = sinon.stub().resolves({})
      auth.refresh = sinon.stub()
      uutstub = await getuut({ auth })
    })

    it('should not call auth token', () => {
      uutstub.auth.should.not.have.been.called()
    })
  })

})
