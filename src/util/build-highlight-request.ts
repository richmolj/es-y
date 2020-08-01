import { Search } from '../search'

export function buildHighlightRequest(search: Search) {
  const _search = search as any
  let fields = {} as any
  _search._highlights.forEach((config: any) => {
    fields[config.field] = { ...config.options }
  })
  return { fields }
}