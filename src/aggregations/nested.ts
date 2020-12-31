import { Search } from '../search'
import { Aggregations } from './index'
import { BucketAggregation, BucketOptions, BucketToElasticOptions } from './bucket'

export class NestedAggregation extends BucketAggregation {
  async toElastic(options?: BucketToElasticOptions) {
    return {
      [this.name]: {
        nested: {
          path: this.field
        },
        ...(await super.toElastic(options))
          // sum_foo: {
            // sum: {
              // field: 'skills.id' // todo skills.name
            // }
          // }
      }
    }
  }
}