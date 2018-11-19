import proxyquire from 'proxyquire'

const getuut = async ({
  body,
  got,
  auth,
  id_token,
  baseUrl,
} = {}) => {
  id_token = id_token || 'blah'
  body = body || {}
  got = got || sinon.stub().resolves(() => ({ body }))
  auth = auth || sinon.stub().resolves(() => ({ id_token }))

  const { makeSession } = proxyquire('./session', {
    got
  })

  return {
    session: await makeSession(auth, baseUrl),
    got,
    auth,
    id_token,
    body
  }
}

describe('session', () => {
  let uutstub

  describe('creating with auth strategy', () => {
    beforeEach(async () => {
      uutstub = await getuut()
    })

    it('it should call the auth strategy', () => {
      uutstub.auth.should.have.been.called()
    })

    describe('when calling session', () => {

      it('should prepend default baseUrl', async () => {
        const resource = 'things'
        await uutstub.session(resource)

        uutstub.got.should.have.been.calledWith(sinon.match(/^https:\/\/accounts\.pdk\.io/))
      })

      it('should return response body', async () => {
        const resource = 'things'
        const body = await uutstub.session(resource)

        expect(body).to.eql(uutstub.body)
      })

      it('should use no call options by default', async () => {
        const resource = 'things'
        await uutstub.session(resource)
        await uutstub.session(resource, {})

        uutstub.got.firstCall.args[1].should.eql(uutstub.got.secondCall.args[1])
      })

      it('should pass call options through to got', async () => {
        const resource = 'things'
        const options = { myopt: true }
        await uutstub.session(resource, options)

        uutstub.got.should.have.been.calledWith(sinon.match.string, sinon.match(options))
      })

      it('should set json call option', async () => {
        const resource = 'things'
        await uutstub.session(resource)

        uutstub.got.should.have.been.calledWith(sinon.match.string, sinon.match({ json: true }))
      })

      it('should set authorization header to Bearer token', async () => {
        const resource = 'things'
        await uutstub.session(resource)

        uutstub.got.should.have.been.calledWith(sinon.match.string, sinon.match({ headers: { authorization: `Bearer ${uutstub.id_token}` } }))
      })

    })
  })

  describe('creating with custom baseUrl', () => {
    const baseUrl = 'https://example.com'
    beforeEach(async () => {
      uutstub = await getuut({ baseUrl })
    })

    describe('when calling session', () => {

      it('should prepend custom baseUrl', async () => {
        const resource = 'things'
        await uutstub.session(resource)

        uutstub.got.should.have.been.calledWith(`${baseUrl}/${resource}`)
      })

    })
  })

  describe('creating with throwing auth strategy', () => {
    const error = new Error('blah')

    it('it should rethrow strategy error', () => {
      return getuut({ auth:  sinon.stub().rejects(error) })
        .should.be.rejectedWith(error)
    })
  })

  describe('creating with invalid auth strategy', () => {
    it('should throw an error', () => {
      return getuut({ auth: 'blah' })
        .should.be.rejected()
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
