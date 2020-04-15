import { Client, events } from "@elastic/elasticsearch"
import colorize from "./util/colorize"
import { LoggerInterface, logger, LogLevel } from "./util/logger"
import { buildRequest } from './util/build-request'
import { Conditions, SimpleQueryStringCondition } from "./conditions"
import { Aggregations, buildAggResults } from "./aggregations"
import { Meta } from "./meta"

interface Pagination {
  size: number
  number: number
}

interface Sort {
  att: string
  dir: 'desc' | 'asc'
}

export class Search {
  static index: string
  static host: string
  static client: Client
  static parentClass: typeof Search
  static currentClass: typeof Search = Search
  static resultMetadata = false
  static logger: LoggerInterface
  static logFormat = "succinct"
  static conditionsClass: typeof Conditions

  klass!: typeof Search
  results: any[]
  aggResults: any
  filters: Conditions
  queries: Conditions
  page: Pagination = { size: 20, number: 1 }
  total?: number
  lastQuery?: any
  sort: Sort[] = []
  protected _aggs?: Aggregations

  constructor(input?: any) {
    this.results = []
    this.aggResults = {}

    if (input && input.page) {
      if (input.page.size) {
        this.page.size = input.page.size
      }
      if (input.page.number) {
        this.page.number = input.page.number
      }
    }
    if (input && input.sort) {
      this.sort = input.sort
    }

    if (input && input.filters) {
      this.filters = new this.klass.conditionsClass()
      ;(this.filters as any).build(input.filters)
    } else {
      this.filters = new this.klass.conditionsClass()
    }

    if (input && input.queries) {
      this.queries = new this.klass.conditionsClass()
      ;(this.queries as any).isQuery = true;
      ;(this.queries as any).build(input.queries)
    } else {
      this.queries = new this.klass.conditionsClass()
      ;(this.queries as any).isQuery = true;
    }

    if (input && (input.aggs || input.aggregations)) {
      this.aggs.build(input.aggs || input.aggregations)
    }
  }

  get aggregations() {
    return this.aggResults
  }

  get aggs(): Aggregations {
    if (this._aggs) {
      return this._aggs
    } else {
      this._aggs = new Aggregations()
      return this._aggs
    }
  }

  // TODO: dupe _conditions for different configs
  static inherited(subclass: typeof Search) {
    subclass.parentClass = this
    subclass.currentClass = subclass
    subclass.prototype.klass = subclass
    subclass.client = new Client({ node: subclass.host })
    subclass.logger = logger
  }

  private transformResults(results: Record<string, any>[]) {
    return results.map(result => {
      return this.transformResult(result)
    })
  }

  private transformResult(result: any): Record<string, any> {
    return result
  }

  async execute() {
    const searchPayload = await buildRequest(this)
    const response = await this._execute(searchPayload)
    this.total = response.body.hits.total.value
    this.results = this.transformResults(this.buildResults(response.body.hits.hits))
    if (response.body.aggregations) {
      this.aggResults = buildAggResults(this, response.body.aggregations)
    }
    return this.results
  }

  private async _execute(searchPayload: any) {
    this._logQuery(searchPayload)
    const response = await this.klass.client.search(searchPayload)
    this.lastQuery = searchPayload
    return response
  }

  private buildResults(rawResults: any[]): any[] {
    return rawResults.map(raw => {
      const result = raw._source
      if (this.klass.resultMetadata) {
        result.meta = this.buildMetadata(raw)
      }
      return result
    })
  }

  private buildMetadata(rawResult: any) {
    return {
      _id: rawResult._id,
      _score: rawResult._score,
      _type: rawResult._type,
      _index: rawResult._index,
    }
  }

  private _logQuery(payload: Record<string, string>): void {
    let formattedPayload
    if (this.klass.logFormat === "pretty") {
      formattedPayload = JSON.stringify(payload.body, null, 2)
    } else {
      formattedPayload = JSON.stringify(payload.body)
    }

    this.klass.logger.info(`
      ${colorize("green", "QUERY")}
      ${colorize(
        "cyan",
        `curl -XGET --header 'Content-Type: application/json' ${this.klass.host}/${this.klass.index}/_search -d`,
      )} ${colorize("magenta", `'${formattedPayload}'`)}
    `)
  }
}
