// Sugar for setting paging querystring values and communicating paging
// info back via the query reference parameter
export const page = async (session, resource, query, callopts = {}) => {
  // Make the call
  const resp = await session(resource, { query: { page: 0, sort: 'asc', per_page: 100, ...query }, ...callopts })

  // Set the next values into the paging context so the caller can call in a loop checking `more` on each iteration
  if(resp.link && resp.link.next) {
    query.page = resp.link.next.page
    query.per_page = resp.link.next.per_page
    query.more = true
  } else {
    query.more = false
  }

  return resp
}
