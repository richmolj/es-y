import { Scripting } from './../scripting';
import { Search } from '../search'
import { buildAggRequest } from "../aggregations"
import { buildHighlightRequest } from './build-highlight-request'
import { applyScriptQuery, applyScriptScore } from "../scripting"

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

  if ((search as any)._highlights) {
    searchPayload.body.highlight = buildHighlightRequest(search)
  }

  assignSortAndPage(search, searchPayload)

  await buildAggRequest(search, searchPayload)

  const scriptQuery = (search as any)._scriptQuery
  if (scriptQuery) {
    applyScriptQuery(searchPayload, scriptQuery)
  }
  const scriptScore = (search as any)._scriptScore
  if (scriptScore) {
    applyScriptScore(searchPayload, scriptScore)
  }

  // bgc1922_TODO track_total_hits
  searchPayload.track_total_hits = true
  return searchPayload
}

export function assignSortAndPage(search: Search, payload: any) {
  payload.body.size = search.page.size
  payload.body.from = search.page.size * (search.page.number - 1)
  payload.body.sort = search.sort.map((s) => {
    return { [s.att]: s.dir}
  })
  return payload
}