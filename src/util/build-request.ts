import { Search } from '../search'
import { buildAggRequest } from "../aggregations"

export async function buildRequest(search: Search) {
  const searchPayload = { index: search.klass.index, body: {} } as any
  searchPayload.body.query = { bool: { must: [], should: [], must_not: [], filter: {}} }

  const filters = (search.filters as any).buildQuery()
  const queries = (search.queries as any).buildQuery()
  const numFilters = Object.keys(filters).length
  const numQueries = Object.keys(queries).length

  if (numFilters > 0) {
    searchPayload.body.query.bool.filter = filters.bool.filter
  } else {
    delete searchPayload.body.query.bool.filter
  }

  if (numQueries > 0) {
    searchPayload.body.query.bool.must = queries.bool.query.bool.must
    searchPayload.body.query.bool.should = queries.bool.query.bool.should
    searchPayload.body.query.bool.must_not = queries.bool.query.bool.must_not
  } else {
    delete searchPayload.body.query.bool.must
    delete searchPayload.body.query.bool.should
    delete searchPayload.body.query.bool.must_not
  }

  if (numQueries + numFilters === 0) {
    delete searchPayload.body.query
  }

  searchPayload.body.size = search.page.size
  searchPayload.body.from = search.page.size * (search.page.number - 1)
  searchPayload.body.sort = search.sort.map((s) => {
    return { [s.att]: s.dir}
  })

  await buildAggRequest(search, searchPayload)
  return searchPayload
}