'use strict';

var _fs = require('fs');

var _util = require('util');

var _authenticator = require('../authenticator');

var _authenticator2 = _interopRequireDefault(_authenticator);

var _session = require('../session');

var _session2 = _interopRequireDefault(_session);

var _authApi = require('../authApi');

var _fp = require('lodash/fp');

var _fp2 = _interopRequireDefault(_fp);

var _asyncp = require('asyncp');

var _asyncp2 = _interopRequireDefault(_asyncp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

process.on('unhandledRejection', r => console.log(r));

const acompose = (fn, ...rest) => rest.length ? (() => {
  var _ref = _asyncToGenerator(function* (...args) {
    return fn((yield acompose(...rest)(...args)));
  });

  return function () {
    return _ref.apply(this, arguments);
  };
})() : fn;

_asyncToGenerator(function* () {
  let tokenset = yield (0, _authenticator2.default)({
    client_id: process.env.PDK_CLIENT_ID,
    client_secret: process.env.PDK_CLIENT_SECRET
  });
  const authsession = (0, _session2.default)(tokenset.id_token, 'https://accounts.pdk.io/api/');

  const getDevices = (() => {
    var _ref3 = _asyncToGenerator(function* (panelsession) {
      try {
        return (yield panelsession('devices')).body;
      } catch (err) {
        return [];
      }
    });

    return function getDevices(_x) {
      return _ref3.apply(this, arguments);
    };
  })();

  // Connect to the panel and itemize asset info
  // Panel => InventoriedPanel
  const inventoryPanel = _fp2.default.curry((() => {
    var _ref4 = _asyncToGenerator(function* (authsession, { id, name, uri }) {
      // Create an authentication session to the panel's API
      const panelsession = (0, _session2.default)((yield (0, _authApi.getPanelToken)(authsession, id)), `${ uri }api/`);

      // Test the CloudNode connectivity
      let connected = false;
      try {
        yield panelsession('config');
        connected = true;
      } catch (err) {
        console.log('Unable to negotiate session with panel', err);
      }

      // Get the list of configured devices
      const devices = yield getDevices(panelsession);

      return {
        id,
        name,
        connected,
        deviceCount: devices.length,
        devices
      };
    });

    return function (_x2, _x3) {
      return _ref4.apply(this, arguments);
    };
  })());

  // Processes asset info for every panel in an OU
  // OU => InventoriedOU
  const inventoryOu = _fp2.default.curry((() => {
    var _ref5 = _asyncToGenerator(function* (authsession, ouId) {
      const { name, owner, panels, children } = yield (0, _authApi.getOu)(authsession, ouId);
      return {
        name,
        owner,
        panels: yield _asyncp2.default.map(panels, inventoryPanel(authsession)),
        children: yield _asyncp2.default.map(children, _fp2.default.compose(inventoryOu(authsession), function (ou) {
          return ou.id;
        }))
      };
    });

    return function (_x4, _x5) {
      return _ref5.apply(this, arguments);
    };
  })());

  /*
  const myou = await getOu(authsession, 'mine');
  console.log(myou);
  */
  const assets = yield inventoryOu(authsession, 'mine');
  console.log((0, _util.inspect)(assets, { depth: null }));

  (0, _fs.writeFile)('./inventory.json', JSON.stringify(assets, null, 2), 'utf-8');
})();