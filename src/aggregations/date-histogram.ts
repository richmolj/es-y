import { Search } from '../search'
import { BucketAggregation, BucketOptions, BucketToElasticOptions } from './bucket'

export interface DateHistogramOptions extends BucketOptions {
  interval: string
  min_doc_count?: number
}

export class DateHistogramAggregation extends BucketAggregation {
  interval: string
  min_doc_count?: number

  constructor(search: Search, name: string, options: DateHistogramOptions) {
    super(search, name, options)
    this.interval = options.interval
    this.min_doc_count = options.min_doc_count
  }

  get type() {
    return 'date_histogram'
  }

  toElastic(options?: BucketToElasticOptions) {
    let payloadOptions = {
      field: this.field,
      calendar_interval: this.interval
    } as any

    if (this.min_doc_count) {
      payloadOptions.min_doc_count = this.min_doc_count
    }

    let payload = {
      [this.name]: {
        date_histogram: { ...payloadOptions },
        ...super.toElastic(options)
      }
    }

    return payload
  }
}