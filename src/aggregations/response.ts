import { Search } from "../search"
import { BucketAggregation } from "./bucket"

function parseBucket(bucket: any) {
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
        return parseBucket(childBucket)
      })
    }
  })
  return entry
}

function parseBucketAgg(search: Search, aggName: string, buckets: any[]) {
  const agg = search.aggs.bucketAggs.find(t => t.name === aggName) as any

  // We overrode the size to ensure quality, now trim off the extra results
  if (agg?.requiresQualityAssurance) { // terms agg
    buckets = buckets.slice(0, agg.size)
  }
  const entries = buckets.map((b: any) => {
    return parseBucket(b)
  })

  return entries
}

export function buildAggResults(search: Search, payload: any) {
  const aggResults = {} as any
  Object.keys(payload).forEach(aggName => {
    if (aggName.match(/^calc_/)) {
      const calcName = aggName.split("calc_")[1]
      aggResults[calcName] = payload[aggName].value
    } else {
      const aggResult = payload[aggName]
      if (aggResult.buckets) {
        aggResults[aggName] = parseBucketAgg(search, aggName, aggResult.buckets)
      } else {
        aggResults[aggName] = { } as any

        Object.keys(aggResult).forEach((key) => {
          if (key.match(/^calc_/)) {
            const calcName = key.split("calc_")[1]
            aggResults[aggName][calcName] = aggResult[key].value
          } else if (key === 'doc_count') {
            aggResults[aggName].count = aggResult[key]
          } else {
            if (aggResult[key].buckets) {
              aggResults[aggName][key] = parseBucketAgg(search, key, aggResult[key].buckets)
            } else {
              // todo when we add further aggs
            }
          }
        })
      }
    }
  })
  return aggResults
}
