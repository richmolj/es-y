import { Client, events } from "@elastic/elasticsearch"
import colorize from "./util/colorize"
import { LoggerInterface, logger, LogLevel } from "./util/logger"
import { Conditions } from "./conditions"
import { Aggregations, buildAggResults, buildAggRequest } from "./aggregations"
import { Meta } from "./meta"

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
  conditions: Conditions
  meta: Meta
  lastQuery?: any
  protected _aggs?: Aggregations

  constructor(input?: any) {
    // TODO any
    this.results = []
    this.aggResults = {}
    this.meta = new Meta(input && input.meta)

    if (input && input.conditions) {
      this.conditions = new this.klass.conditionsClass()
      ;(this.conditions as any).build(input.conditions)
    } else {
      this.conditions = new this.klass.conditionsClass()
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

  async query() {
    const searchPayload = { index: this.klass.index, body: {} } as any
    const query = (this.conditions as any).buildQuery()
    if (Object.keys(query).length > 0) {
      searchPayload.body = { query }
    }

    if ((this.conditions.keywords as any).hasClause()) {
      if (!searchPayload.body.query) searchPayload.body.query = {}
      searchPayload.body.query.simple_query_string = {
        query: (this.conditions.keywords as any).value,
      }
    }

    const { size, from, sort } = this.meta.toElastic()
    searchPayload.body.size = size
    searchPayload.body.from = from
    searchPayload.body.sort = sort

    buildAggRequest(this, searchPayload)

    const response = await this.executeSearch(searchPayload)
    this.meta.total = response.body.hits.total.value

    this.results = this.transformResults(this.buildResults(response.body.hits.hits))

    if (response.body.aggregations) {
      this.aggResults = buildAggResults(this, response.body.aggregations)
    }

    return this.results
  }

  private async executeSearch(searchPayload: any) {
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
