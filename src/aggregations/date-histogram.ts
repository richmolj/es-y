import { Search } from '../search'
import { BucketAggregation, BucketOptions, BucketToElasticOptions } from './bucket'

export interface DateHistogramOptions extends BucketOptions {
  interval: string
}

export class DateHistogramAggregation extends BucketAggregation {
  interval: string

  constructor(search: Search, name: string, options: DateHistogramOptions) {
    super(search, name, options)
    this.interval = options.interval
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
        date_histogram: { ...payloadOptions }
      }
    }

    return payload
  }
}