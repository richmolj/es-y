import { Search } from '../search'
import { BucketAggregation, BucketOptions, BucketToElasticOptions } from './bucket'

export interface DateHistogramOptions extends BucketOptions {
  interval: string
  minDocCount?: number
  format?: string
}

export class DateHistogramAggregation extends BucketAggregation {
  interval: string
  minDocCount?: number
  format?: string

  constructor(search: Search, name: string, options: DateHistogramOptions) {
    super(search, name, options)
    this.interval = options.interval
    this.minDocCount = options.minDocCount
    this.format = options.format
  }

  get type() {
    return 'date_histogram'
  }

  // bgc1922_TODO interval becomes calendar_interval in new ES version
  async toElastic(options?: BucketToElasticOptions) {
    let payloadOptions = {
      field: this.field,
      interval: this.interval
    } as any

    if (this.minDocCount) {
      payloadOptions.min_doc_count = this.minDocCount
    }

    if (this.format) {
      payloadOptions.format = this.format
    }

    let payload = {
      [this.name]: {
        date_histogram: { ...payloadOptions },
        ...(await super.toElastic(options))
      }
    }

    return payload
  }
}