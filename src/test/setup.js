import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import dirtyChai from 'dirty-chai'
import sinonChai from 'sinon-chai'
import sinon from 'sinon'

import 'chai/register-expect.js'
import 'chai/register-should.js'

chai
  .use(chaiAsPromised)
  .use(dirtyChai)
  .use(sinonChai)

global.sinon = sinon
