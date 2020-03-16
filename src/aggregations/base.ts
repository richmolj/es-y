import { TermsAggregation, TermsOptions } from "./terms"
import { Calculation } from "./calculation"

interface ToElasticOptions {
  overrideSize?: boolean
}

export class Aggregations {
  termAggs: TermsAggregation[]
  calculations: Calculation[]

  constructor() {
    this.termAggs = []
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
    return this.termAggs
  }

  terms(name: string, options: TermsOptions = {}): TermsAggregation {
    const agg = new TermsAggregation(name, options)
    this.termAggs.push(agg)
    return agg
  }

  // TODO mixin between this and terms
  sum(field: string) {
    const calc = new Calculation("sum", field)
    this.calculations.push(calc)
    return this
  }

  avg(field: string) {
    const calc = new Calculation("avg", field)
    this.calculations.push(calc)
    return this
  }

  toElastic(options?: ToElasticOptions) {
    let payload = {}
    this.termAggs.forEach(ta => {
      payload = { ...payload, ...ta.toElastic(options) }
    })

    this.calculations.forEach(c => {
      payload = { ...payload, ...c.toElastic() }
    })

    return payload
  }

  build(input: any): this {
    if (input.terms) {
      input.terms.forEach((term: any) => {
        const { name, ensureQuality, children, sourceFields, order, sum, avg, ...options } = term
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

        if (children) {
          children.forEach((c: any) => {
            termsClause.child().build(c)
          })
        }
      })
    }

    if (input.sum) {
      this.sum(input.sum)
    }

    if (input.avg) {
      this.avg(input.avg)
    }

    return this
  }
}
