'use strict';

var _ = require('../');

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const debug = (0, _debug2.default)('example:person');

(async function () {
  const authsession = await (0, _.makeSession)((0, _.userauth)({
    client_id: process.env.PDK_CLIENT_ID,
    client_secret: process.env.PDK_CLIENT_SECRET
  }));

  // Get the panel then create an auth session to it
  const panel = await authsession('panels/10702GA');
  let panelsession = await (0, _.makePanelSession)(authsession, panel);

  let people = await panelsession('persons');
  debug(_util2.default.inspect(people));

  try {
    let person = await panelsession('persons', {
      body: {
        firstName: 'Foo',
        lastName: 'Bar'
      }
    });

    debug(_util2.default.inspect(person));
  } catch (err) {
    if (err && err.response && err.response.body && err.response.body.message) {
      debug(err.response.body.message);
    }
    debug(_util2.default.inspect(err));
  }
})();