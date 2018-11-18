# PDK Javascript Client

This is the Javascript client for interacting with the PDK [auth](http://docs.pdkauthapi.apiary.io/) and [panel](http://docs.pdkapi.apiary.io/) APIs.

This may be helpful as a guide even if you don't use Javascript.
The APIs use a REST style HTTP JSON interface that is simple to use from nearly any language with an intelligent HTTP library.

**NB**: This client is still in beta and the interface may change in the future. Once 1.0 is pushed we will begin supporting a stable semver API.

## Requirements

The client build targets node >= 8 in order to support async/await functionality.

There are plans to create a browser compatible build of the client.
In this case the Promise async interface would be used unless the host application is being transpiled.

## Layout

The `src/` directory contains the client library implementation before transpiling. In `src/examples/` are examples for using the API for various tasks.

## Usage

### Async Operations

Most of the operations with this client involve network or disk operations.
Async operations are handled by promises which facilitate use of features like the `await` keyword.

```javascript
import { makeSession, userauth } from '@pdk/client'

try {
  const session = await makeSession(userauth({ client_id, client_secret }))
  const panel = await session('panels/10702AG')
  console.log(panel)
} catch(err) {
  console.log(err)
}
```

Using the promises directly is also supported (with naket require thrown in for good measure):

```javascript
const { makeSession, userauth } = require('@pdk/client')

makeSession(userauth({ client_id, client_secret }))
  .then(session => session('panels/10702AG'))
  .then(panel => {
    console.log(panel)
  })
  .catch(err => console.log(err))
```

### Creating a session with the Auth API

An authenticated session can be easily created against the authentication API by using the `makeSession` function.
The `makeSession` function requires a configured authentication strategy. The two available strategies are currently `userauth` and `clientauth`.

The `userauth` strategy uses the system browser to authenticate the user and delegate access to the API consumer.

The `clientauth` strategy directly authenticates the openid connect client and accesses the API as its proxy user.

This session will automatically manage the authentication token lifetime, using a refresh token if available.

See the auth API documentation for operations and data types available.

```javascript
import { makeSession, userauth } from '@pdk/client';

try {
  const session = await makeSession(userauth({ client_id, client_secret }));
} catch(err) {
  console.log(`Error authenticating: ${err.msg}`);
}
```

The session function as a thin facade around [got](https://github.com/sindresorhus/got) that allows easily making authenticated requests, options are passed on to got.

Return value is a Javascript object representing the response body documented in the API docs.
The promise will be rejected (await calls will throw) if there is an error with the request.

```javascript
// `mine` is the ID for the authenticated user's default organization
const response = await session('ous/mine');
```


### Creating a session with a panel API

Once an authenticated session is established with the auth API, it can be used to create an authenticated session to a specific panel.  
This session will automatically manage the panel authentication token lifetime. This session is also a facade over the got library.

See the panel API documentation for operations and data types available.

**Note**: The term *panel* in the documentation is synonymous with the PDK cloud node hardware.

```javascript
import { makeSession, makePanelSession, userauth } from '@pdk/client';

// Authenticate and create a session with the auth API
const session = await makeSession(userauth({ client_id, client_secret }));

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

Applications that support the client credentials authentication flow can use the `clientauth` strategy, in a similar way to the `userauth` method.

```javascript
import { makeSession, clientauth } from '@pdk/client';

// Authenticate and create a session with the auth API using client credentials
const session = await makeSession(clientauth({ client_id, client_secret }));
```


## Developers

If you want to use the client without messing with the guts, just add this module as an npm dependency (`npm install --save @pdk/client`) and `import pdk from '@pdk/client';` (or `const pdk = require('@pdk/client');` if you're not using ES6 modules).

This project uses babel to translate a couple features that haven't hitten node yet, ES6 modules.
If changes are made to `src/` then `npm run build` needs to be run to create the output in `lib/` that can be run by node.
