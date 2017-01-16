import { Issuer } from 'openid-client';
import opener from 'opener';
import { createServer } from 'http';

export default async function authenticate({ client_id, client_secret }) {
  const pdkIssuer = await Issuer.discover('https://accounts.pdk.io');

  const client = new pdkIssuer.Client({ client_id, client_secret });

  const authUrl = client.authorizationUrl({ redirect_uri: 'http://localhost:8433/authCallback', scope: 'openid' });

  // Resolve when response is delivered to the local http server
  //TODO: Handle a timeout case when a postback never happens
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      // Parse the auth parameters off of the request
      const params = client.callbackParams(req);

      //TODO: Send a "you may close this window" body and/or auto-close JS
      res.end();

      // Ignore requests with no code and no error
      if(!params.code && !params.error)
        return;

      // Got an auth response, shut the server down
      server.close();

      // Reject on error response
      if(params.error) {
        return reject(params.error_description || params.error);
      }

      // Backchannel the code for token exchange
      return client.authorizationCallback('http://localhost:8433/authCallback', params).then(token => {
        resolve(token);
      });
    });
    // Unref client sockets so keep-alive connections don't stall server close
    server.on('connection', socket => socket.unref());
    // TODO: Use random probed port assignment
    server.listen(8433, '127.0.0.1');

    opener(authUrl);
  });
}
