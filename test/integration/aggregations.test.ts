import { ThronesSearch } from "./../fixtures"
import { expect } from "chai"
import { setupIntegrationTest } from "../util"
import { equal } from "assert"
import { argv } from "process"

const index = ThronesSearch.index

describe("integration", () => {
  describe("aggregations", () => {
    setupIntegrationTest()

    beforeEach(async () => {
      await ThronesSearch.client.index({
        index,
        body: {
          id: 1,
          name: "A Person 1",
          age: 10,
          title: "A",
          rating: 100,
          created_at: '2020-01-01'
        },
      })
      await ThronesSearch.client.index({
        index,
        body: {
          id: 2,
          age: 20,
          name: "A Person 2",
          title: "A",
          rating: 200,
          created_at: '2020-06-01'
        },
      })
      await ThronesSearch.client.index({
        index,
        body: {
          id: 3,
          age: 30,
          name: "B Person",
          title: "B",
          rating: 100,
          created_at: '2020-06-15'
        },
      })
      await ThronesSearch.client.indices.refresh({ index })
    })

    // Min, max, any other graphiti/standard es things
    //
    // AGGS LOGGER
    //
    // check typings

    describe("terms", () => {
      describe("simple count", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.aggs.terms("title")
            await search.execute()
            expect(search.aggResults.title).to.deep.eq([
              { key: "A", count: 2 },
              { key: "B", count: 1 },
            ])
          })

          it('works with min_doc_count', async () => {
            const search = new ThronesSearch()
            search.aggs.terms("title", { min_doc_count: 2 })
            await search.execute()
            expect(search.aggResults.title).to.deep.eq([
              { key: "A", count: 2 }
            ])
          })

          describe('when alias/camelized field', () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.aggs.terms("titleAlias")
              await search.execute()
              expect(search.aggResults.titleAlias).to.deep.eq([
                { key: "A", count: 2 },
                { key: "B", count: 1 },
              ])
            })
          })

          describe("with a name/field mismatch", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.aggs.terms("top_titles", { field: "title" })
              await search.execute()
              expect(search.aggResults.top_titles).to.deep.eq([
                { key: "A", count: 2 },
                { key: "B", count: 1 },
              ])
            })
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              aggs: {
                terms: [
                  {
                    name: "top_titles",
                    field: "title",
                  },
                ],
              },
            })
            await search.execute()
            expect(search.aggResults.top_titles).to.deep.eq([
              { key: "A", count: 2 },
              { key: "B", count: 1 },
            ])
          })

          it("works with full 'aggregations' key", async () => {
            const search = new ThronesSearch({
              aggregations: {
                terms: [
                  {
                    field: "title",
                  },
                ],
              },
            })
            await search.execute()
            expect(search.aggResults.title).to.deep.eq([
              { key: "A", count: 2 },
              { key: "B", count: 1 },
            ])
          })

          describe("when only specifying field", () => {
            it("works", async () => {
              const search = new ThronesSearch({
                aggs: {
                  terms: [
                    {
                      field: "title",
                    },
                  ],
                },
              })
              await search.execute()
              expect(search.aggResults.title).to.deep.eq([
                { key: "A", count: 2 },
                { key: "B", count: 1 },
              ])
            })
          })
        })
      })

      describe("with source fields", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.aggs.terms("title").sourceFields(["name"])
            await search.execute()
            const entries = search.aggResults.title
            expect(entries[0].sourceFields).to.deep.eq({ name: "A Person 1" })
            expect(entries[1].sourceFields).to.deep.eq({ name: "B Person" })
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.aggs.terms("title").sourceFields(["name"])
            await search.execute()
            const entries = search.aggResults.title
            expect(entries[0].sourceFields).to.deep.eq({ name: "A Person 1" })
            expect(entries[1].sourceFields).to.deep.eq({ name: "B Person" })
          })
        })
      })

      describe("with ordering", () => {
        describe("via direct assignment", () => {
          it("works when default asc", async () => {
            const search = new ThronesSearch()
            search.aggs.terms("title").order("sum", "rating")
            await search.execute()
            const keys = search.aggResults.title.map((e: any) => e.key)
            expect(keys).to.deep.eq(["B", "A"])
          })

          it("works when explicit asc", async () => {
            const search = new ThronesSearch()
            search.aggs.terms("title").order("sum", "rating", "asc")
            await search.execute()
            const keys = search.aggResults.title.map((e: any) => e.key)
            expect(keys).to.deep.eq(["B", "A"])
          })

          it("works when desc", async () => {
            const search = new ThronesSearch()
            search.aggs.terms("title").order("sum", "rating", "desc")
            await search.execute()
            const keys = search.aggResults.title.map((e: any) => e.key)
            expect(keys).to.deep.eq(["A", "B"])
          })
        })

        describe("via constructor", () => {
          it("works when default asc", async () => {
            const search = new ThronesSearch({
              aggs: {
                terms: [
                  {
                    name: "title",
                    order: ["sum", "rating"],
                  },
                ],
              },
            })
            await search.execute()
            const keys = search.aggResults.title.map((e: any) => e.key)
            expect(keys).to.deep.eq(["B", "A"])
          })

          it("works when explicit asc", async () => {
            const search = new ThronesSearch({
              aggs: {
                terms: [
                  {
                    name: "title",
                    order: ["sum", "rating", "asc"],
                  },
                ],
              },
            })
            await search.execute()
            const keys = search.aggResults.title.map((e: any) => e.key)
            expect(keys).to.deep.eq(["B", "A"])
          })

          it("works when desc", async () => {
            const search = new ThronesSearch({
              aggs: {
                terms: [
                  {
                    name: "title",
                    order: ["sum", "rating", "desc"],
                  },
                ],
              },
            })
            await search.execute()
            const keys = search.aggResults.title.map((e: any) => e.key)
            expect(keys).to.deep.eq(["A", "B"])
          })
        })
      })

      describe("with quality assurance", () => {
        describe("via direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.aggs
              .terms("title", { size: 1 })
              .ensureQuality()
              .child()
              .terms("age")
              .sum("rating")
            await search.execute()
            expect(search.lastQuery.body.query.bool.filter.bool.should[0].bool.must).to.deep.eq([
              {
                terms: {
                  title: ["A", "B"],
                },
              },
            ])
            expect(search.aggResults.title).to.deep.eq([
              {
                key: "A",
                count: 2,
                children: {
                  age: [
                    { key: 10, count: 1, sum_rating: 100 },
                    { key: 20, count: 1, sum_rating: 200 },
                  ],
                },
              },
            ])
          })
        })

        describe("via constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              aggs: {
                terms: [
                  {
                    name: "title",
                    ensureQuality: true,
                    children: [
                      {
                        terms: [
                          {
                            name: "age",
                            sum: "rating",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            })
            await search.execute()
            expect(search.lastQuery.body.query.bool.filter.bool.should[0].bool.must).to.deep.eq([
              {
                terms: {
                  title: ["A", "B"],
                },
              },
            ])
            expect(search.aggResults.title).to.deep.eq([
              {
                key: "A",
                count: 2,
                children: {
                  age: [
                    { key: 10, count: 1, sum_rating: 100 },
                    { key: 20, count: 1, sum_rating: 200 },
                  ],
                },
              },
              {
                key: "B",
                count: 1,
                children: {
                  age: [{ key: 30, count: 1, sum_rating: 100 }],
                },
              },
            ])
          })
        })
      })

      describe("with children", () => {
        beforeEach(async () => {
          await ThronesSearch.client.index({
            index,
            body: {
              id: 2,
              age: 20,
              title: "A",
              rating: 500,
            },
          })
          await ThronesSearch.client.indices.refresh({ index })
        })

        describe("via direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.aggs
              .terms("title")
              .child()
              .terms("age")
              .sum("rating")
            await search.execute()
            expect(search.aggResults.title).to.deep.eq([
              {
                key: "A",
                count: 3,
                children: {
                  age: [
                    { key: 20, count: 2, sum_rating: 700 },
                    { key: 10, count: 1, sum_rating: 100 },
                  ],
                },
              },
              {
                key: "B",
                count: 1,
                children: {
                  age: [{ key: 30, count: 1, sum_rating: 100 }],
                },
              },
            ])
          })
        })

        describe("via constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              aggs: {
                terms: [
                  {
                    name: "title",
                    children: [
                      {
                        terms: [
                          {
                            name: "age",
                            sum: "rating",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            })
            await search.execute()
            expect(search.aggResults.title).to.deep.eq([
              {
                key: "A",
                count: 3,
                children: {
                  age: [
                    { key: 20, count: 2, sum_rating: 700 },
                    { key: 10, count: 1, sum_rating: 100 },
                  ],
                },
              },
              {
                key: "B",
                count: 1,
                children: {
                  age: [{ key: 30, count: 1, sum_rating: 100 }],
                },
              },
            ])
          })
        })
      })

      describe("with calculations", () => {
        describe("sum", () => {
          describe("via direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.aggs.terms("title").sum("rating")
              await search.execute()
              expect(search.aggResults.title).to.deep.eq([
                { key: "A", count: 2, sum_rating: 300 },
                { key: "B", count: 1, sum_rating: 100 },
              ])
            })
          })

          describe('with field alias reorg this test', () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.aggs.terms("titleAlias").sum("rating")
              await search.execute()
              expect(search.aggResults.titleAlias).to.deep.eq([
                { key: "A", count: 2, sum_rating: 300 },
                { key: "B", count: 1, sum_rating: 100 },
              ])
            })
          })

          describe("via constructor", () => {
            it("works", async () => {
              const search = new ThronesSearch({
                aggs: {
                  terms: [
                    {
                      name: "title",
                      sum: "rating",
                    },
                  ],
                },
              })
              await search.execute()
              expect(search.aggResults.title).to.deep.eq([
                { key: "A", count: 2, sum_rating: 300 },
                { key: "B", count: 1, sum_rating: 100 },
              ])
            })
          })
        })

        describe("avg", () => {
          describe("via direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.aggs.terms("title").avg("rating")
              await search.execute()
              expect(search.aggResults.title).to.deep.eq([
                { key: "A", count: 2, avg_rating: 150 },
                { key: "B", count: 1, avg_rating: 100 },
              ])
            })
          })

          describe("via constructor", () => {
            it("works", async () => {
              const search = new ThronesSearch({
                aggs: {
                  terms: [
                    {
                      name: "title",
                      avg: "rating",
                    },
                  ],
                },
              })
              await search.execute()
              expect(search.aggResults.title).to.deep.eq([
                { key: "A", count: 2, avg_rating: 150 },
                { key: "B", count: 1, avg_rating: 100 },
              ])
            })
          })
        })

        describe("multiple calculations", () => {
          describe("via direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.aggs
                .terms("title")
                .avg("rating")
                .sum("rating")
              await search.execute()
              expect(search.aggResults.title).to.deep.eq([
                { key: "A", count: 2, avg_rating: 150, sum_rating: 300 },
                { key: "B", count: 1, avg_rating: 100, sum_rating: 100 },
              ])
            })
          })

          describe("via constructor", () => {
            it("works", async () => {
              const search = new ThronesSearch({
                aggs: {
                  terms: [
                    {
                      name: "title",
                      avg: "rating",
                      sum: "rating",
                    },
                  ],
                },
              })
              await search.execute()
              expect(search.aggResults.title).to.deep.eq([
                { key: "A", count: 2, avg_rating: 150, sum_rating: 300 },
                { key: "B", count: 1, avg_rating: 100, sum_rating: 100 },
              ])
            })
          })
        })
      })
    })

    describe("calculations with no terms", () => {
      describe("sum", () => {
        describe("via direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.aggs.sum("rating")
            await search.execute()
            expect(search.aggResults.sum_rating).to.eq(400)
          })
        })

        describe("via constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              aggs: {
                sum: "rating",
              },
            })
            await search.execute()
            expect(search.aggResults.sum_rating).to.eq(400)
          })
        })
      })

      describe("avg", () => {
        describe("via direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.aggs.avg("rating")
            await search.execute()
            expect(Math.round(search.aggResults.avg_rating * 100) / 100).to.eq(133.33)
          })
        })

        describe("via constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              aggs: {
                avg: "rating",
              },
            })
            await search.execute()
            expect(Math.round(search.aggResults.avg_rating * 100) / 100).to.eq(133.33)
          })
        })
      })

      describe("multiple calculations", () => {
        describe("via direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.aggs.avg("rating").sum("rating")
            await search.execute()
            expect(search.aggResults.sum_rating).to.eq(400)
            expect(Math.round(search.aggResults.avg_rating * 100) / 100).to.eq(133.33)
          })
        })

        describe("via constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              aggs: {
                avg: "rating",
                sum: "rating",
              },
            })
            await search.execute()
            expect(search.aggResults.sum_rating).to.eq(400)
            expect(Math.round(search.aggResults.avg_rating * 100) / 100).to.eq(133.33)
          })
        })
      })
    })

    describe('date histogram', () => {
      describe('basic', () => {
        describe('by direct assignment', () => {
          it('works', async () => {
            const search = new ThronesSearch()
            search.aggs.dateHistogram('createdAt', { interval: "month" })
            await search.execute()
            expect(search.aggResults.createdAt).to.deep.eq([
              { key: '2020-01-01T00:00:00.000Z', count: 1 },
              { key: '2020-02-01T00:00:00.000Z', count: 0 },
              { key: '2020-03-01T00:00:00.000Z', count: 0 },
              { key: '2020-04-01T00:00:00.000Z', count: 0 },
              { key: '2020-05-01T00:00:00.000Z', count: 0 },
              { key: '2020-06-01T00:00:00.000Z', count: 2 }
            ])
          })

          it('works with min_doc_count', async () => {
            const search = new ThronesSearch()
            search.aggs.dateHistogram('createdAt', { interval: "month", min_doc_count: 1 })
            await search.execute()
            expect(search.aggResults.createdAt).to.deep.eq([
              { key: '2020-01-01T00:00:00.000Z', count: 1 },
              { key: '2020-06-01T00:00:00.000Z', count: 2 }
            ])
          })

          it('works with other interval', async () => {
            const search = new ThronesSearch()
            search.aggs.dateHistogram('createdAt', { interval: "year" })
            await search.execute()
            expect(search.aggResults.createdAt).to.deep.eq([
              { key: '2020-01-01T00:00:00.000Z', count: 3 }
            ])
          })
        })

        describe('by constructor', () => {
          it('works', async () => {
            const search = new ThronesSearch({
              aggs: {
                dateHistograms: [{
                  name: 'createdAt',
                  interval: 'month'
                }]
              }
            })
            await search.execute()
            expect(search.aggResults.createdAt).to.deep.eq([
              { key: '2020-01-01T00:00:00.000Z', count: 1 },
              { key: '2020-02-01T00:00:00.000Z', count: 0 },
              { key: '2020-03-01T00:00:00.000Z', count: 0 },
              { key: '2020-04-01T00:00:00.000Z', count: 0 },
              { key: '2020-05-01T00:00:00.000Z', count: 0 },
              { key: '2020-06-01T00:00:00.000Z', count: 2 }
            ])
          })
        })
      })

      describe('with explicit field', () => {
        describe('by direct assignment', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.aggs.dateHistogram('foo', { field: 'created_at', interval: "month" })
            await search.execute()
            expect(search.aggResults.foo).to.deep.eq([
              { key: '2020-01-01T00:00:00.000Z', count: 1 },
              { key: '2020-02-01T00:00:00.000Z', count: 0 },
              { key: '2020-03-01T00:00:00.000Z', count: 0 },
              { key: '2020-04-01T00:00:00.000Z', count: 0 },
              { key: '2020-05-01T00:00:00.000Z', count: 0 },
              { key: '2020-06-01T00:00:00.000Z', count: 2 }
            ])
          })
        })

        describe('by constructor', () => {
          it('works', async() => {
            const search = new ThronesSearch({
              aggs: {
                dateHistograms: [{
                  name: 'foo',
                  field: 'created_at',
                  interval: 'month'
                }]
              }
            })
            await search.execute()
            expect(search.aggResults.foo).to.deep.eq([
              { key: '2020-01-01T00:00:00.000Z', count: 1 },
              { key: '2020-02-01T00:00:00.000Z', count: 0 },
              { key: '2020-03-01T00:00:00.000Z', count: 0 },
              { key: '2020-04-01T00:00:00.000Z', count: 0 },
              { key: '2020-05-01T00:00:00.000Z', count: 0 },
              { key: '2020-06-01T00:00:00.000Z', count: 2 }
            ])
          })
        })
      })

      describe('with calculation', () => {
        describe('by direct assignment', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.aggs
              .dateHistogram('createdAt', { interval: "month" })
              .avg('rating')
              .sum('age')
            await search.execute()
            expect(search.aggResults.createdAt[0]).to.deep.eq({
              key: '2020-01-01T00:00:00.000Z',
              count: 1,
              avg_rating: 100,
              sum_age: 10
            })
          })
        })

        describe('by constructor', () => {
          it('works', async() => {
            const search = new ThronesSearch({
              aggs: {
                dateHistograms: [
                  {
                    name: 'createdAt',
                    interval: 'month',
                    avg: 'rating',
                    sum: 'age'
                  }
                ]
              }
            })
            await search.execute()
            expect(search.aggResults.createdAt[0]).to.deep.eq({
              key: '2020-01-01T00:00:00.000Z',
              count: 1,
              avg_rating: 100,
              sum_age: 10
            })
          })
        })
      })

      describe('with children', () => {
        describe('by direct assignment', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.aggs
              .dateHistogram('createdAt', { interval: "month" })
              .child()
              .terms('title')
            await search.execute()
            expect(search.aggResults.createdAt[0]).to.deep.eq({
              key: '2020-01-01T00:00:00.000Z',
              count: 1,
              children: {
                title: [
                  {
                    count: 1,
                    key: 'A'
                  }
                ]
              }
            })
          })
        })

        describe('by constructor', () => {
          it('works', async() => {
            const search = new ThronesSearch({
              aggs: {
                dateHistograms: [{
                  name: 'createdAt',
                  interval: 'month',
                  children: [{
                    terms: [{
                      name: 'title'
                    }]
                  }]
                }]
              }
            })
            await search.execute()
            expect(search.aggResults.createdAt[0]).to.deep.eq({
              key: '2020-01-01T00:00:00.000Z',
              count: 1,
              children: {
                title: [
                  {
                    count: 1,
                    key: 'A'
                  }
                ]
              }
            })
          })
        })
      })
    })

    // TODO: ensure this works for this and date histogram
    // figure out avg, sum etc as well (maybe bucket superclass, maybe not bc range`)
    // TODO: this and date histogram with sum, avg, etc
    // GQL for range and children, avg sum etc
    describe('range', () => {
      describe('basic', () => {
        describe('by direct assignment', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.aggs.range('rating', { ranges: [{ from: 1, to: 101 }, { from: 102 }] })
            await search.execute()
            expect(search.aggResults.rating).to.deep.eq([
              { key: '1.0-101.0', count: 2 },
              { key: '102.0-*', count: 1 }
            ])
          })
        })

        describe('by constructor', () => {
          it('works', async() => {
            const search = new ThronesSearch({
              aggs: {
                ranges: [{
                  name: 'rating',
                  ranges: [
                    {
                      from: 1,
                      to: 101
                    },
                    {
                      from: 102
                    }
                  ]
                }]
              }
            })
            await search.execute()
            expect(search.aggResults.rating).to.deep.eq([
              { key: '1.0-101.0', count: 2 },
              { key: '102.0-*', count: 1 }
            ])
          })
        })
      })

      describe('with calculation', () => {
        describe('by direct assignment', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.aggs
              .range('rating', { ranges: [{ from: 1, to: 101 }, { from: 102 }] })
              .avg('rating')
              .sum('age')
            await search.execute()
            expect(search.aggResults.rating).to.deep.eq([
              { key: '1.0-101.0', count: 2, avg_rating: 100, sum_age: 40 },
              { key: '102.0-*', count: 1, avg_rating: 200, sum_age: 20 }
            ])
          })
        })

        describe('by constructor', () => {
          it('works', async() => {
            const search = new ThronesSearch({
              aggs: {
                ranges: [{
                  name: 'rating',
                  ranges: [
                    {
                      from: 1,
                      to: 101,
                    },
                    {
                      from: 102
                    }
                  ],
                  avg: 'rating',
                  sum: 'age'
                }]
              }
            })
            await search.execute()
            expect(search.aggResults.rating).to.deep.eq([
              { key: '1.0-101.0', count: 2, avg_rating: 100, sum_age: 40 },
              { key: '102.0-*', count: 1, avg_rating: 200, sum_age: 20 }
            ])
          })
        })
      })

      describe('with custom key', () => {
        describe('by direct assignment', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.aggs.range('rating', { ranges: [{ key: 'low', from: 1, to: 101 }, { key: 'high', from: 102 }] })
            await search.execute()
            expect(search.aggResults.rating).to.deep.eq([
              { key: 'low', count: 2 },
              { key: 'high', count: 1 }
            ])
          })
        })

        describe('by constructor', () => {
          it('works', async() => {
            const search = new ThronesSearch({
              aggs: {
                ranges: [{
                  name: 'rating',
                  ranges: [
                    {
                      key: 'low',
                      from: 1,
                      to: 101
                    },
                    {
                      key: 'high',
                      from: 102,
                    }
                  ]
                }]
              }
            })
            await search.execute()
            expect(search.aggResults.rating).to.deep.eq([
              { key: 'low', count: 2 },
              { key: 'high', count: 1 }
            ])
          })
        })
      })

      describe('with children', () => {
        describe('by direct assignment', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.aggs
              .range('rating', { ranges: [{ from: 1, to: 101 }, { from: 102 }] })
              .child()
              .terms('title')
            await search.execute()
            expect(search.aggResults.rating).to.deep.eq([
              {
                key: '1.0-101.0',
                count: 2,
                children: {
                  title: [
                    {
                      count: 1,
                      key: 'A'
                    },
                    {
                      count: 1,
                      key: 'B'
                    }
                  ]
                }
              },
              {
                key: '102.0-*',
                count: 1,
                children: {
                  title: [
                    {
                      key: 'A',
                      count: 1
                    }
                  ]
                }
              }
            ])
          })
        })

        describe('by constructor', () => {
          it('works', async() => {
            const search = new ThronesSearch({
              aggs: {
                ranges: [{
                  name: 'rating',
                  ranges: [
                    {
                      from: 1,
                      to: 101
                    },
                    {
                      from: 102
                    }
                  ],
                  children: [{
                    terms: [{
                      name: 'title'
                    }]
                  }]
                }]
              }
            })
            await search.execute()
            expect(search.aggResults.rating).to.deep.eq([
              {
                key: '1.0-101.0',
                count: 2,
                children: {
                  title: [
                    {
                      count: 1,
                      key: 'A'
                    },
                    {
                      count: 1,
                      key: 'B'
                    }
                  ]
                }
              },
              {
                key: '102.0-*',
                count: 1,
                children: {
                  title: [
                    {
                      key: 'A',
                      count: 1
                    }
                  ]
                }
              }
            ])
          })
        })
      })
    })
  })
})
