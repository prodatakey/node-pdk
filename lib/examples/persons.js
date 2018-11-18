'use strict';

var _pdkClient = require('pdk-client');

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

process.on('unhandledRejection', r => console.log(r));

(async function () {
  const authSession = await (0, _pdkClient.makeSession)({
    client_id: process.env.PDK_CLIENT_ID,
    client_secret: process.env.PDK_CLIENT_SECRET,
    issuer: 'https://testaccounts.pdk.io'
  });

  let panelSession = await (0, _pdkClient.makePanelSession)(authSession, process.env.PDK_PANEL_ID);

  let people = await panelSession('persons');
  console.log(_util2.default.inspect(people));

  try {
    let createPerson = await panelSession('persons', {
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