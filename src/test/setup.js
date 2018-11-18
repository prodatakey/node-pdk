chai = require('chai');

chai
  .use(require('chai-as-promised'))
  .use(require('dirty-chai'))
  .use(require('sinon-chai'));

require('chai/register-expect');
require('chai/register-should');

sinon = require('sinon');
proxyquire = require('proxyquire');
