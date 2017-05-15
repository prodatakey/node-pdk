/**
 * Created by dmitry.redkovolosov on 12.05.2017.
 */

import {makePanelSession} from '../panelApi';
import util from 'util';


process.on('unhandledRejection', r => console.log(r));
(async function () {
  let panelSession = await makePanelSession(process.env.PDK_CLIENT_ID,
    process.env.PDK_CLIENT_SECRET, '10702QI', 'http://localhost:9090');

  let people = await panelSession('persons');

  try {
    let createPerson = await panelSession('persons', {
      body: {
        firstName: 'ewwsdewe',
        lastName: 'Bar'
      }
    });

    console.log(util.inspect(createPerson));

  } catch (err) {
    if (err && err.response && err.response.body && err.response.body.message) {
      console.log(err.response.body.message);
    }
    console.log(util.inspect(err));
  }
}());
