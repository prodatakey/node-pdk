'use strict';

var _fs = require('fs');

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _opener = require('opener');

var _opener2 = _interopRequireDefault(_opener);

var _authenticator = require('../authenticator');

var _session = require('../session');

var _authApi = require('../authApi');

var _fp = require('lodash/fp');

var _fp2 = _interopRequireDefault(_fp);

var _asyncp = require('asyncp');

var _asyncp2 = _interopRequireDefault(_asyncp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

process.on('unhandledRejection', r => console.log(r));

_asyncToGenerator(function* () {
  let tokenset = yield (0, _authenticator.authenticate)({
    client_id: process.env.PDK_CLIENT_ID,
    client_secret: process.env.PDK_CLIENT_SECRET,
    opener: _opener2.default
  });
  let authsession = (0, _session.makeSession)(tokenset);

  // Connect to the panel and itemize asset info
  // Panel => InventoriedPanel
  const inventoryPanel = _fp2.default.curry((() => {
    var _ref2 = _asyncToGenerator(function* (authsession, { id, name, uri }) {
      // Create an authentication session to the panel's API
      const panelsession = (0, _session.makeSession)((yield (0, _authApi.getPanelToken)(authsession, id)), _url2.default.resolve(uri, 'api/'));

      // Get the list of configured devices
      let connected = false;
      let devices = [];
      try {
        devices = yield panelsession('devices');
        connected = true;
      } catch (err) {
        //console.log('Unable to negotiate session with panel', err);
      }

      console.log(`${id}: online ${connected} devices ${devices.length}`);

      // Return what we found of the panel inventory
      return {
        id,
        name,
        connected,
        deviceCount: devices.length,
        devices
      };
    });

    return function (_x, _x2) {
      return _ref2.apply(this, arguments);
    };
  })());

  // Recursively processes asset info for every panel in an OU and its children OUs
  // OU => InventoriedOU
  const inventoryOu = _fp2.default.curry((() => {
    var _ref3 = _asyncToGenerator(function* (authsession, ouId) {
      let ou;
      try {
        ou = yield (0, _authApi.getOu)(authsession, ouId);
      } catch (err) {
        if (err.statusCode === 401) {
          tokenset = yield (0, _authenticator.refreshTokenSet)(process.env.PDK_CLIENT_ID, process.env.PDK_CLIENT_SECRET, tokenset.refresh_token);
          authsession = (0, _session.makeSession)(tokenset.id_token);
          ou = yield (0, _authApi.getOu)(authsession, ouId);
        }
      }

      console.log(`${ou.name}: panels ${ou.panels.length} children ${ou.children.length}`);

      // Return the inventoried OU
      return {
        name: ou.name,
        owner: ou.owner,
        // Inventory each panel in the OU
        panels: yield _asyncp2.default.map(ou.panels, inventoryPanel(authsession)),
        // Recurse to inventory any children of this OU
        children: yield _asyncp2.default.map(ou.children, _fp2.default.compose(inventoryOu(authsession), function (ou) {
          return ou.id;
        }))
      };
    });

    return function (_x3, _x4) {
      return _ref3.apply(this, arguments);
    };
  })());

  // OU pseudo id 'mine' is the authenticated user's root organization
  const assets = yield inventoryOu(authsession, 'mine');

  // Write the inventory out to a file
  (0, _fs.writeFile)('./inventory.json', JSON.stringify(assets, null, 2), 'utf-8');
})();