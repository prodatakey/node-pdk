# PDK Javascript Client

This is the Javascript client for interacting with the PDK [auth](http://docs.pdkauthapi.apiary.io/) and [panel](http://docs.pdkapi.apiary.io/) APIs.

This may be helpful as a guide even if you don't use Javascript.
The APIs use a REST style HTTP JSON interface that is simple to use from nearly any lanugage with an intelligent HTTP library.

**NB**: This client is still in beta and the interface may change in the future. Once 1.0 is pushed we will begin supporting a stable semver API.

## Requirements

The client build targets node >= 8 in order to support async/await functionality.

There are plans to create a browser compatible build of the client.
In this case the Promise async interface would be used unless the host application is being transpiled.

## Layout

The `src/` directory contains the client library. In `src/examples/` find examples for using the API for various tasks.

## Usage

### Async Operations

Most of the operations with this client involve network or disk operations.
Async operations are simply handled by using the javacript `await` keyword.

```javascript
import { authenticate } from 'pdk';
const tokenset = await authenticate(client_id, client_secret);
```

### Creating a session with the Auth API

Once calling `authenticate` to get an authentication context, use `makesession` to create a session with the auth API.
This session will automatically manage the authentication token lifetime, using a refresh token if available, otherwise it runs the browser authentication flow again.

See the auth API documentation for operations and data types available here.

```javascript
import { authenticate, makeSession } from 'pdk';

try {
  const session = await makeSession(await authenticate(client_id, client_secret));
} catch(err) {
  console.log(`Error authenticating: ${err.msg}`);
}
```

This `session` function is a thin facade around [got](https://github.com/sindresorhus/got) that allows easily making authenticated requests, options are passed on to got.

```javascript
// `mine` is the ID for the authenticated user's default organization
let response = await session('ous/mine');
```

The `response` is a Javascript object representing the response body documented in the API docs.

### Creating a session with a panel API

Once an authenticated session is established with the auth API, it can be used to create an authenticated session to a specific panel.  
This session will automatically manage the panel authentication token lifetime.

See the panel API documentation for operations and data types available here.

**Note**: The term *panel* in the documentation is synonymous with the PDK cloud node hardware.

```javascript
import { authenticate, makeSession, makePanelSession } from 'pdk';

// Authenticate and create a session with the auth API
const session = await makeSession(await authenticate(client_id, client_secret));

// Get a panel document from the auth API
const panel = await session('panels/1070BBB');

// Create an authenticated session with the panel
const panelsession = await makePanelSession(session, panel);

// Retrieve an entity from the panel API
const me = await panelsession('people/123');
```

### Connecting to the event stream of the panel API

The panel API supports a real-time socket.io event and command stream.
This stream allows the reception of events from the system (credential scans, door open/close, etc), and injection of commands (door open/close, enable DND, etc) into the system.

See the Stream Oriented API section of the panel API documentation for information on available events and commands.

```javascript
import { randomBytes } from 'crypto';

const stream = panelsession.createEventStream();

// Print events to the console as they come in
stream.on('liveEvent', event => console.log(`Event: ${JSON.stringify(event)}`));

// Send a door open/close command to door #6
const id = randomBytes(64).toString('hex'); // Random msg ID
stream.emit('command', {
  topic: 'door.try.open',
  body: { doorId: 6 },
  id
});
```

### Client Authentication

Applications that support the client credentials authentication flow can use the `authenticateclient`, in the same way as the `authenticate` method.

```javascript
import { authenticateclient, makesession } from 'pdk';

// Authenticate and create a session with the auth API
const session = await makesession(await authenticateclient(client_id, client_secret));
```

### Functions

const tokenset = function *authenticate* (
  // This launches a user's browser and retrieves an authentication token
  _clientId_: The oAuth client id issued for use,
  _clientSecret_: The oAuth client secret issued,
  _issuer_ (optional): The OpenID Connect provider to auth against,
);

const session = function *makesession* (
  // This creates a session that allows making requests to the API endpoints
  _tokenSet_: The `token_id` from the tokenset retrieved from `authenticate`,
};


## Developers

If you want to use the client without messing with the guts, just add this module as an npm dependency and `import pdk from 'pdk';` (or `const pdk = require('pdk');` if you're not using ES6 modules).

This project uses babel to translate a couple features that haven't hitten node yet, mainly `async`/`await` and ES6 modules.
If changes are made to `src/` then `npm run build` needs to be run to create the output in `lib/` that can be run by node.
