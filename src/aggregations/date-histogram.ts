export interface DateHistogramOptions {
  field?: string
  interval: string
}

interface ToElasticOptions {
}

export class DateHistogramAggregation {
  name: string
  field: string
  interval: string

  constructor(name: string, options: DateHistogramOptions) {
    this.name = name
    this.field = options.field || name
    this.interval = options.interval
  }

  get type() {
    return 'date_histogram'
  }

  toElastic(options?: ToElasticOptions) {
    return {
      [this.name]: {
        date_histogram: {
          field: this.field,
          calendar_interval: this.interval
        }
      }
    }
  }
}