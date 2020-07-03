import { Search } from '../search'
import { DateHistogramOptions } from './date-histogram'

export interface BucketOptions {
  field?: string
  min_doc_count?: number
}

export interface BucketToElasticOptions {
}

export class BucketAggregation {
  name: string
  field: string
  min_doc_count?: number
  protected search: Search

  constructor(search: Search, name: string, options: BucketOptions) {
    this.search = search
    this.name = name
    this.field = options.field || search.fieldFor(name)
    this.min_doc_count = options.min_doc_count
  }

  get type(): string {
    throw('You must implement getter #type in a subclass')
  }

  toElastic(options?: BucketToElasticOptions) {
    throw('You must implement #toElastic in a subclass')
  }
}