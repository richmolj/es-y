import { Client, events } from "@elastic/elasticsearch"
import colorize from "./util/colorize"
import { LoggerInterface, logger, LogLevel } from "./util/logger"
import { buildRequest } from './util/build-request'
import { Conditions, SimpleQueryStringCondition } from "./conditions"
import { Aggregations, buildAggResults } from "./aggregations"
import { Meta } from "./meta"
import { Pagination, Sort } from './types'
import { Scripting, ElasticScript } from "./scripting"
import { applyMixins } from './util'

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
  static isMultiSearch: boolean = false

  klass!: typeof Search
  results: any[]
  aggResults: any
  filters!: Conditions
  queries!: Conditions
  page: Pagination = { size: 20, number: 1 }
  total?: number
  lastQuery?: any
  sort: Sort[] = []
  boost?: number // multisearch
  resultMetadata: boolean = false
  protected _aggs?: Aggregations
  protected _scriptQuery?: ElasticScript
  protected _scriptScore?: ElasticScript

  static async persist(payload: Record<string, any> | Record<string, any>[], refresh: boolean = false) {
    if (!Array.isArray(payload)) payload = [payload]
    const promises = payload.map((body: Record<string, any>) => {
      return this.client.index({
        index: this.index,
        body
      })
    })
    await Promise.all(promises)
    if (refresh) {
      await this.refresh()
    }
  }

  static async refresh() {
    await this.client.indices.refresh({ index: this.index })
  }

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
    if (input && input.scriptQuery) {
      this.scriptQuery(input.scriptQuery)
    }
    if (input && input.scriptScore) {
      this.scriptScore(input.scriptScore)
    }

    if (this.klass.conditionsClass) { // else multisearch
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
  }

  fieldFor(name: string) {
    if ((this.filters as any)[name]) {
      return (this.filters as any)[name].elasticField
    }
  }

  get includeMetadata() {
    return this.resultMetadata || this.klass.resultMetadata
  }

  get aggregations() {
    return this.aggResults
  }

  get aggs(): Aggregations {
    if (this._aggs) {
      return this._aggs
    } else {
      this._aggs = new Aggregations(this)
      return this._aggs
    }
  }

  // TODO: dupe _conditions for different configs
  static inherited(subclass: typeof Search) {
    subclass.parentClass = this
    subclass.currentClass = subclass
    subclass.prototype.klass = subclass
    if (!subclass.isMultiSearch) {
      subclass.client = new Client({ node: subclass.host })
    }
    subclass.logger = logger
  }

  protected transformResults(results: Record<string, any>[]) {
    return results.map(result => {
      const transformed = this.transformResult(result)
      return transformed
    })
  }

  protected transformResult(result: any): Record<string, any> {
    return result
  }

  // TODO: agg request
  async toElastic() {
    return await buildRequest(this)
  }

  async execute() {
    const searchPayload = await this.toElastic()
    const response = await this._execute(searchPayload)
    this.total = response.body.hits.total.value
    const builtResults = this.buildResults(response.body.hits.hits, this.includeMetadata)
    const transformedResults = this.transformResults(builtResults)
    this.results = this.applyMetadata(transformedResults, builtResults)

    if (response.body.aggregations) {
      this.aggResults = buildAggResults(this, response.body.aggregations)
    }
    return this.results
  }

  get client(): Client {
    return this.klass.client
  }

  private async _execute(searchPayload: any) {
    this._logQuery(searchPayload)
    const response = await this.client.search(searchPayload)
    this.lastQuery = searchPayload
    return response
  }

  protected buildResults(rawResults: any[], metadata: boolean = false): any[] {
    return rawResults.map(raw => {
      const result = raw._source
      if (metadata) {
        result._meta = this.buildMetadata(raw)
      }
      return result
    })
  }

  protected buildMetadata(rawResult: any) {
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

  protected applyMetadata(results: any[], originalResults: any[]) {
    if (this.includeMetadata) {
      results.forEach((r, index) => {
        if (originalResults[index] && originalResults[index]._meta) {
          r._meta = originalResults[index]._meta
        }
      })
    }
    return results
  }
}

export interface Search extends Scripting {}
applyMixins(Search, [Scripting])