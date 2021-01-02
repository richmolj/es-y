import { expect } from "chai"
import { GlobalSearch, ThronesSearch , JustifiedSearch } from "../fixtures"
import { setupIntegrationTest } from "../util"

describe("multi-index integration", () => {
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
          characterAge: {
            type: "integer",
          },
          age: {
            type: "alias",
            path: "characterAge"
          },
          bio: {
            type: "text"
          }
        }
      }
    })
  })

  describe('multi-index aggregations', () => {
    beforeEach(async() => {
      await ThronesSearch.persist({
        id: 1,
        name: "John Doe",
        age: 50
      }, true)

      await JustifiedSearch.persist({
        id: 901,
        name: "John Doe",
        characterAge: 60
      }, true)
    })

    // Note we go through the characterAge/age alias
    describe('via direct assignment', () => {
      it('works', async() => {
        const thrones = new ThronesSearch()
        const justified = new JustifiedSearch()
        const search = new GlobalSearch()
        search.searchInstances = [thrones, justified]
        search.aggs.terms("name", { avg: "age" })
        await search.execute()
        expect(search.aggResults).to.deep.eq({
          name: [
            { key: "John Doe", count: 2, avg_age: 55 }
          ]
        })
      })
    })

    describe('via constructor', () => {
      it('works', async() => {
        const search = new GlobalSearch({
          thrones: {},
          justified: {},
          aggregations: {
            terms: [{
              name: "name",
              avg: "age"
            }]
          }
        })
        await search.execute()
        expect(search.aggResults).to.deep.eq({
          name: [
            { key: "John Doe", count: 2, avg_age: 55 }
          ]
        })
      })
    })

    describe('when splitting', () => {
      describe('via constructor', () => {
        describe('within-search', () => {
          it('works', async () => {
            const search = new GlobalSearch({
              split: 2,
              thrones: {
                aggregations: {
                  terms: [{
                    name: "name",
                    avg: "age"
                  }]
                },
              },
              justified: {
                aggregations: {
                  terms: [{
                    name: "name",
                    avg: "age"
                  }]
                },
              },
            })
            await search.execute()
            expect(search.aggResults).to.deep.eq({
              thrones: {
                name: [
                  { key: "John Doe", count: 1, avg_age: 50 }
                ]
              },
              justified: {
                name: [
                  { key: "John Doe", count: 1, avg_age: 60 }
                ]
              }
            })
          })
        })

        describe('cross-search', () => {
          it('works', async () => {
            const search = new GlobalSearch({
              split: 2,
              thrones: {},
              justified: {},
              aggregations: {
                terms: [{
                  name: "name",
                  avg: "age"
                }]
              },
            })
            await search.execute()
            expect(search.aggResults).to.deep.eq({
              thrones: {
                name: [
                  { key: "John Doe", count: 1, avg_age: 50 }
                ]
              },
              justified: {
                name: [
                  { key: "John Doe", count: 1, avg_age: 60 }
                ]
              }
            })
          })
        })
      })

      describe('via direct assignment', () => {
        describe('within search', () => {
          it('works', async() => {
            const thrones = new ThronesSearch()
            thrones.aggs.terms("name", { avg: "age" })
            const justified = new JustifiedSearch()
            justified.aggs.terms("name", { avg: "age" })
            const search = new GlobalSearch()
            search.split(2)
            search.searchInstances = [thrones, justified]
            await search.execute()
            expect(search.aggResults).to.deep.eq({
              thrones: {
                name: [
                  { key: "John Doe", count: 1, avg_age: 50 }
                ]
              },
              justified: {
                name: [
                  { key: "John Doe", count: 1, avg_age: 60 }
                ]
              }
            })
          })
        })

        describe('cross-search', () => {
          it('works', async() => {
            const thrones = new ThronesSearch()
            const justified = new JustifiedSearch()
            const search = new GlobalSearch()
            search.split(2)
            search.searchInstances = [thrones, justified]
            search.aggs.terms("name", { avg: "age" })
            await search.execute()
            expect(search.aggResults).to.deep.eq({
              thrones: {
                name: [
                  { key: "John Doe", count: 1, avg_age: 50 }
                ]
              },
              justified: {
                name: [
                  { key: "John Doe", count: 1, avg_age: 60 }
                ]
              }
            })
          })
        })
      })
    })
  })

  describe('multi-index queries', () => {
    beforeEach(async () => {
      await ThronesSearch.persist({
        id: 1,
        title: "Mother of Dragons",
        rating: 250
      })
      await ThronesSearch.persist({
        id: 2,
        title: "Warden of the North",
        rating: 500
      })

      await JustifiedSearch.persist({
        id: 901,
        name: "Boyd Crowder",
        rating: 250
      })
      await JustifiedSearch.persist({
        id: 902,
        name: "Raylan Givens",
        rating: 500
      })
      await ThronesSearch.refresh()
      await JustifiedSearch.refresh()
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
          await ThronesSearch.persist({
            id: 3,
            title: "Warden of the North",
            rating: 600
          }, true)
          await JustifiedSearch.persist({
            id: 903,
            name: "Boyd Crowder",
            rating: 600
          }, true)
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

        // In this case, thrones is correctly sorted
        // Justified ignores the sort
        describe('when an unmapped attribute', () => {
          it('can pass unmappedType', async() => {
            const search = new GlobalSearch({
              thrones: {},
              justified: {},
              sort: [{ att: "title", dir: "desc", unmappedType: 'keyword' }]
            })
            await search.execute()
            expect(search.results.map((r) => r.id)).to.deep.eq([ 2, 1, 901, 902 ])
          })
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

      // TODO documentation: only applies when splitting
      describe('within a search', () => {
        describe('via constructor', () => {
          it('works', async() => {
            const search = new GlobalSearch({
              thrones: {
                sort: [{ att: 'id', dir: 'desc' }]
              },
              justified: {},
              split: 2
            })
            await search.execute()
            expect(search.results.map((r) => r.id)).to.deep.eq([ 2, 1, 901, 902 ])
          })
        })

        describe('via direct assignment', () => {
          it('works', async() => {
            const thrones = new ThronesSearch()
            thrones.sort = [{ att: "id", dir: "desc" }]
            const justified = new JustifiedSearch()
            const search = new GlobalSearch()
            search.searchInstances = [thrones, justified]
            search.split(2)
            await search.execute()
            expect(search.results.map((r) => r.id)).to.deep.eq([ 2, 1, 901, 902 ])
          })
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

          // TODO: resultMetadata needs to be runtime option
          // Pass this option when splitting, equal to MultiSearch equivalent
          // MultiSearch should "win", individual searches irrelevant
          describe('when resultMetadata is requested', () => {
            beforeEach(() => {
              GlobalSearch.resultMetadata = true
            })

            afterEach(() => {
              GlobalSearch.resultMetadata = false
            })

            describe('when not splitting', () => {
              it('preserves metadata', async () => {
                const search = new GlobalSearch({
                  thrones: {},
                  justified: {}
                })
                await search.execute()
                expect(search.results[0]._meta._score).to.eq(1)
                expect(search.results[1]._meta._score).to.eq(1)
              })
            })

            describe('when splitting', () => {
              it('preserves metadata', async () => {
                const search = new GlobalSearch({
                  split: 1,
                  thrones: {},
                  justified: {}
                })
                await search.execute()
                expect(search.results[0]._meta._score).to.eq(1)
                expect(search.results[1]._meta._score).to.eq(1)
              })
            })
          })
        })

        describe('multiple', () => {
          let originalThrones: any
          let originalJustified: any
          beforeEach(() => {
            originalThrones = (ThronesSearch.prototype as any).transformResults
            originalJustified = (JustifiedSearch.prototype as any).transformResults
            ;(ThronesSearch.prototype as any).transformResults = (results: any) => {
              return results.map((r: any) => {
                return { new: 'thrones results' }
              })
            }
            ;(JustifiedSearch.prototype as any).transformResults = (results: any, rawResults: any) => {
              return results.map((r: any) => {
                return { new: 'justified results', rawIndex: rawResults[0]._index }
              })
            }
          })

          afterEach(() => {
            ;(ThronesSearch.prototype as any).transformResults = originalThrones
            ;(JustifiedSearch.prototype as any).transformResults = originalJustified
          })

          it('works, and has access to raw ES results', async() => {
            const search = new GlobalSearch({
              thrones: {},
              justified: {}
            })
            await search.execute()
            expect(search.results[0].new).to.eq('thrones results')
            expect(search.results[2].new).to.eq('justified results')
            expect(search.results[2].rawIndex).to.eq('justified')
          })

          describe('when resultMetadata is requested', () => {
            beforeEach(() => {
              GlobalSearch.resultMetadata = true
            })

            afterEach(() => {
              GlobalSearch.resultMetadata = false
            })

            describe('when not splitting', () => {
              it('preserves metadata', async () => {
                const search = new GlobalSearch({
                  thrones: {},
                  justified: {}
                })
                await search.execute()
                expect(search.results[0]._meta._score).to.eq(1)
                expect(search.results[1]._meta._score).to.eq(1)
              })
            })

            describe('when splitting', () => {
              it('preserves metadata', async () => {
                const search = new GlobalSearch({
                  split: 1,
                  thrones: {},
                  justified: {}
                })
                await search.execute()
                expect(search.results[0]._meta._score).to.eq(1)
                expect(search.results[1]._meta._score).to.eq(1)
              })
            })
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

          describe('when resultMetadata is requested', () => {
            beforeEach(() => {
              GlobalSearch.resultMetadata = true
            })

            afterEach(() => {
              GlobalSearch.resultMetadata = false
            })

            describe('when not splitting', () => {
              it('preserves metadata', async () => {
                const search = new GlobalSearch({
                  thrones: {},
                  justified: {}
                })
                await search.execute()
                expect(search.results[0]._meta._score).to.eq(1)
                expect(search.results[1]._meta._score).to.eq(1)
              })
            })

            describe('when splitting', () => {
              it('preserves metadata', async () => {
                const search = new GlobalSearch({
                  split: 1,
                  thrones: {},
                  justified: {}
                })
                await search.execute()
                expect(search.results[0]._meta._score).to.eq(1)
                expect(search.results[1]._meta._score).to.eq(1)
              })
            })
          })
        })

        describe('multiple', () => {
          class SubGlobalSearch extends GlobalSearch {
            async transformResults(results: any) {
              await super.transformResults(results)
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

  describe('highlighting', () => {
    beforeEach(async() => {
      await ThronesSearch.persist({
        id: 1,
        bio: "this is a thrones foo bar bio"
      }, true)
      await JustifiedSearch.persist({
        id: 1,
        bio: "this is a justified foo bar bio"
      }, true)
    })

    // TODO: tests for transforms (not doing now bc same as metadata)
    // TODO DOCUMENT: cannot highlight individual search, must be cross when NOT splitting
    describe('when not splitting', () => {
      describe('via direct assignment', () => {
        it('works', async() => {
          const thrones = new ThronesSearch()
          thrones.queries.keywords.eq("foo")
          const justified = new JustifiedSearch()
          justified.queries.keywords.eq("foo")
          const search = new GlobalSearch()
          search.searchInstances = [thrones, justified]
          search.highlight("bio")
          await search.execute()
          expect(search.results[0]._highlights).to.deep.eq({
            bio: ["this is a thrones <em>foo</em> bar bio"]
          })
          expect(search.results[1]._highlights).to.deep.eq({
            bio: ["this is a justified <em>foo</em> bar bio"]
          })
        })

        describe('when nested field', () => {
          beforeEach(async() => {
            await ThronesSearch.persist({
              bio: 'blah',
              skills: [
                { description: "foo bar baz" }
              ]
            }, true)
          })

          it('works', async() => {
            const thrones = new ThronesSearch()
            thrones.queries.skills.keywords.eq("foo")
            thrones.highlight("skills.description")
            const search = new GlobalSearch()
            search.searchInstances = [thrones]
            await search.execute()
            expect(search.results[0]).to.deep.eq({
              _type: 'thrones',
              bio: 'blah',
              skills: [{
                description: 'foo bar baz',
                _highlights: {
                  description: ["<em>foo</em> bar baz"]
                },
                _meta: {
                  _score: 0.2876821
                }
              }]
            })
          })
        })
      })

      describe('via constructor', () => {
        it('works', async() => {
          const search = new GlobalSearch({
            thrones: {
              queries: { keywords: { eq: "foo" } }
            },
            justified: {
              queries: { keywords: { eq: "foo" } }
            },
            highlights: [{
              name: "bio"
            }]
          })
          await search.execute()
          expect(search.results[0]._highlights).to.deep.eq({
            bio: ["this is a thrones <em>foo</em> bar bio"]
          })
          expect(search.results[1]._highlights).to.deep.eq({
            bio: ["this is a justified <em>foo</em> bar bio"]
          })
        })
      })
    })

    describe('when splitting', () => {
      describe('via direct assignment', () => {
        it('works', async() => {
          const thrones = new ThronesSearch()
          thrones.queries.keywords.eq("foo")
          const justified = new JustifiedSearch()
          justified.queries.keywords.eq("foo")
          const search = new GlobalSearch()
          search.searchInstances = [thrones, justified]
          search.highlight("bio")
          search.split(2)
          await search.execute()
          expect(search.results[0]._highlights).to.deep.eq({
            bio: ["this is a thrones <em>foo</em> bar bio"]
          })
          expect(search.results[1]._highlights).to.deep.eq({
            bio: ["this is a justified <em>foo</em> bar bio"]
          })
        })
      })

      describe('via constructor', () => {
        it('works', async() => {
          const search = new GlobalSearch({
            thrones: {
              queries: { keywords: { eq: "foo" } }
            },
            justified: {
              queries: { keywords: { eq: "foo" } }
            },
            highlights: [{
              name: "bio"
            }],
            split: 2
          })
          await search.execute()
          expect(search.results[0]._highlights).to.deep.eq({
            bio: ["this is a thrones <em>foo</em> bar bio"]
          })
          expect(search.results[1]._highlights).to.deep.eq({
            bio: ["this is a justified <em>foo</em> bar bio"]
          })
        })
      })

      describe('and highlighting search-specific', () => {
        describe('via direct assignment', () => {
          it('works', async() => {
            const thrones = new ThronesSearch()
            thrones.queries.keywords.eq("foo")
            const justified = new JustifiedSearch()
            justified.queries.keywords.eq("foo")
            justified.highlight("bio")
            const search = new GlobalSearch()
            search.searchInstances = [thrones, justified]
            search.split(2)
            await search.execute()
            expect(search.results[0]._highlights).to.eq(undefined)
            expect(search.results[1]._highlights).to.deep.eq({
              bio: ["this is a justified <em>foo</em> bar bio"]
            })
          })
        })

        describe('via constructor', () => {
          it('works', async() => {
            const search = new GlobalSearch({
              split: 2,
              thrones: {
                queries: { keywords: { eq: "foo" } }
              },
              justified: {
                queries: { keywords: { eq: "foo" } },
                highlights: [{
                  name: "bio"
                }]
              }
            })
            await search.execute()
            expect(search.results[0]._highlights).to.eq(undefined)
            expect(search.results[1]._highlights).to.deep.eq({
              bio: ["this is a justified <em>foo</em> bar bio"]
            })
          })
        })
      })
    })
  })
})