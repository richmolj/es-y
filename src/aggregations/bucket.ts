import { Search } from '../search'
import { Aggregations } from './index'
import { Calculation } from "./calculation"
import { DateHistogramOptions } from './date-histogram'

export interface BucketOptions {
  field?: string
  avg?: string | string[]
  sum?: string | string[]
  children?: any[] // todo
  searchInput?: any
}

export interface BucketToElasticOptions {
}

export class BucketAggregation {
  name: string
  field: string
  children: Aggregations[]
  protected search: Search
  protected calculations: Calculation[]

  constructor(search: Search, name: string, options: BucketOptions) {
    this.search = search
    this.name = name
    // bgc1922_TODO: ensure no specific field and no corresponding condition works
    this.field = options.field || (search as any).fieldFor(name) || name
    this.children = []
    this.calculations = []

    if (options.avg) {
      this.avg(options.avg)
    }

    if (options.sum) {
      this.sum(options.sum)
    }

    if (options.children) {
      options.children.forEach((child) => {
        this.child().build(child)
      })
    }
  }

  sum(fields: string | string[]) {
    if (!Array.isArray(fields)) fields = [fields]
    fields.forEach((field) => {
      const calc = new Calculation("sum", field)
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

  child() {
    const child = new Aggregations(this.search)
    this.children.push(child)
    return child
  }

  get type(): string {
    throw('You must implement getter #type in a subclass')
  }

  toElastic(options?: BucketToElasticOptions) {
    let payload = {} as any
    if (this.children.length > 0) {
      payload.aggs = {}
      this.children.forEach(c => {
        payload.aggs = { ...payload.aggs, ...c.toElastic() }
      })
    }

    if (this.calculations.length > 0) {
      if (!payload.aggs) payload.aggs = {}
      this.calculations.forEach(c => {
        payload.aggs = { ...payload.aggs, ...c.toElastic() }
      })
    }

    return payload
  }
}