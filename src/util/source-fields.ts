import { Search } from '../search'

export function sourceFieldsRequestPayload(search: Search, innerHits: boolean = false) {
  const sourceFieldConfig = Object.assign({}, (search as any)._sourceFields)
  if (sourceFieldConfig) {
    const { onlyHighlights, ...sourceFields } = sourceFieldConfig
    // Exclude the onlyHighlight when top-level
    if (onlyHighlights && !innerHits) {
      if (!sourceFields.excludes) sourceFields.excludes = []
      sourceFields.excludes = sourceFields.excludes.concat(onlyHighlights)
    }
    if (Object.keys(sourceFields).length > 0) {
      return sourceFields
    }
  }
}

// When onlyHighlight option, the results don't have the nested payload
// Instead, populate that payload via innerHits
export function mergeOnlyHighlightInnerHits(search: Search, rawResults: any[]) {
  const _search = search as any
  if (_search._sourceFields && _search._sourceFields.onlyHighlights) {
    const { onlyHighlights } = _search._sourceFields

    rawResults.forEach((rawResult) => {
      if (rawResult.inner_hits) {
        Object.keys(rawResult.inner_hits).forEach((key) => {
          if (onlyHighlights.includes(key)) {
            if (!rawResult._source[key]) rawResult._source[key] = []

            const nestedSource = rawResult.inner_hits[key].hits.hits
              .map((hit: any) => {
                let _highlights = {} as any
                Object.keys(hit.highlight).forEach((key) => {
                  const split = key.split('.')
                  split.shift()
                  const innerField = split.join('.')
                  _highlights[innerField] = hit.highlight[key]
                })
                return { _highlights, ...hit._source }
              })

            rawResult._source[key] = nestedSource
          }
        })
      }
    })
  }
}