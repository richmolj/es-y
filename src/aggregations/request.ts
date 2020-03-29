import { Search } from "../search"

export async function buildAggRequest(search: Search, payload: any) {
  if ((search as any)._aggs && (search as any)._aggs.requiresQualityAssurance) {
    payload.body.aggs = (search as any)._aggs.toElastic({ overrideSize: true })
    const response = await (search as any).executeSearch(payload)

    Object.keys(response.body.aggregations).forEach(aggName => {
      const termAgg = (search as any)._aggs?.termAggs.find((ta: any) => ta.name == aggName)
      if (termAgg && termAgg.requiresQualityAssurance) {
        const keys = response.body.aggregations[aggName].buckets.map((b: any) => b.key)
        if (!payload.body.query) {
          payload.body.query = { bool: { } }
        }
        if (!payload.body.query.bool.filter) {
          payload.body.query.bool.filter = { bool: { should: [] } }
        }
        payload.body.query.bool.filter.bool.should.push({
          terms: {
            [termAgg.field]: keys,
          },
        })
      }
    })
  }

  // Assign aggs if we didn't already have a requiresQualityAssurance query
  if ((search as any)._aggs && !payload.body.aggs) {
    payload.body.aggs = (search as any)._aggs.toElastic()
  }
}
