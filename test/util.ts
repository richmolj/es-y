/* eslint-disable @typescript-eslint/camelcase */

import { ThronesSearch } from "./fixtures"

export function setupIntegrationTest() {
  const index = ThronesSearch.index

  afterEach(async () => {
    await ThronesSearch.client.indices.delete({ index })
  })

  beforeEach(async () => {
    await ThronesSearch.client.indices.create({ index })
    await ThronesSearch.client.indices.putMapping({
      index,
      body: {
        properties: {
          name: {
            type: "keyword",
          },
          title: {
            type: "keyword",
          },
          quote: {
            type: "text",
          },
          bio: {
            type: "text",
          },
          rating: {
            type: "integer",
          },
          age: {
            type: "integer",
          },
          skills: {
            type: "nested",
            properties: {
              name: {
                type: "keyword"
              },
              description: {
                type: "text"
              },
              note: {
                type: "text"
              },
            }
          },
          'something.dotted': {
            type: "text"
          },
          created_at: {
            type: "date",
          },
          updated_at: {
            type: "date",
          },
        },
      },
    })
  })
}
