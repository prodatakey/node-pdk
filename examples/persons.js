'use strict';

var _session = require('../session');

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

process.on('unhandledRejection', r => console.log(r));

_asyncToGenerator(function* () {
  let authSession = yield (0, _session.makeAuthSession)({
    client_id: process.env.PDK_CLIENT_ID,
    client_secret: process.env.PDK_CLIENT_SECRET,
    issuer: 'https://testaccounts.pdk.io'
  });

  let panelSession = yield (0, _session.makePanelSession)(authSession, process.env.PDK_PANEL_ID);

  let people = yield panelSession('persons');
  console.log(_util2.default.inspect(people));

  try {
    let createPerson = yield panelSession('persons', {
      body: {
        firstName: 'Foo',
        lastName: 'Bar'
      }
    });

    console.log(_util2.default.inspect(createPerson));
  } catch (err) {
    if (err && err.response && err.response.body && err.response.body.message) {
      console.log(err.response.body.message);
    }
    console.log(_util2.default.inspect(err));
  }
})();