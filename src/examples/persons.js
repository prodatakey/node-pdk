/**
 * Created by dmitry.redkovolosov on 12.05.2017.
 */

import {makePanelSession, makeAuthSession} from '../session';
import util from 'util';


process.on('unhandledRejection', r => console.log(r));
(async function () {
  let authSession = await makeAuthSession(process.env.PDK_CLIENT_ID, process.env.PDK_CLIENT_SECRET, null,
    'https://testaccounts.pdk.io');

  let panelSession = await makePanelSession(authSession, process.env.PDK_PANEL_ID);

  let people = await panelSession('persons');
  console.log(util.inspect(people));

  try {
    let createPerson = await panelSession('persons', {
      body: {
        firstName: 'Foo',
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
