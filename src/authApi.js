const body = resp => resp.body;

export async function getOu(session, id = 'mine') {
  return body(await session(`ous/${id}`));
}

export async function getPanelToken(authsession, id) {
  return body(await authsession(
    `panels/${id}/token`,
    { method: 'POST' }
  )).token;
}

export default {
  getOu,
}
