import { Client, events } from "@elastic/elasticsearch"
import colorize from "./util/colorize"
import { LoggerInterface, logger, LogLevel } from "./util/logger"
import { Conditions } from "./conditions"
import { Aggregations } from "./aggregations"
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
    this.meta = new Meta()

    if (input && input.conditions) {
      this.conditions = new this.klass.conditionsClass()
      ;(this.conditions as any).build(input.conditions)
    } else {
      this.conditions = new this.klass.conditionsClass()
    }

    if (input && (input.aggs || input.aggregations)) {
      this.aggs.build(input.aggs || input.aggregations)
    }

    if (input && input.meta) {
      if (input.meta.page) {
        this.meta.page = input.meta.page
      }

      if (input.meta.perPage || input.meta.perPage === 0) {
        this.meta.perPage = input.meta.perPage
      }

      if (input.meta.sort) {
        this.meta.sort = input.meta.sort.map((s: any) => {
          return { [s.att]: s.dir }
        })
      }
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

  // TODO: klass.model?
  transformResults(results: Record<string, any>[]) {
    return results.map(result => {
      return this.transformResult(result)
    })
  }

  transformResult(result: any): Record<string, any> {
    return result
  }

  async query() {
    // todo size, etc
    const searchPayload = { index: this.klass.index, body: {} } as any
    const query = (this.conditions as any).buildQuery()
    if (Object.keys(query).length > 0) {
      searchPayload.body = { query }
    }

    if (this.conditions.keywords.hasClause()) {
      if (!searchPayload.body.query) searchPayload.body.query = {}
      searchPayload.body.query.simple_query_string = {
        query: (this.conditions.keywords as any).value
      }
    }

    const { size, from, sort } = this.meta.toElastic()
    searchPayload.body.size = size
    searchPayload.body.from = from
    searchPayload.body.sort = sort

    if (this._aggs && this._aggs.requiresQualityAssurance) {
      searchPayload.body.aggs = this._aggs.toElastic({ overrideSize: true })
      const response = await this.executeSearch(searchPayload)

      Object.keys(response.body.aggregations).forEach(aggName => {
        const termAgg = this._aggs?.termAggs.find(ta => ta.name == aggName)
        if (termAgg && termAgg.requiresQualityAssurance) {
          const keys = response.body.aggregations[aggName].buckets.map((b: any) => b.key)
          if (!searchPayload.body.query) {
            searchPayload.body.query = { bool: { filter: { bool: { should: [] } } } }
          }
          searchPayload.body.query.bool.filter.bool.should.push({
            terms: {
              [termAgg.field]: keys,
            },
          })
        }
      })
    }

    // Assign aggs if we didn't already have a requiresQualityAssurance query
    if (this._aggs && !searchPayload.body.aggs) {
      searchPayload.body.aggs = this._aggs.toElastic()
    }

    const response = await this.executeSearch(searchPayload)
    this.meta.total = response.body.hits.total.value

    this.results = this.transformResults(this.buildResults(response.body.hits.hits))

    if (response.body.aggregations) {
      Object.keys(response.body.aggregations).forEach(aggName => {
        if (aggName.match(/^calc_/)) {
          // TODO shared func
          const calcName = aggName.split("calc_")[1]
          this.aggResults[calcName] = response.body.aggregations[aggName].value
        } else {
          const agg = this.aggs.bucketAggs.find(t => t.name === aggName)
          let buckets = response.body.aggregations[aggName].buckets
          // We overrode the size to ensure quality, now trim off the extra results
          if (agg?.requiresQualityAssurance) {
            buckets = response.body.aggregations[aggName].buckets.slice(0, agg.size)
          }
          const entries = buckets.map((b: any) => {
            return this.parseAggBucket(b)
          })
          this.aggResults[aggName] = entries
        }
      })
    }

    return this.results
  }

  private async executeSearch(searchPayload: any) {
    this._logQuery(searchPayload)
    const response = await this.klass.client.search(searchPayload)
    this.lastQuery = searchPayload
    return response
  }

  private parseAggBucket(bucket: any) {
    const entry = { key: bucket.key, count: bucket.doc_count } as any

    if (bucket.source_fields) {
      // TODO alias for field source
      entry.sourceFields = bucket.source_fields.hits.hits[0]._source
    }

    Object.keys(bucket).forEach(bucketKey => {
      if (bucketKey.match(/^calc_/)) {
        const calcName = bucketKey.split("calc_")[1]
        entry[calcName] = bucket[bucketKey].value
      } else if (
        bucketKey != "key" &&
        bucketKey != "doc_count" &&
        bucketKey != "buckets" &&
        bucketKey != "source_fields"
      ) {
        if (!entry.children) {
          entry.children = {}
        }
        entry.children[bucketKey] = bucket[bucketKey].buckets.map((childBucket: any) => {
          return this.parseAggBucket(childBucket)
        })
      }
    })
    return entry
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
