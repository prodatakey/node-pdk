global.chai = require('chai');

global.chai
  .use(require('chai-as-promised'))
  .use(require('dirty-chai'))
  .use(require('sinon-chai'));

require('chai/register-expect');
require('chai/register-should');

global.sinon = require('sinon');
global.proxyquire = require('proxyquire');
