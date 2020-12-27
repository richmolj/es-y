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
  return response
}

async function fireQuery(search: Search | MultiSearch, client: Client, payload: any) {
  const _search = search as any
  const response = await client.search(payload)
  search.lastQuery = payload
  return response
}