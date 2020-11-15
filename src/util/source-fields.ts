import { Search } from '../search'

export function sourceFieldsRequestPayload(search: Search, innerHits: boolean = false) {
  const sourceFieldConfig = Object.assign({}, (search as any)._sourceFields)
  let sourceFieldsPayload = {} as any
  if (sourceFieldConfig) {
    const { onlyHighlights, ...sourceFields } = sourceFieldConfig
    // Exclude the onlyHighlight when top-level
    if (onlyHighlights && !innerHits) {
      if (!sourceFields.excludes) sourceFields.excludes = []
      sourceFields.excludes = sourceFields.excludes.concat(onlyHighlights)
    }

    if (Object.keys(sourceFields).length > 0) {
      sourceFieldsPayload = sourceFields
    }
  }

  // If nested conditions are paginated or sorted, exclude from source
  if (!search.klass.isMultiSearch && !innerHits) {
    const nestedFilters = (search.filters as any).nestedConditions()
    const nestedQueries = (search.queries as any).nestedConditions()
    let nestedConditionsWithPagination = nestedFilters.filter((c: any) => !!c.page)
    nestedConditionsWithPagination = nestedConditionsWithPagination.concat(nestedQueries.filter((c: any) => !!c.page))
    let nestedConditionsWithSort = nestedFilters.filter((c: any) => c.sort.length > 0)
    nestedConditionsWithSort = nestedConditionsWithPagination.concat(nestedQueries.filter((c: any) => c.sort.length > 0))
    if (nestedConditionsWithPagination) {
      nestedConditionsWithPagination.forEach((nested: any) => {
        const { excludes } = sourceFieldsPayload
        if (!excludes || !excludes.includes(nested.klass.nested)) {
          if (!sourceFieldsPayload.excludes) sourceFieldsPayload.excludes = []
          sourceFieldsPayload.excludes.push(nested.klass.nested)
        }
      })
    }
    if (nestedConditionsWithSort) {
      nestedConditionsWithSort.forEach((nested: any) => {
        const { excludes } = sourceFieldsPayload
        if (!excludes || !excludes.includes(nested.klass.nested)) {
          if (!sourceFieldsPayload.excludes) sourceFieldsPayload.excludes = []
          sourceFieldsPayload.excludes.push(nested.klass.nested)
        }
      })
    }
  }

  if (Object.keys(sourceFieldsPayload).length > 0) {
    return sourceFieldsPayload
  }
}

// When onlyHighlight option, the results don't have the nested payload
// Instead, populate that payload via innerHits
export function mergeInnerHits(search: Search, rawResults: any[]) {
  const _search = search as any
  const onlyHighlights = _search._sourceFields?.onlyHighlights

  rawResults.forEach((rawResult) => {
    if (rawResult.inner_hits) {
      Object.keys(rawResult.inner_hits).forEach((key) => {
        if (rawResult._source[key]) {
          return // don't clobber...though maybe we should, tests fail
        } else {
          rawResult._source[key] = []
        }

        let innerHits = rawResult.inner_hits[key].hits.hits
        if (onlyHighlights && onlyHighlights.includes(key)) {
          innerHits = innerHits.filter((hit: any) => !!hit.highlight)
        }
        const nestedSource = innerHits.map((hit: any) => {
          let _highlights = {} as any
          if (hit.highlight) {
            Object.keys(hit.highlight).forEach((key) => {
              const split = key.split('.')
              split.shift()
              const innerField = split.join('.')
              _highlights[innerField] = hit.highlight[key]
            })
          }
          const _meta = { _score: hit._score }
          return { _meta, _highlights, ...hit._source }
        })

        rawResult._source[key] = nestedSource
      })
    }
  })
}