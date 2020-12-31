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
import { config } from "./util/env"
import {
  HighlightConfig,
  buildHighlightsFromInput,
  attachHighlightsToResults
} from "./util/highlighting"
import { mergeInnerHits } from './util/source-fields'

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
  protected _highlights?: HighlightConfig[]
  protected _scriptQuery?: ElasticScript
  protected _scriptScore?: ElasticScript
  protected _sourceFields?: Partial<Record<'includes' | 'excludes' | 'onlyHighlights', string[]>>

  static async persist(payload: Record<string, any> | Record<string, any>[], refresh: boolean = false) {
    if (!Array.isArray(payload)) payload = [payload]

    let body = [] as any[]
    payload.forEach((p: any) => {
      body.push({ index: { _index: this.index } })
      body.push(p)
    })
    await this.client.bulk({ body, refresh: refresh.toString() as any })
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
      this.filters = new this.klass.conditionsClass()
      ;(this.filters as any).setSearch(this)
      this.queries = new this.klass.conditionsClass()
      ;(this.queries as any).isQuery = true;
      ;(this.queries as any).setSearch(this)

      if (input && input.filters) {
        ;(this.filters as any).build(input.filters)
      }

      if (input && input.queries) {
        ;(this.queries as any).build(input.queries)
      }

      if (input && (input.aggs || input.aggregations)) {
        this.aggs.build(input.aggs || input.aggregations)
      }

      if (input && input.highlights) {
        buildHighlightsFromInput(input, this)
      }

      if (input && input.sourceFields) {
        this.sourceFields(input.sourceFields)
      }
    }
  }

  sourceFields(config: Partial<Record<'excludes' | 'includes' | 'onlyHighlights', string[]>>): this {
    this._sourceFields = config
    return this
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

  highlight(name: string, options: Record<string, any> = {}) {
    if (!this._highlights) this._highlights = []
    const field = options.field
    delete options.field

    this._highlights.push({
      name,
      field: field || this.fieldFor(name) || name,
      options
    })

    return this
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

  protected fieldFor(name: string) {
    if ((this.filters as any)[name]) {
      return (this.filters as any)[name].elasticField
    }
  }

  protected async transformResults(
    results: Record<string, any>[],
    rawResults?: Record<string, any>[]
  ): Promise<any[]> {
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
    const rawResults = response.body.hits.hits
    mergeInnerHits(this, rawResults)
    const builtResults = this.buildResults(rawResults, this.includeMetadata)
    const transformedResults = await this.transformResults(builtResults, rawResults)
    attachHighlightsToResults(this, transformedResults, rawResults)
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
    const { _shards } = response.body
    if (_shards && _shards.failures && _shards.failures.length > 0) {
      throw(`Error from Elastic! ${JSON.stringify(response.body)}`)
    }
    this.lastQuery = searchPayload
    return response
  }

  protected buildResults(rawResults: any[], metadata: boolean = false): any[] {
    let results = rawResults.map((raw) => Object.assign({}, raw))
    return results.map(raw => {
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

    let prefix
    if (this.klass.isMultiSearch) {
      prefix = (this as any).searchInstances[0].klass.host
    } else {
      prefix = `${this.klass.host}/${this.klass.index}`
    }

    this.klass.logger.info(`
      ${colorize("green", "QUERY")}
      ${colorize(
        "cyan",
        `curl -XGET --header 'Content-Type: application/json' ${prefix}/_search -d`,
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