'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

let getOu = exports.getOu = (() => {
  var _ref = _asyncToGenerator(function* (session, id = 'mine') {
    return yield session(`ous/${id}`);
  });

  return function getOu(_x) {
    return _ref.apply(this, arguments);
  };
})();

let getPanelToken = exports.getPanelToken = (() => {
  var _ref2 = _asyncToGenerator(function* (session, id) {
    // This must conform to the token_set identity
    // see its use in session.js

    // Returns an async function that when called will analyze its current credentials and
    // optimistically update them as needed.
    // Must return an object like or throw `{ id_token: /*bearer token for api calls*/ }`
    // The function must also also have a `refresh()` member function that runs the refresh logic on command
    // often in response to an authentication failure.
    //

    let id_token;
    const token_set = (() => {
      var _ref3 = _asyncToGenerator(function* () {
        // If we don't have a token, lets get one
        if (!id_token) {
          yield token_set.refresh();
        }

        // TODO: Check the expiration of the token and update before it expires

        return {
          id_token
        };
      });

      return function token_set() {
        return _ref3.apply(this, arguments);
      };
    })();

    token_set.refresh = _asyncToGenerator(function* () {
      id_token = (yield session(`panels/${id}/token`, { method: 'POST' })).token;
    });

    return token_set;
  });

  return function getPanelToken(_x2, _x3) {
    return _ref2.apply(this, arguments);
  };
})();

let getPanel = exports.getPanel = (() => {
  var _ref5 = _asyncToGenerator(function* (session, id) {
    return yield session(`panels/${id}`);
  });

  return function getPanel(_x4, _x5) {
    return _ref5.apply(this, arguments);
  };
})();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = {
  getOu,
  getPanelToken,
  getPanel
};