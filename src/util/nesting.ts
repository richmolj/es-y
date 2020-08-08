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
    if (Object.keys(nestedQuery).length > 0) {
      const nested = {
        path: nestedCondition.klass.nested,
        query: nestedQuery.bool.filter,
        ignore_unmapped: true,
      } as any

      const highlight = buildHighlightRequest(search, nestedCondition.klass.nested)
      if (highlight) {
        nested.inner_hits = { highlight }
      }

      const sourceFieldsPayload = sourceFieldsRequestPayload(search, true)
      if (sourceFieldsPayload) {
        if (!nested.inner_hits) nested.inner_hits = {}
        nested.inner_hits._source = sourceFieldsPayload
      }

      payloads.push(nested)
    }
  })
  return payloads
}