import { DateHistogramAggregation, DateHistogramOptions } from './date-histogram';
import { TermsAggregation, TermsOptions } from "./terms"
import { RangeAggregation, RangeOptions } from "./range"
import { FilterAggregation, FilterOptions } from "./filter"
import { NestedAggregation } from "./nested"
import { Calculation } from "./calculation"
import { Search } from "../search"
import { asyncForEach } from '../util'
import { BucketAggregation, BucketOptions } from './bucket';

interface ToElasticOptions {
  overrideSize?: boolean
}

export class Aggregations {
  private termAggs: TermsAggregation[]
  private dateHistogramAggs: DateHistogramAggregation[]
  private rangeAggs: RangeAggregation[]
  private filterAggs: FilterAggregation[]
  private nestedAggs: NestedAggregation[]
  private calculations: Calculation[]
  private search: Search

  constructor(search: Search) {
    this.search = search
    this.termAggs = []
    this.dateHistogramAggs = []
    this.rangeAggs = []
    this.filterAggs = []
    this.nestedAggs = []
    this.calculations = []
  }

  get requiresQualityAssurance(): boolean {
    let required = false
    this.termAggs.forEach(ta => {
      if (ta.requiresQualityAssurance) {
        required = true
      }
    })
    return required
  }

  get bucketAggs() {
    return [
      ...this.termAggs,
      ...this.dateHistogramAggs,
      ...this.rangeAggs,
      ...this.filterAggs,
      ...this.nestedAggs,
    ]
  }

  terms(name: string, options: TermsOptions = {}): TermsAggregation {
    const agg = new TermsAggregation(this.search, name, options)
    this.termAggs.push(agg)
    return agg
  }

  dateHistogram(name: string, options: DateHistogramOptions): DateHistogramAggregation {
    const agg = new DateHistogramAggregation(this.search, name, options)
    this.dateHistogramAggs.push(agg)
    return agg
  }

  range(name: string, options: RangeOptions): RangeAggregation {
    const agg = new RangeAggregation(this.search, name, options)
    this.rangeAggs.push(agg)
    return agg
  }

  filter(name: string, options:  FilterOptions): FilterAggregation {
    const agg = new FilterAggregation(this.search, name, options)
    this.filterAggs.push(agg)
    return agg
  }

  nested(name: string, options: BucketOptions = {}): NestedAggregation {
    const agg = new NestedAggregation(this.search, name, options)
    this.nestedAggs.push(agg)
    return agg
  }

  // Todo mixin between this and Bucket
  sum(fields: string | string[]) {
    if (!Array.isArray(fields)) fields = [fields]
    fields.forEach((field) => {
      const calc = new Calculation("sum", field)
      this.calculations.push(calc)
    })
    return this
  }

  valueCount(fields: string | string[]) {
    if (!Array.isArray(fields)) fields = [fields]
    fields.forEach((field) => {
      const calc = new Calculation("value_count", field)
      this.calculations.push(calc)
    })
    return this
  }

  avg(fields: string | string[]) {
    if (!Array.isArray(fields)) fields = [fields]
    fields.forEach((field) => {
      const calc = new Calculation("avg", field)
      this.calculations.push(calc)
    })
    return this
  }

  get isPresent(): boolean {
    return this.bucketAggs.length + this.calculations.length > 0
  }

  async toElastic(options?: ToElasticOptions) {
    let payload = {}
    await asyncForEach(this.bucketAggs, async (ba: BucketAggregation) => {
      payload = { ...payload, ...(await ba.toElastic(options)) }
    })

    this.calculations.forEach((c: Calculation) => {
      payload = { ...payload, ...c.toElastic() }
    })

    return payload
  }

  build(input: any): this {
    if (input.dateHistograms) {
      input.dateHistograms.forEach((dateHistogram: any) => {
        const { name, ...options } = dateHistogram
        const clause = this.dateHistogram(name, options)
      })
    }

    if (input.ranges) {
      input.ranges.forEach((range: any) => {
        const { name, ...options } = range
        const clause = this.range(name, options)
      })
    }

    if (input.filter) {
      input.filter.forEach((filter: any) => {
        const { name, ...options } = filter
        this.filter(name, options)
      })
    }

    if (input.nested) {
      input.nested.forEach((nested: any) => {
        const { name, ...options } = nested
        this.nested(name, options)
      })
    }

    if (input.terms) {
      input.terms.forEach((term: any) => {
        const { name, ensureQuality, sourceFields, order, sum, avg, ...options } = term
        const termsClause = this.terms(name || options.field, options)

        if (sourceFields) {
          termsClause.sourceFields(sourceFields)
        }

        if (ensureQuality) {
          termsClause.ensureQuality()
        }

        if (order) {
          // @ts-ignore
          termsClause.order(...order)
        }

        if (sum) {
          termsClause.sum(sum)
        }

        if (avg) {
          termsClause.avg(avg)
        }
      })
    }

    if (input.sum) {
      this.sum(input.sum)
    }

    if (input.avg) {
      this.avg(input.avg)
    }

    if (input.valueCount) {
      this.valueCount(input.valueCount)
    }

    return this
  }
}
