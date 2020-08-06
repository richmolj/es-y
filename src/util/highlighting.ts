import { Search } from '../search'
import { MultiSearch } from '../multi-search'

export interface HighlightConfig {
  field: string
  name: string
  options: Record<string, any>
  source?: boolean | Record<'include' | 'exclude', string[]>
}

export function buildHighlightsFromInput(input: any, search: Search) {
  input.highlights.forEach((highlight: any) => {
    const name = highlight.name
    delete highlight.name
    search.highlight(name, highlight)
  })
}

export function buildHighlightRequest(search: Search, nested?: string) {
  let fields = {} as any
  getProperHighlightConfigs(search, nested).forEach((config: any) => {
    let options = { ...config.options }
    delete options.source
    fields[config.field] = { ...options }
  })
  if (Object.keys(fields).length > 0) {
    return { fields }
  } else {
    return false
  }
}

// When top-level, don't highlight nested
// When innerHits, highlight ONLY nested
export function getProperHighlightConfigs(search: Search, nested?: string) {
  const _search = search as any
  const allHighlightConfigs = getAllHighlightConfigs(_search)
  if (allHighlightConfigs.length === 0) return []
  let configs = [] as any[]

  if (nested) {
    allHighlightConfigs.forEach((config: any) => {
      if (config.field.includes('.')) {
        if (nested === config.field.split('.')[0]) {
          configs.push(config)
        }
      }
    })
  } else {
    allHighlightConfigs.forEach((config: any) => {
      if (!isNestedHighlight(search, config.field)) {
        configs.push(config)
      }
    })
  }
  return configs
}

function isNestedHighlight(search: Search | MultiSearch, field: string) {
  if (field.includes('.')) {
    let nestings = [] as string[]
    if (search.klass.isMultiSearch) {
      const _multi = search as MultiSearch
      _multi.searchInstances.forEach((searchInstance) => {
        const conditionsClass = searchInstance.filters as any
        conditionsClass.nestedConditions().forEach((nestedCondition: any) => {
          nestings.push(nestedCondition.klass.nested)
        })
      })
    } else {
      const conditionsClass = search.filters as any
      nestings = conditionsClass
        .nestedConditions()
        .map((c: any) => c.klass.nested)
    }
    return nestings.includes(field.split('.')[0])
  } else {
    return false
  }
}

function getAllHighlightConfigs(search: Search | MultiSearch) {
  const _search = search as any
  let highlightConfigs = (_search._highlights || []) as HighlightConfig[]
  if (search.klass.isMultiSearch) {
    const _multi = search as MultiSearch
    _multi.searchInstances.forEach((searchInstance: any) => {
      const configs = (searchInstance._highlights || []) as HighlightConfig[]
      highlightConfigs = highlightConfigs.concat(configs)
    })
  }
  return highlightConfigs
}

export function attachHighlightsToResults(search: Search, results: any[], rawResults: any[]) {
  const _search = search as any
  const highlightConfigs = getAllHighlightConfigs(search)
  if (highlightConfigs.length > 0) {
    results.forEach((r, index) => {
      const rawResult = rawResults[index]
      let highlights = {} as any
      highlightConfigs.forEach((config) => {
        if (isNestedHighlight(search, config.field)) {
          applyNestedHighlightToResult(search, r, rawResult, config.field)
        } else {
          if (rawResult.highlight && rawResult.highlight[config.field]) {
            highlights[config.name] = rawResult.highlight[config.field]
          }
        }
      })
      if (Object.keys(highlights).length > 0) {
        r._highlights = highlights
      }
    })
  }
  return results
}

function applyNestedHighlightToResult(search: Search, result: any, rawResult: any, field: string) {
  const split      = field.split('.')
  const nested     = split[0]//(search.filters as any)[split[0]].klass.nested
  const innerHits  = rawResult.inner_hits[nested].hits
  split.shift()
  let innerFieldName = split.join('.')
  innerHits.hits.forEach((hit: any, index: number) => {
    if (hit.highlight && hit.highlight[field]) {
      const sf = (search as any)._sourceFields
      if (sf && sf.onlyHighlights && sf.onlyHighlights.includes(nested)) {
      } else {
        let nestedResult
        if (Array.isArray(result[nested])) {
          nestedResult = result[nested][hit._nested.offset]
        } else {
          nestedResult = result[nested]
        }
        if (nestedResult) {
          if (!nestedResult._highlights) nestedResult._highlights = {} as any
          nestedResult._highlights[innerFieldName] = hit.highlight[field]
        }
      }
    }
  })
}