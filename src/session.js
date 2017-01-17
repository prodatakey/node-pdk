import got from 'got';
import url from 'url';

export default function makesession(id_token, baseUrl = 'https://accounts.pdk.io/api/') {
  const options = {
    json: true,
    headers: {
      authorization: `Bearer ${id_token}`,
    }
  };

  return async (callurl, callopts = {}) => (
    (await got(url.resolve(baseUrl, callurl), { ...options, ...callopts })).body
  );
}
