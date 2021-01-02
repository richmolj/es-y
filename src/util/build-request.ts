import { Scripting } from './../scripting';
import { Search } from '../search'
import { buildAggRequest } from "../aggregations"
import { buildHighlightRequest } from './highlighting'
import { applyScriptQuery, applyScriptScore } from "../scripting"
import { sourceFieldsRequestPayload } from "./source-fields"

export async function buildRequest(search: Search) {
  const searchPayload = { index: search.klass.index, body: {} } as any
  searchPayload.body.query = { bool: { must: [], should: [], must_not: [], filter: {}} }

  const promises = [(search.filters as any).buildQuery(), (search.queries as any).buildQuery()]
  const [filters, queries] = await Promise.all(promises)
  const numFilters = Object.keys(filters).length
  const numQueries = Object.keys(queries).length

  if (numFilters > 0) {
    searchPayload.body.query.bool.filter = filters.bool.filter
  } else {
    delete searchPayload.body.query.bool.filter
  }

  if (numQueries > 0) {
    const must = queries.bool.query.bool.must || []
    searchPayload.body.query.bool.must = [{
      bool: { should: must.concat(queries.bool.query.bool.should || []) }
    }]
    // searchPayload.body.query.bool.should = queries.bool.query.bool.should
    searchPayload.body.query.bool.must_not = queries.bool.query.bool.must_not
  } else {
    delete searchPayload.body.query.bool.must
    delete searchPayload.body.query.bool.should
    delete searchPayload.body.query.bool.must_not
  }

  if (numQueries + numFilters === 0) {
    delete searchPayload.body.query
  }

  const highlightPayload = buildHighlightRequest(search)
  if (highlightPayload) {
    searchPayload.body.highlight = highlightPayload
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

  const sourceFieldsPayload = sourceFieldsRequestPayload(search)
  if (sourceFieldsPayload) {
    searchPayload.body._source = sourceFieldsPayload
  }

  // bgc1922_TODO track_total_hits
  searchPayload.track_total_hits = true
  return searchPayload
}

export function assignSortAndPage(search: Search, payload: any) {
  payload.body.size = search.page.size
  payload.body.from = search.page.size * (search.page.number - 1)
  payload.body.sort = search.sort.map((s) => {
    let sortPayload = { [s.att]: { order: s.dir } } as any
    if (s.unmappedType) {
      sortPayload[s.att].unmapped_type = s.unmappedType
    }
    return sortPayload
  })
  return payload
}