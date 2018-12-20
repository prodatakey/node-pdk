import proxyquire from 'proxyquire'

describe('client auth', () => {
  let clientauth, oidlib, oidissuer, oidclient, oidctoken
  beforeEach(() => {
    oidctoken = { id_token: '1234' }

    oidclient = {
      grant: sinon.stub().resolves(oidctoken)
    }

    oidissuer = {
      Client: sinon.stub().returns(oidclient)
    }

    oidlib = {
      Issuer: { discover: sinon.stub().resolves(oidissuer) }
    }

    const module = proxyquire('./client', {
      'openid-client': oidlib
    })

    clientauth = module.clientauth({ client_id: 'weee', client_secret: 'orly?' })
  })

  describe('with token', () => {
    let tokenset
    beforeEach(async () => {
      tokenset = await clientauth()
    })

    it('should discover issuer', () => {
      oidlib.Issuer.discover.should.have.been.calledOnce()
    })

    it('should create client from issuer', () => {
      oidissuer.Client.should.have.been.calledOnce()
    })

    describe('when refreshing token', () => {
      it('should wait for outstanding refresh', async () => {
        let resolve
        const refreshpromise = new Promise(res => resolve = res)
        oidclient.grant.reset() // clear history and behavior of grant
        oidclient.grant.returns(refreshpromise)

        const outstanding1 = tokenset.refresh()
        const outstanding2 = tokenset.refresh()

        resolve(oidctoken)

        await outstanding1.should.be.fulfilled()
        await outstanding2.should.be.fulfilled()
        oidclient.grant.should.have.been.calledOnce()
      })
    })
  })

})
