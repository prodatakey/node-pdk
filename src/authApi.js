export async function getOu(session, id = 'mine') {
  return await session(`ous/${id}`);
}

export async function getPanelToken(session, id) {
  return (await session(
    `panels/${id}/token`,
    { method: 'POST' }
  )).token;
}

export async function getPanel(session, id) {
  return await session(`panels/${id}`);
}
