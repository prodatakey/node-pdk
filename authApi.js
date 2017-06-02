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
    return (yield session(`panels/${id}/token`, { method: 'POST' })).token;
  });

  return function getPanelToken(_x2, _x3) {
    return _ref2.apply(this, arguments);
  };
})();

let getPanel = exports.getPanel = (() => {
  var _ref3 = _asyncToGenerator(function* (session, id) {
    return yield session(`panels/${id}`);
  });

  return function getPanel(_x4, _x5) {
    return _ref3.apply(this, arguments);
  };
})();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

exports.default = {
  getOu,
  getPanelToken,
  getPanel
};