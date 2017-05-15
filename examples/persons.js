'use strict';

var _panelApi = require('../panelApi');

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Created by dmitry.redkovolosov on 12.05.2017.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */

process.on('unhandledRejection', r => console.log(r));
_asyncToGenerator(function* () {
  let panelSession = yield (0, _panelApi.makePanelSession)(process.env.PDK_CLIENT_ID, process.env.PDK_CLIENT_SECRET, '10702QI', 'http://localhost:9090');

  let people = yield panelSession('persons');

  try {
    let createPerson = yield panelSession('persons', {
      body: {
        firstName: 'ewwsdewe',
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