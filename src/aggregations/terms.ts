import { BucketAggregation, BucketOptions, BucketToElasticOptions } from './bucket';
import { Aggregations } from "./base"
import { Search } from '../search'

export interface TermsOptions extends BucketOptions {
  size?: number
  min_doc_count?: number
  include?: string
  exclude?: string
}

interface ToElasticOptions extends BucketToElasticOptions {
  overrideSize?: boolean
}

export class TermsAggregation extends BucketAggregation {
  size: number
  sortAtt?: string
  sortDir?: string
  min_doc_count?: number
  include?: string
  exclude?: string
  requiresQualityAssurance = false
  protected _sourceFields: string[]

  get type() {
    return 'terms'
  }

  constructor(search: Search, name: string, options: TermsOptions) {
    super(search, name, options)
    this.size = options.size || 5
    this.min_doc_count = options.min_doc_count
    this.include = options.include
    this.exclude = options.exclude
    this._sourceFields = []
  }

  ensureQuality() {
    this.requiresQualityAssurance = true
    return this
  }

  sourceFields(fields: string[]) {
    this._sourceFields = fields
    return this
  }

  order(calcKind: "sum" | "average", field: string, direction: "asc" | "desc" = "asc") {
    ;(this as any)[calcKind](field)
    this.sortAtt = `calc_${calcKind}_${field}`
    this.sortDir = direction
    return this
  }

  // todo dont allow size > 10 or so
  toElastic(options?: ToElasticOptions) {
    let payload = super.toElastic(options)
    payload.terms = {
      field: this.field,
      size: this.size,
    } as any

    if (this.include) {
      payload.terms.include = this.include
    }

    if (this.exclude) {
      payload.terms.exclude = this.exclude
    }

    if (options?.overrideSize) {
      payload.terms.size = payload.terms.size * 3
      payload.terms.shard_size = payload.terms.size + 1000
    }

    if (this.min_doc_count) {
      payload.terms.min_doc_count = this.min_doc_count
    }

    if (this.sortAtt) {
      payload.terms.order = { [this.sortAtt]: this.sortDir }
    }

    if (this._sourceFields.length > 0) {
      if (!payload.aggs) payload.aggs = {}
      payload.aggs.source_fields = {
        top_hits: {
          size: 1,
          _source: {
            includes: this._sourceFields,
          },
        },
      }
    }

    return { [this.name]: payload }
  }
}
