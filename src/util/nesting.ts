import { Conditions, Condition } from '../conditions'
import { buildHighlightRequest } from './highlighting'
import { sourceFieldsRequestPayload } from './source-fields'
import { Search } from '../search'

export function buildNestedQueryPayloads(conditionsClass: Conditions) {
  const search           = (conditionsClass as any).search as Search
  const nestedConditions = (conditionsClass as any).nestedConditions()
  const payloads         = [] as any[]

  nestedConditions.forEach((nestedCondition: any) => {
    const nestedQuery = nestedCondition.buildQuery()
    const hasPagination = !!nestedCondition.page
    const hasSort = nestedCondition.sort.length > 0
    const hasNestedQuery = Object.keys(nestedQuery).length > 0
    if (hasPagination || hasSort || hasNestedQuery) {
      let inner_hits = {} as any
      const nested = {
        path: nestedCondition.klass.nested,
        ignore_unmapped: true,
        score_mode: nestedCondition._scoreMode,
      } as any

      if (hasNestedQuery) {
        nested.query = nestedQuery.bool.filter
      } else {
        nested.query = { match_all: {} }
      }

      if (hasPagination) {
        if (nestedCondition.page.size) {
          inner_hits.size = nestedCondition.page.size
        }
        if (nestedCondition.page.number) {
          inner_hits.from = (nestedCondition.page.number - 1) * nestedCondition.page.size
        }
      }

      if (hasSort) {
        inner_hits.sort = nestedCondition.sort.map((s: any) => {
          return { [`${nestedCondition.klass.nested}.${s.att}`]: s.dir }
        })
      }

      const highlight = buildHighlightRequest(search, nestedCondition.klass.nested)
      if (highlight) {
        inner_hits.highlight = highlight
      }

      const sourceFieldsPayload = sourceFieldsRequestPayload(search, true)
      if (sourceFieldsPayload) {
        inner_hits._source = sourceFieldsPayload
      }

      if (Object.keys(inner_hits).length > 0) {
        nested.inner_hits = inner_hits
      }

      payloads.push(nested)
    }
  })
  return payloads
}