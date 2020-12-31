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

  async toElastic(options?: BucketToElasticOptions) {
    const { searchInput } = this
    let filter = { match_all: {} } as any
    if (Object.keys(searchInput).length > 0) {
      let search = new this.search.klass({ filters: this.searchInput })
      const filters = search.filters as any
      // Todo pass isAggFilter - remove nested bit
      filter = await filters.buildQuery({ isFilterAggregation: true })
    }
    return {
      [this.name]: {
        filter,
        ...(await super.toElastic(options))
      }
    }
  }
}