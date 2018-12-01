'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makePanelSession = makePanelSession;

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _session = require('./session');

var _authApi = require('./authApi');

var _socket = require('socket.io-client');

var _socket2 = _interopRequireDefault(_socket);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const debug = (0, _debug2.default)('pdk:panelapi');

async function makePanelSession(authSession, { id, uri }) {
  debug('Creating panel session');

  // Set up a panel session
  const token = await (0, _authApi.getPanelToken)(authSession, id);
  const session = await (0, _session.makeSession)(token, _url2.default.resolve(uri, 'api/'));
  // Cache the id_token so the non-async reconnect_attempt handler can get to it
  let id_token = (await token()).id_token;

  session.createEventStream = function () {
    // Add the auth token to the socket.io connection URL querystring
    const socket = (0, _socket2.default)(uri, { query: { token: id_token } });

    // Update the token for reconnect attempts
    socket.on('reconnect_attempt', () => {
      socket.io.opts.query = {
        token: id_token
      };
    });

    // In order to squelch multiple events while refreshing,
    // the invalidToken handler fires once and must be resubscribed after successful handling.
    // TODO: Set a timer to do this prospectively _before_ the token expires
    // Watch for an `invalidToken` message and respond with a `renewedToken` message
    const invalidHandler = async () => {
      debug(`Got invalid panel token message from stream`);

      try {
        // Force a token refresh
        await token.refresh();
        const { id_token } = await token();
        socket.emit('renewedToken', { token: id_token });

        // Reconnect the invalidToken message on the websocket
        socket.once('invalidToken', invalidHandler);
      } catch (err) {
        debug(`Error refreshing stream token: ${err.message}`);
      }
    };
    socket.once('invalidToken', invalidHandler);

    return socket;
  };

  return session;
}

exports.default = { makePanelSession };