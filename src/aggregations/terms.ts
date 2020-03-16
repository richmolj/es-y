import { Calculation } from "./calculation"
import { Aggregations } from "./base"

export interface TermsOptions {
  field?: string
  size?: number
}

interface ToElasticOptions {
  overrideSize?: boolean
}

// TODO extends bucketagg
export class TermsAggregation {
  name: string
  field: string
  size: number
  sortAtt?: string
  sortDir?: string
  children: Aggregations[]
  requiresQualityAssurance = false
  protected calculations: Calculation[]
  protected _sourceFields: string[]

  constructor(name: string, options: TermsOptions) {
    this.name = name
    this.field = options.field || name
    this.size = options.size || 5
    this.calculations = []
    this.children = []
    this._sourceFields = []
  }

  ensureQuality() {
    this.requiresQualityAssurance = true
    return this
  }

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

  child() {
    const child = new Aggregations()
    this.children.push(child)
    return child
  }

  // todo size, shard size option
  // todo dont allow size > 10 or so
  toElastic(options?: ToElasticOptions) {
    const payload = {
      terms: {
        field: this.field,
        size: this.size,
      },
    } as any

    if (options?.overrideSize) {
      payload.terms.size = payload.terms.size * 3
      payload.terms.shard_size = payload.terms.size + 1000
    }

    if (this.sortAtt) {
      payload.terms.order = { [this.sortAtt]: this.sortDir }
    }

    if (this.calculations.length > 0) {
      if (!payload.aggs) payload.aggs = {}
      this.calculations.forEach(c => {
        payload.aggs = { ...payload.aggs, ...c.toElastic() }
      })
    }

    if (this.children.length > 0) {
      if (!payload.aggs) payload.aggs = {}
      this.children.forEach(c => {
        payload.aggs = { ...payload.aggs, ...c.toElastic() }
      })
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
