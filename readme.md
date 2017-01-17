# PDK Javascript Client

This is the Javascript client for interacting with the PDK [auth](http://docs.pdkauthapi.apiary.io/) and [panel](http://docs.pdkapi.apiary.io/) APIs.

This may be helpful as a guide even if you don't use Javascript.
The APIs use a REST style HTTP JSON interface that is simple to use from nearly any lanugage with an intelligent HTTP library.

## Layout

The `src/` directory contains the client library. In `src/examples/` find examples for using the API for various tasks.

## Usage

### Async Operations

If you're not using a transpiler for `async`/`await` then just use the `Promise` that is returned by async functions. 

```javascript
import pdk from 'pdk';
pdk.authenticate(client_id, client_secret).then(tokenset => {
  // use tokenset here
});
```

vs

```javascript
import { authenticate } from 'pdk';
const tokenset = await authenticate(client_id, client_secret);
```

### Flow

Once calling `authenticate` to get an authentication context, use `makesession` to create a session with the API.

```javascript
import { makesession } from 'pdk';
const session = await makesession(tokenset.token_id);
```

This `session` function is a thin facade around [got](https://github.com/sindresorhus/got) that allows easily making authenticated requests, options are passed on to got.

```javascript
// `mine` is the ID for the authenticated user's default organization
let response = await session('ous/mine');
```

The `response` is a Javascript object representing the response body documented in the API docs.

### Functions

<pre>
const tokenset = function *authenticate* (
  // This launches a user's browser and retrieves an authentication token
  _clientId_: The oAuth client id issued for use,
  _clientSecret_: The oAuth client secret issued,
  _issuer_ (optional): The OpenID Connect provider to auth against,
);

const session = functionn *makesession* (
  // This creates a session that allows making requests to the API endpoints
  _tokenId_: The `token_id` from the tokenset retrieved from `authenticate`,
};
</pre>


## Developers

If you just want to use the client without messing with the guts, just add this module as an npm dependency and `import pdk from 'pdk';` (or `const pdk = require('pdk');` if you must.

This project uses babel to translate a couple features that haven't hitten Javascript yet, mainly `async`/`await`.
The if changes are made to `src/` then `npm run build` needs to be run to create the output in `lib/` that can be run by node.
