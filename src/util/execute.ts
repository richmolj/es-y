import { Client } from "@elastic/elasticsearch"
import { Search } from '../search'
import { MultiSearch } from '../multi-search'
import { buildAggResults } from "../aggregations"
import colorize from "../util/colorize"

export async function execute(search: Search | MultiSearch, client: Client): Promise<any> {
  const _search = search as any
  const searchPayload = await search.toElastic()
  const response = await fireQuery(search, client, searchPayload)
  search.total = response.body.hits.total.value
  search.results = _search.transformResults(_search.buildResults(response.body.hits.hits))
  if (response.body.aggregations) {
    // search.aggResults = buildAggResults(search, response.body.aggregations)
  }
  return response
}

async function fireQuery(search: Search | MultiSearch, client: Client, payload: any) {
  const _search = search as any
  // _logQuery(search, payload)
  const response = await client.search(payload)
  search.lastQuery = payload
  return response
}

// function _logQuery(search: Search | MultiSearch, payload: Record<string, string>): void {
//   let formattedPayload
//   if (search.klass.logFormat === "pretty") {
//     formattedPayload = JSON.stringify(payload.body, null, 2)
//   } else {
//     formattedPayload = JSON.stringify(payload.body)
//   }

//   search.klass.logger.info(`
//     ${colorize("green", "QUERY")}
//     ${colorize(
//       "cyan",
//       `curl -XGET --header 'Content-Type: application/json' TODO/TODO/_search -d`,
//     )} ${colorize("magenta", `'${formattedPayload}'`)}
//   `)
// }