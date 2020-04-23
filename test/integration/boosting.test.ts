import { expect } from "chai"
import { ThronesSearch } from "../fixtures"
import { setupIntegrationTest } from "../util"

describe("integration", () => {
  setupIntegrationTest()

  describe('boosting queries', () => {
    beforeEach(async () => {
      await ThronesSearch.client.index({
        index: ThronesSearch.index,
        body: {
          id: 1,
          name: "foo",
          bio: "foo",
          quote: "foo",
          rating: 1,
          created_at: '2000-01-01'
        },
      })
      await ThronesSearch.client.index({
        index: ThronesSearch.index,
        body: {
          id: 2,
          name: "bar",
          bio: "bar",
          quote: "bar",
          rating: 2,
          created_at: '2000-02-02'
        },
      })

      await ThronesSearch.client.indices.refresh({ index: ThronesSearch.index })
    })

    // TODO: GQL boosting
    describe('field boosting', async() => {
      describe('referencing the raw field', () => {
        xit('works', async() => {
        })
      })

      describe('referencing the field alias', () => {
        xit('works', async() => {
        })
      })
    })

    describe('clause boosting', () => {
      describe('keyword conditions', () => {
        describe('or', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.name
              .eq("foo")
              .or.eq("bar", { boost: 5 })
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([2, 1])
          })
        })
      })

      describe('numeric conditions', () => {
        describe('eq', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.rating
              .eq(1)
              .or.eq(2, { boost: 5 })
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([2, 1])
          })
        })

        describe('gt', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.rating
              .eq(1)
              .or.gt(1, { boost: 5 })
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([2, 1])
          })
        })

        describe('gte', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.rating
              .eq(1)
              .or.gte(2, { boost: 5 })
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([2, 1])
          })
        })

        describe('lt', () => {
          beforeEach(async () => {
            await ThronesSearch.client.index({
              index: ThronesSearch.index,
              body: {
                id: 3,
                rating: 1
              },
            })

            await ThronesSearch.client.indices.refresh({ index: ThronesSearch.index })
          })

          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.rating
              .eq(2)
              .or.lt(2, { boost: 5 })
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([1, 3, 2])
          })
        })

        describe('lte', () => {
          beforeEach(async () => {
            await ThronesSearch.client.index({
              index: ThronesSearch.index,
              body: {
                id: 3,
                rating: 3
              },
            })

            await ThronesSearch.client.indices.refresh({ index: ThronesSearch.index })
          })

          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.rating
              .eq(3)
              .or.lte(1, { boost: 5 })
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([1, 3])
          })
        })
      })

      describe('date conditions', () => {
        describe('eq', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.createdAt
              .eq('2000-01-01')
              .or.eq('2000-02-02', { boost: 5 })
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([2, 1])
          })
        })

        describe('gt', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.createdAt
              .eq('2000-01-01')
              .or.gt('2000-01-01', { boost: 5 })
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([2, 1])
          })
        })

        describe('gte', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.createdAt
              .eq('2000-01-01')
              .or.gte('2000-02-02', { boost: 5 })
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([2, 1])
          })
        })

        describe('lt', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.createdAt
              .eq('2000-02-02')
              .or.lt('2000-02-02', { boost: 5 })
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([1, 2])
          })
        })

        describe('lte', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.createdAt
              .eq('2000-02-02')
              .or.lte('2000-01-01', { boost: 5 })
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([1, 2])
          })
        })
      })

      describe('text conditions', () => {
        describe('match', () => {
          describe('within condition', () => {
            describe('vanilla', () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 3,
                    bio: "foo foo foo foo foo",
                  },
                })
                await ThronesSearch.client.indices.refresh({ index: ThronesSearch.index })
              })

              it('works', async() => {
                const search = new ThronesSearch()
                search.queries.bio
                  .match("foo", { boost: 5 })
                  .or.match("bar")
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([3, 1, 2])
              })
            })

            describe('or clause', () => {
              it('works', async() => {
                const search = new ThronesSearch()
                search.queries.bio
                  .match("foo")
                  .or.match("bar", { boost: 5 })
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([2, 1])
              })
            })

            describe('and clause', () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 3,
                    bio: "foo bar",
                  },
                })
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 4,
                    bio: "foo bar bar bar bar bar",
                  },
                })

                await ThronesSearch.client.indices.refresh({ index: ThronesSearch.index })
              })

              it('works', async() => {
                const search = new ThronesSearch()
                search.queries.bio
                  .match("foo")
                  .and.match("bar", { boost: 5 })
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([4, 3])
              })
            })
          })

          describe('across conditions', () => {
            describe('vanilla', () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 3,
                    bio: "foo foo foo",
                    quote: "bar",
                  },
                })
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 4,
                    bio: "foo",
                    quote: "bar bar bar",
                  },
                })

                await ThronesSearch.client.indices.refresh({ index: ThronesSearch.index })
              })

              it('works', async() => {
                const search = new ThronesSearch()
                search.queries.bio.match("foo")
                search.queries.quote.match("bar", { boost: 5 })
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([4, 3])
              })
            })

            describe('or clause', () => {
              it('works', async() => {
                const search = new ThronesSearch()
                search.queries.bio
                  .match("foo")
                  .or.quote.match("bar", { boost: 5 })
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([2, 1])
              })
            })

            describe('and clause', () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 3,
                    bio: "foo foo foo",
                    quote: "bar",
                  },
                })
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 4,
                    bio: "foo",
                    quote: "bar bar bar",
                  },
                })

                await ThronesSearch.client.indices.refresh({ index: ThronesSearch.index })
              })

              it('works', async() => {
                const search = new ThronesSearch()
                search.queries.bio
                  .match("foo")
                  .and.quote.match("bar", { boost: 5 })
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([4, 3])
              })
            })
          })
        })

        describe('matchPhrase', () => {
          describe('within condition', () => {
            describe('vanilla', () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 3,
                    bio: "foo foo foo foo foo",
                  },
                })
                await ThronesSearch.client.indices.refresh({ index: ThronesSearch.index })
              })

              it('works', async() => {
                const search = new ThronesSearch()
                search.queries.bio
                  .matchPhrase("foo", { boost: 5 })
                  .or.matchPhrase("bar")
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([3, 1, 2])
              })
            })

            describe('or clause', () => {
              it('works', async() => {
                const search = new ThronesSearch()
                search.queries.bio
                  .matchPhrase("foo")
                  .or.matchPhrase("bar", { boost: 5 })
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([2, 1])
              })
            })

            describe('and clause', () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 3,
                    bio: "foo bar",
                  },
                })
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 4,
                    bio: "foo bar bar bar bar bar",
                  },
                })

                await ThronesSearch.client.indices.refresh({ index: ThronesSearch.index })
              })

              it('works', async() => {
                const search = new ThronesSearch()
                search.queries.bio
                  .matchPhrase("foo")
                  .and.matchPhrase("bar", { boost: 5 })
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([4, 3])
              })
            })
          })

          describe('across conditions', () => {
            describe('vanilla', () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 3,
                    bio: "foo foo foo",
                    quote: "bar",
                  },
                })
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 4,
                    bio: "foo",
                    quote: "bar bar bar",
                  },
                })

                await ThronesSearch.client.indices.refresh({ index: ThronesSearch.index })
              })

              it('works', async() => {
                const search = new ThronesSearch()
                search.queries.bio.matchPhrase("foo")
                search.queries.quote.matchPhrase("bar", { boost: 5 })
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([4, 3])
              })
            })

            describe('or clause', () => {
              it('works', async() => {
                const search = new ThronesSearch()
                search.queries.bio
                  .matchPhrase("foo")
                  .or.quote.matchPhrase("bar", { boost: 5 })
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([2, 1])
              })
            })

            describe('and clause', () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 3,
                    bio: "foo foo foo",
                    quote: "bar",
                  },
                })
                await ThronesSearch.client.index({
                  index: ThronesSearch.index,
                  body: {
                    id: 4,
                    bio: "foo",
                    quote: "bar bar bar",
                  },
                })

                await ThronesSearch.client.indices.refresh({ index: ThronesSearch.index })
              })

              it('works', async() => {
                const search = new ThronesSearch()
                search.queries.bio
                  .matchPhrase("foo")
                  .and.quote.matchPhrase("bar", { boost: 5 })
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([4, 3])
              })
            })
          })
        })
      })
    })
  })
})