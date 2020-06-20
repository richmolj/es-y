import { Search } from './search'
import { asyncForEach } from './util'
import { ClassHook } from './decorators'
import { Pagination, Sort } from './types'
import { execute } from './util/execute'
import { LoggerInterface } from "./util/logger"
import { Client } from "@elastic/elasticsearch"
import { assignSortAndPage } from './util/build-request'

@ClassHook()
export class MultiSearch extends Search {
  static isMultiSearch = true
  static searches: Record<string, typeof Search> = {}

  klass!: typeof MultiSearch
  searchInstances: Search[] = []
  private _split: number = -1

  constructor(input?: any) {
    super(input)

    if (input) {
      if (input.split) {
        this.split(input.split)
      }

      Object.keys(input).forEach((k) => {
        const searches = (this.constructor as any).searches;
        if (searches.hasOwnProperty(k)) {
          const searchClass = searches[k]
          const searchInput = input[k]
          searchInput.queries = { ...input.queries, ...searchInput.queries }
          searchInput.filters = { ...input.filters, ...searchInput.filters }
          const instance = new searchClass(searchInput)
          if (searchInput.boost) {
            instance.boost = searchInput.boost
          }
          this.searchInstances.push(instance)
        }
      })
    }
  }

  get client(): Client {
    return this.searchInstances[0].klass.client
  }

  split(per: number = 20) {
    this._split = per
  }

  private get isSplitting() {
    return this._split > 0
  }

  async execute(): Promise<any> {
    if (this.isSplitting) {
      this.searchInstances.forEach((s) => {
        s.page.size = this._split
        s.resultMetadata = this.klass.resultMetadata
      })
      const promises = this.searchInstances.map((s) => s.execute())
      const resultArray = await Promise.all(promises)
      const classSearches = (this as any).constructor.searches
      let results = [] as any[]
      resultArray.forEach((group, index: number) => {
        const searchClass = this.searchInstances[index].klass
        const type = Object.keys(classSearches).find(k => classSearches[k] === searchClass)
        group.forEach((result) => {
          result._type = type
        })
        results = results.concat(group)
      })

      this.results = this.transformResults(results)
      return this.results
    } else {
      return super.execute()
    }
  }

  async toElastic() {
    let subQueries = [] as any[]
    await asyncForEach(this.searchInstances, async (search: Search) => {
      const payload = await search.toElastic()

      let terms = { _index: [search.klass.index] } as any
      if (search.boost) {
        terms = {
          _index: [search.klass.index],
          boost: search.boost
        }
      }


      subQueries.push({
        bool: {
          must: [
            payload.body.query,
            {
              terms
            }
          ]
        }
      })
    })

    const payload = {
      body: {
        query: {
          bool: {
            should: subQueries
          }
        }
      }
    } as any

    assignSortAndPage(this, payload)
    return payload
  }

  // We can't just iterate the hits because each search wants to post-process an array
  // This might be necessary to avoid N+1s that hydrate the data
  // So, buildResults stores the original order and index
  // transformResults accesses these to transform per-search and preserve order
  protected buildResults(rawResults: any[]): any[] {
    return rawResults.map((raw: any, index: number) => {
      const result = Object.assign({}, raw)
      result._order = index
      result._index = rawResults[index]._index
      return result
    })
  }

  protected transformResults(rawResults: Record<string, any>[]) {
    // When splitting, we've already done per-search transformation and ordering
    if (this.isSplitting) {
      const transformed = super.transformResults(rawResults)
      return this.applyMetadata(transformed, rawResults)
    }

    let results = [] as any[]
    const classSearches = (this.constructor as any).searches;
    this.searchInstances.forEach((search: any) => {
      const relevantHits = rawResults
        .filter((r: any) => {
          return r._index.match(new RegExp(search.klass.index))
        })
      const builtResults = search.buildResults(relevantHits, this.klass.resultMetadata)
      const transformed = search.transformResults(builtResults)
      this.applyMetadata(transformed, builtResults)

      transformed.forEach((r: any, index: number) => {
        r._order = relevantHits[index]._order
        const rawSearchIndex = relevantHits[index]._index
        // TODO configurable
        const searchClass = Object.values(classSearches).find((s: any) => {
          return relevantHits[index]._index.match(new RegExp(s.index))
        })
        const type = Object.keys(classSearches).find(k => classSearches[k] === searchClass)
        r._type = type
      })

      results = results.concat(transformed)
    })

    results = results.sort((a, b) => (a._order > b._order) ? 1 : -1)
    results.forEach((r: any) => {
      delete r._order
    })

    const transformed = super.transformResults(results)
    return this.applyMetadata(transformed, results)
  }
}
