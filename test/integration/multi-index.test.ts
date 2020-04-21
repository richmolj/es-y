import { expect } from "chai"
import { GlobalSearch, ThronesSearch , JustifiedSearch } from "../fixtures"
import { setupIntegrationTest } from "../util"

// 10 promises appoach
// Expose resultMetadata at runtime with GQL so we can see scores (and transformResult API)
//
// regex - isMatch method?
//
// -- GQL combo conditions -- if applicable
//
// Field Boosting
// Verify Aggs
//
//
// Common "keywords" filter and query in GQL - must improve gql type
//
// Runtime transformers
// Override the result index NORMALLY so no regex needed (maybe _klassIndex)
//
// ensure keywords condition is gql gen'd correctly
// also queries, etc

describe("integration", () => {
  setupIntegrationTest()

  afterEach(async () => {
    await JustifiedSearch.client.indices.delete({ index: JustifiedSearch.index })
  })

  beforeEach(async () => {
    await JustifiedSearch.client.indices.create({ index: JustifiedSearch.index })
    await JustifiedSearch.client.indices.putMapping({
      index: JustifiedSearch.index,
      body: {
        properties: {
          name: {
            type: "keyword",
          },
          rating: {
            type: "integer",
          },
        }
      }
    })
  })

  describe('multi-index queries', () => {
    beforeEach(async () => {
      await ThronesSearch.client.index({
        index: ThronesSearch.index,
        body: {
          id: 1,
          title: "Mother of Dragons",
          rating: 250
        },
      })
      await ThronesSearch.client.index({
        index: ThronesSearch.index,
        body: {
          id: 2,
          title: "Warden of the North",
          rating: 500
        },
      })

      await JustifiedSearch.client.index({
        index: JustifiedSearch.index,
        body: {
          id: 901,
          name: "Boyd Crowder",
          rating: 250
        },
      })
      await JustifiedSearch.client.index({
        index: JustifiedSearch.index,
        body: {
          id: 902,
          name: "Raylan Givens",
          rating: 500
        },
      })
      await ThronesSearch.client.indices.refresh({ index: ThronesSearch.index })
      await JustifiedSearch.client.indices.refresh({ index: JustifiedSearch.index })
    })

    describe('via constructor', async() => {
      it('works', async() => {
        const search = new GlobalSearch({
          thrones: {
            queries: {
              title: {
                eq: "Warden of the North"
              }
            }
          },
          justified: {
            queries: {
              name: {
                eq: "Boyd Crowder"
              }
            }
          }
        })
        await search.execute()
        expect(search.results.map((r) => r.id)).to.deep.eq([2, 901])
      })

      it('adds _type to the result object', async() => {
        const search = new GlobalSearch({
          thrones: {
          },
          justified: {
          }
        })
        await search.execute()
        expect(search.results.map((r) => r._type)).to.deep.eq([
          'thrones',
          'thrones',
          'justified',
          'justified',
        ])
      })

      describe('when boosting one index over the other', () => {
        it('works', async() => {
          const search = new GlobalSearch({
            thrones: {
            },
            justified: {
              boost: 2
            }
          })
          await search.execute()
          expect(search.results.map((r) => r._type)).to.deep.eq([
            'justified',
            'justified',
            'thrones',
            'thrones',
          ])
        })
      })

      describe('and also passing conditions that apply to both', () => {
        beforeEach(async() => {
          await ThronesSearch.client.index({
            index: ThronesSearch.index,
            body: {
              id: 3,
              title: "Warden of the North",
              rating: 600
            },
          })
          await JustifiedSearch.client.index({
            index: JustifiedSearch.index,
            body: {
              id: 903,
              name: "Boyd Crowder",
              rating: 600
            },
          })
          await ThronesSearch.client.indices.refresh({ index: ThronesSearch.index })
          await JustifiedSearch.client.indices.refresh({ index: JustifiedSearch.index })
        })

        it('works', async() => {
          const search = new GlobalSearch({
            queries: {
              rating: {
                eq: 600
              }
            },
            thrones: {
              queries: {
                title: {
                  eq: "Warden of the North"
                }
              }
            },
            justified: {
              queries: {
                name: {
                  eq: "Boyd Crowder"
                }
              }
            }
          })
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([3, 903])
        })

        describe('and a subquery has the same clause as global', () => {
          it('has the subquery trump the global query', async() => {
            const search = new GlobalSearch({
              queries: {
                rating: {
                  eq: 600
                }
              },
              thrones: {
                queries: {
                  title: {
                    eq: "Warden of the North"
                  },
                  rating: {
                    eq: 500
                  }
                }
              },
              justified: {
                queries: {
                  name: {
                    eq: "Boyd Crowder"
                  }
                }
              }
            })
            await search.execute()
            expect(search.results.map((r) => r.id)).to.deep.eq([2, 903])
          })
        })

        describe('and no subqueries', () => {
          it('works', async() => {
            const search = new GlobalSearch({
              queries: {
                rating: {
                  eq: 600
                }
              },
              thrones: {
              },
              justified: {
              }
            })
            await search.execute()
            expect(search.results.map((r) => r.id)).to.deep.eq([3, 903])
          })
        })
      })
    })

    describe('via direct assignment', () => {
      it('works', async() => {
        const thrones = new ThronesSearch()
        const justified = new JustifiedSearch()
        thrones.queries.title.eq("Warden of the North")
        justified.queries.name.eq("Boyd Crowder")
        const search = new GlobalSearch()
        search.searchInstances = [thrones, justified]
        await search.execute()
        expect(search.results.map((r) => r.id)).to.deep.eq([2, 901])
      })
    })

    describe('sorting', () => {
      describe('via constructor', () => {
        it('works', async() => {
          const search = new GlobalSearch({
            thrones: {},
            justified: {},
            sort: [{ att: "id", dir: "desc" }]
          })
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([ 902, 901, 2, 1 ])
        })
      })

      describe('via direct assignment', () => {
        it('works', async() => {
          const thrones = new ThronesSearch()
          const justified = new JustifiedSearch()
          const search = new GlobalSearch()
          search.searchInstances = [thrones, justified]
          search.sort = [{ att: "id", dir: "desc" }]
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([902, 901, 2, 1])
        })
      })
    })

    describe('pagination', () => {
      describe('via constructor', () => {
        it('works', async() => {
          const search = new GlobalSearch({
            thrones: {},
            justified: {},
            page: { size: 2, number: 2 }
          })
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([901, 902])
        })
      })

      describe('via direct assignment', () => {
        it('works', async() => {
          const thrones = new ThronesSearch()
          const justified = new JustifiedSearch()
          const search = new GlobalSearch()
          search.searchInstances = [thrones, justified]
          search.page = { size: 2, number: 2}
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([901, 902])
        })
      })
    })

    describe('total count', () => {
      it('works', async() => {
        const search = new GlobalSearch({
          thrones: {},
          justified: {}
        })
        await search.execute()
        expect(search.total).to.eq(4)
      })
    })

    describe('results', () => {
      describe('honoring per-search result transformation', () => {
        describe('single', () => {
          let originalThrones: any
          let originalJustified: any
          beforeEach(() => {
            originalThrones = (ThronesSearch.prototype as any).transformResult
            originalJustified = (JustifiedSearch.prototype as any).transformResult
            ;(ThronesSearch.prototype as any).transformResult = (result: any) => {
              return {
                transformedTitle: `- ${result.title} -`,
              }
            }
            ;(JustifiedSearch.prototype as any).transformResult = (result: any) => {
              return {
                transformedName: `- ${result.name} -`,
              }
            }
          })

          afterEach(() => {
            ;(ThronesSearch.prototype as any).transformResult = originalThrones
            ;(JustifiedSearch.prototype as any).transformResult = originalJustified
          })

          it('works', async() => {
            const search = new GlobalSearch({
              thrones: {},
              justified: {}
            })
            await search.execute()
            expect(search.results[0].transformedTitle).to.eq('- Mother of Dragons -')
            expect(search.results[1].transformedTitle).to.eq('- Warden of the North -')
            expect(search.results[2].transformedName).to.eq('- Boyd Crowder -')
            expect(search.results[3].transformedName).to.eq('- Raylan Givens -')
          })
        })

        describe('multiple', () => {
          let originalThrones: any
          let originalJustified: any
          beforeEach(() => {
            originalThrones = (ThronesSearch.prototype as any).transformResults
            originalJustified = (JustifiedSearch.prototype as any).transformResults
            ;(ThronesSearch.prototype as any).transformResults = (result: any) => {
              return [{ new: 'thrones results' }]
            }
            ;(JustifiedSearch.prototype as any).transformResults = (result: any) => {
              return [{ new: 'justified results' }]
            }
          })

          afterEach(() => {
            ;(ThronesSearch.prototype as any).transformResults = originalThrones
            ;(JustifiedSearch.prototype as any).transformResults = originalJustified
          })

          it('works', async() => {
            const search = new GlobalSearch({
              thrones: {},
              justified: {}
            })
            await search.execute()
            expect(search.results[0].new).to.eq('thrones results')
            expect(search.results[1].new).to.eq('justified results')
          })
        })
      })

      describe('honoring its own result transformation', () => {
        describe('single', () => {
          let original: any

          beforeEach(() => {
            original = (GlobalSearch.prototype as any).transformResult
            ;(GlobalSearch.prototype as any).transformResult = (result: any) => {
              return { transformed: result.title || result.name }
            }
          })

          afterEach(() => {
            ;(GlobalSearch.prototype as any).transformResult = original
          })

          it('works', async() => {
            const search = new GlobalSearch({
              thrones: {},
              justified: {}
            })
            await search.execute()
            expect(search.results.map(r => r.transformed)).to.deep.eq([
              'Mother of Dragons',
              'Warden of the North',
              'Boyd Crowder',
              'Raylan Givens'
            ])
          })
        })

        describe('multiple', () => {
          class SubGlobalSearch extends GlobalSearch {
            transformResults(results: any) {
              super.transformResults(results)
              return [{ new: `results ${results.length}` }]
            }
          }

          it('works', async() => {
            const search = new SubGlobalSearch({
              thrones: {},
              justified: {}
            })
            await search.execute()
            expect(search.results).to.deep.eq([{ new: 'results 4' }])
          })
        })
      })
    })

    describe('when spitting queries', () => {
      describe('via constructor', () => {
        it('fires a separate query for each search', async () => {
          const search = new GlobalSearch({
            split: 5,
            thrones: {},
            justified: {}
          })
          await search.execute()
          expect(search.results).to.deep.eq([
            { id: 1, title: 'Mother of Dragons', rating: 250, _type: 'thrones' },
            { id: 2, title: 'Warden of the North', rating: 500, _type: 'thrones' },
            { id: 901, name: 'Boyd Crowder', rating: 250, _type: 'justified' },
            { id: 902, name: 'Raylan Givens', rating: 500, _type: 'justified' },
          ])
        })
      })

      describe('via direct assignment', () => {
        it('fires a separate query for each search', async () => {
          const search = new GlobalSearch({
            thrones: {},
            justified: {}
          })
          search.split()
          await search.execute()
          expect(search.results).to.deep.eq([
            { id: 1, title: 'Mother of Dragons', rating: 250, _type: 'thrones' },
            { id: 2, title: 'Warden of the North', rating: 500, _type: 'thrones' },
            { id: 901, name: 'Boyd Crowder', rating: 250, _type: 'justified' },
            { id: 902, name: 'Raylan Givens', rating: 500, _type: 'justified' },
          ])
        })
      })

      describe('splitting with max results per type', () => {
        it('honors the max', async() => {
          const search = new GlobalSearch({
            split: 1,
            thrones: {},
            justified: {}
          })
          await search.execute()
          expect(search.results).to.deep.eq([
            { id: 1, title: 'Mother of Dragons', rating: 250, _type: 'thrones' },
            { id: 901, name: 'Boyd Crowder', rating: 250, _type: 'justified' },
          ])
        })
      })
    })
  })
})