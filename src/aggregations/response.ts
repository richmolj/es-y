import { Search } from "../search"

function parseAggBucket(bucket: any) {
  const entry = { key: (bucket.key_as_string || bucket.key), count: bucket.doc_count } as any

  if (bucket.source_fields) {
    entry.sourceFields = bucket.source_fields.hits.hits[0]._source
  }

  Object.keys(bucket).forEach(bucketKey => {
    if (bucketKey.match(/^calc_/)) {
      const calcName = bucketKey.split("calc_")[1]
      entry[calcName] = bucket[bucketKey].value
    } else if (
      bucketKey != "key" &&
      bucketKey != "key_as_string" &&
      bucketKey != "doc_count" &&
      bucketKey != "buckets" &&
      bucketKey != "from" &&
      bucketKey != "to" &&
      bucketKey != "source_fields"
    ) {
      if (!entry.children) {
        entry.children = {}
      }
      entry.children[bucketKey] = bucket[bucketKey].buckets.map((childBucket: any) => {
        return parseAggBucket(childBucket)
      })
    }
  })
  return entry
}

export function buildAggResults(search: Search, payload: any) {
  const aggResults = {} as any
  Object.keys(payload).forEach(aggName => {
    if (aggName.match(/^calc_/)) {
      const calcName = aggName.split("calc_")[1]
      aggResults[calcName] = payload[aggName].value
    } else {
      const agg = search.aggs.bucketAggs.find(t => t.name === aggName) as any // TODO base agg
      let buckets = payload[aggName].buckets
      // We overrode the size to ensure quality, now trim off the extra results
      if (agg?.requiresQualityAssurance) { // terms agg
        buckets = payload[aggName].buckets.slice(0, agg.size)
      }
      const entries = buckets.map((b: any) => {
        return parseAggBucket(b)
      })
      aggResults[aggName] = entries
    }
  })
  return aggResults
}
