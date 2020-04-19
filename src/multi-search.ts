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

  searchInstances: Search[] = []

  constructor(input?: any) {
    super(input)

    if (input) {
      Object.keys(input).forEach((k) => {
        const searches = (this.constructor as any).searches;
        if (searches.hasOwnProperty(k)) {
          const searchClass = searches[k]
          const searchInput = input[k]
          searchInput.queries = { ...input.queries, ...searchInput.queries }
          searchInput.filters = { ...input.filters, ...searchInput.filters }
          const instance = new searchClass(searchInput)
          this.searchInstances.push(instance)
        }
      })
    }
  }

  get client(): Client {
    return this.searchInstances[0].klass.client
  }

  async toElastic() {
    let subQueries = [] as any[]
    await asyncForEach(this.searchInstances, async (search: Search) => {
      const payload = await search.toElastic()

      subQueries.push({
        bool: {
          filter: [
            payload.body.query,
            { terms: { _index: [ search.klass.index ] } }
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
    let results = [] as any[]
    this.searchInstances.forEach((search: any) => {
      const relevantHits = rawResults
        .filter((r: any) => {
          return r._index.match(new RegExp(search.klass.index))
        })
      const transformed = search.transformResults(search.buildResults(relevantHits))

      transformed.forEach((r: any, index: number) => {
        r._order = relevantHits[index]._order
      })

      results = results.concat(transformed)
    })

    results = results.sort((a, b) => (a._order > b._order) ? 1 : -1)
    results.forEach((r: any) => {
      delete r._order
    })

    return super.transformResults(results)
  }
}