import { makePanelSession, makeSession, userauth } from '../index.js';
import util from 'util';
import Debug from 'debug'

const debug = Debug('example:person');

(async function () {
  const authsession = await makeSession(userauth({
    client_id: process.env.PDK_CLIENT_ID,
    client_secret: process.env.PDK_CLIENT_SECRET,
  }));

  // Get the panel then create an auth session to it
  const panel = await authsession('panels/10702GA')
  let panelsession = await makePanelSession(authsession, panel);

  let people = await panelsession('persons');
  debug(util.inspect(people));

  try {
    let person = await panelsession('persons', {
      body: {
        firstName: 'Foo',
        lastName: 'Bar'
      }
    });

    debug(util.inspect(person));

  } catch (err) {
    if (err && err.response && err.response.body && err.response.body.message) {
      debug(err.response.body.message);
    }
    debug(util.inspect(err));
  }
}());
