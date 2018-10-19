'use strict';

var _opener = require('opener');

var _opener2 = _interopRequireDefault(_opener);

var _pdkClient = require('pdk-client');

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const debug = (0, _debug2.default)('pdk:event-stream');

(async function () {
  // Authenticate and create a session
  const authsession = await (0, _pdkClient.makeSession)({
    client_id: process.env.PDK_CLIENT_ID,
    client_secret: process.env.PDK_CLIENT_SECRET,
    opener: _opener2.default,
    scope: 'openid offline_access'
  });

  // Get the panel
  const panel = await authsession('panels/10702GA');
  debug(`Got panel ${JSON.stringify(panel)}`);

  // Create an authentication session to the panel's API
  const panelsession = await (0, _pdkClient.makePanelSession)(authsession, panel);

  debug(`Creating event stream connection`);
  const stream = panelsession.createEventStream();

  // Subscribe to the connect/disconnect event
  stream.on('liveEvent', d => debug(`liveEvent: ${JSON.stringify(d)}`));
})();