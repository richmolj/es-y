import { Search } from '../search'
import { BucketAggregation, BucketOptions, BucketToElasticOptions } from './bucket'

interface ToFrom {
  from?: number
  to?: number
  key?: string
}

export interface RangeOptions extends BucketOptions {
  ranges: ToFrom[]
}

export class RangeAggregation extends BucketAggregation {
  ranges: ToFrom[]

  constructor(search: Search, name: string, options: RangeOptions) {
    super(search, name, options)
    this.ranges = options.ranges
  }

  get type() {
    return 'range'
  }

  toElastic(options?: BucketToElasticOptions) {
    let payloadOptions = {
      field: this.field,
      ranges: this.ranges,
    } as any

    let payload = {
      [this.name]: {
        range: { ...payloadOptions },
        ...super.toElastic()
      }
    }

    return payload
  }
}