import got from 'got';
import url from 'url';

export default function makesession(id_token, baseUrl) {
  const options = {
    json: true,
    headers: {
      authorization: `Bearer ${id_token}`,
    }
  };

  return (callurl, callopts = {}) => (
    got(url.resolve(baseUrl, callurl), { ...options, ...callopts })
  );
}
