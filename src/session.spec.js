import proxyquire from 'proxyquire'
import { InvalidParameterError, TokenRefreshError } from './errors'
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
  got = got || sinon.stub().resolves({ body, headers })
  refresh = refresh || sinon.stub().resolves()

  const tokenset = sinon.stub().resolves({ id_token })
  tokenset.refresh = refresh

  auth = auth || (auth === null ? undefined : sinon.stub().resolves(tokenset))

  const { makeSession } = proxyquire('./session', {
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

        it('should refresh token and retry', async () => {
          got.onFirstCall().rejects(new HTTPError({ statusCode: 401 }, { host: 'example.com' }))

          await session('potatoes')

          got.should.have.been.calledTwice()
          refresh.should.have.been.calledOnce()
        })

        it('should throw when retry fails after refresh', () => {
          const error = new HTTPError({ statusCode: 401 }, { host: 'example.com' })
          got.onFirstCall().rejects(error)
          got.onSecondCall().rejects(error)

          return session('potatoes').should.eventually.be.rejectedWith(error)
        })

        it('should throw when refresh fails', () => {
          const error = new Error('could not refresh token')
          refresh.onFirstCall().rejects(error)
          got.onFirstCall().rejects(new HTTPError({ statusCode: 401 }, { host: 'example.com' }))

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
      const body = await session('things')

      body.should.be.an('array')
      body.should.eql(body)
    })

    it('should add total count property to array', async () => {
      const body = await session('things')

      body.count.should.equal(length)
    })

    it('should parse link header', async () => {
      const body = await session('things')

      expect(body.link).to.be.an('object')
    })
  })

  describe('creating with custom baseUrl', () => {
    let baseUrl = 'https://example.com'

    describe('when calling session', () => {

      it('should prepend custom baseUrl', async () => {
        const resource = 'things'
        uutstub = await getuut({ baseUrl })

        await uutstub.session(resource)

        uutstub.got.should.have.been.calledWith(`${baseUrl}/${resource}`)
      })

      it('should prepend custom baseUrl', async () => {
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
