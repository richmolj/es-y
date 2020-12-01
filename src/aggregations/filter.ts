import { Search } from '../search'
import { Aggregations } from './index'
import { BucketAggregation, BucketOptions, BucketToElasticOptions } from './bucket'

export interface FilterOptions extends BucketOptions {
  content?: any
}

export class FilterAggregation extends BucketAggregation {
  searchInput: any

  constructor(search: Search, name: string, options: FilterOptions) {
    super(search, name, options)
    this.searchInput = options.content || {}
  }

  toElastic(options?: BucketToElasticOptions) {
    const { searchInput } = this
    let filter = { match_all: {} } as any
    if (Object.keys(searchInput).length > 0) {
      let search = new this.search.klass({ filters: this.searchInput })
      const filters = search.filters as any
      filter = filters.buildQuery()
    }
    return {
      [this.name]: {
        filter,
        ...super.toElastic(options)
      }
    }
  }
}