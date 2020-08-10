import { expect } from "chai"
import { ThronesSearch, ThronesSearchConditions } from "../fixtures"
import { setupIntegrationTest } from '../util'

// TODO Document: bio.match('foo').or.skills(...) NOT skills.or

describe("integration", () => {
  setupIntegrationTest()

  describe("nested queries", () => {
    beforeEach(async () => {
      await ThronesSearch.persist({
        id: 1,
        bio: "foo",
        skills: [
          {
            name: 'knives',
            description: 'very good at knive throwing, knife stabbing, and general cutlery'
          }
        ]
      }, true)

      await ThronesSearch.persist({
        id: 2,
        bio: "bar",
        skills: [
          {
            name: 'baking',
            description: 'very good at baking the breads, the cakes, and such and such'
          }
        ]
      }, true)

      await ThronesSearch.persist({
        id: 3,
        bio: "foo",
        skills: [
          {
            name: 'other',
            description: 'other'
          },
          {
            name: 'baking',
            description: 'baking baking baking baking baking baking baking baking allthetime',
          },
          {
            note: "bakers gonna be baking"
          }
        ]
      }, true)
    })

    describe('nested keyword functionality', () => {
      describe('basic', () => {
        describe('via direct assignment', () => {
          it('works', async () => {
            const search = new ThronesSearch()
            search.queries.skills.keywords.eq("baking", { fields: ['skills.description']})
            await search.execute()
            expect(search.results.map((r) => r.id)).to.deep.eq([3, 2])
          })

          it('can combine with non-nested conditions', async () => {
            const search = new ThronesSearch()
            search.queries.keywords.eq("foo")
            search.queries.skills.keywords.eq("baking")
            await search.execute()
            expect(search.results.map((r) => r.id)).to.deep.eq([3])
          })

          it('can query alongside filters', async () => {
            const search = new ThronesSearch()
            search.filters.bio.match("foo")
            search.queries.skills.keywords.eq("baking")
            await search.execute()
            expect(search.results.map((r) => r.id)).to.deep.eq([3, 1])
          })

          it('can fully query underlying fields', async () => {
            const search = new ThronesSearch()
            search.filters.skills.not.description.match("cakes")
            search.queries.skills.or.name.eq("knives")
            search.queries.skills.description.match("baking")
            await search.execute()
            expect(search.results.map((r) => r.id)).to.deep.eq([3, 1])
          })

          describe('complex nesting', () => {
            describe('top-level OR', () => {
              describe('via direct assignment', () => {
                it('works', async() => {
                  const search = new ThronesSearch()
                  search.queries.keywords.eq("foo")
                  search.queries.or.skills.keywords.eq("baking")
                  await search.execute()
                  expect(search.results.map((r) => r.id)).to.deep.eq([3, 2, 1])
                })
              })

              describe('via constructor', () => {
                it('works', async() => {
                  const search = new ThronesSearch({
                    queries: {
                      keywords: {
                        eq: 'foo'
                      },
                      or: {
                        skills: {
                          keywords: {
                            eq: 'baking'
                          }
                        }
                      }
                    }
                  })
                  await search.execute()
                  expect(search.results.map((r) => r.id)).to.deep.eq([3, 2, 1])
                })
              })
            })

            describe('top-level AND', () => {
              describe('via direct assignment', () => {
                it('works', async() => {
                  const search = new ThronesSearch()
                  search.queries.keywords.eq("foo")
                  search.queries.skills.keywords.eq("baking")
                  await search.execute()
                  expect(search.results.map((r) => r.id)).to.deep.eq([3])
                })
              })

              describe('via constructor', () => {
                it('works', async() => {
                  const search = new ThronesSearch({
                    queries: {
                      keywords: {
                        eq: 'foo'
                      },
                      skills: {
                        keywords: {
                          eq: 'baking'
                        }
                      }
                    }
                  })
                  await search.execute()
                  expect(search.results.map((r) => r.id)).to.deep.eq([3])
                })
              })
            })

            describe('top-level NOT', () => {
              describe('via direct assignment', () => {
                it('works', async() => {
                  const search = new ThronesSearch()
                  search.queries.keywords.eq("foo")
                  search.queries.not.skills.keywords.eq("knives")
                  await search.execute()
                  expect(search.results.map((r) => r.id)).to.deep.eq([3])
                })
              })

              describe('via constructor', () => {
                it('works', async() => {
                  const search = new ThronesSearch({
                    queries: {
                      keywords: {
                        eq: 'foo'
                      },
                      not: {
                        skills: {
                          keywords: {
                            eq: 'knives'
                          }
                        }
                      }
                    }
                  })
                  await search.execute()
                  expect(search.results.map((r) => r.id)).to.deep.eq([3])
                })
              })
            })

            // TODO keywords in general cant or/and
            // TODO OR NOT
            describe('OR within condition', () => {
              // DOCUMENT NOT SUPPORTED: youre within skills now
              // describe('when nesting is before')
              // })

              describe('via direct assignment', () => {
                it('works', async() => {
                  const search = new ThronesSearch()
                  search.queries.bio.match("bar")
                    .or.skills.keywords.eq('knives')
                  await search.execute()
                  expect(search.results.map((r) => r.id)).to.deep.eq([1, 2])
                })
              })

              describe('via constructor', () => {
                it('works', async() => {
                  const search = new ThronesSearch({
                    queries: {
                      bio: {
                        match: 'bar',
                        or: {
                          skills: {
                            keywords: {
                              eq: 'knives'
                            }
                          }
                        }
                      }
                    }
                  })
                  await search.execute()
                  expect(search.results.map((r) => r.id)).to.deep.eq([1, 2])
                })
              })
            })

            describe('AND within condition', () => {
              describe('via direct assignment', () => {
                it('works', async() => {
                  const search = new ThronesSearch()
                  search.queries.bio.match("foo")
                    .and.skills.keywords.eq('knives')
                  await search.execute()
                  expect(search.results.map((r) => r.id)).to.deep.eq([1])
                })
              })

              describe('via constructor', () => {
                it('works', async() => {
                  const search = new ThronesSearch({
                    queries: {
                      bio: {
                        match: 'foo',
                        and: {
                          skills: {
                            keywords: {
                              eq: 'knives'
                            }
                          }
                        }
                      }
                    }
                  })
                  await search.execute()
                  expect(search.results.map((r) => r.id)).to.deep.eq([1])
                })
              })
            })

            describe('OR NOT within condition', () => {
              describe('via direct assignment', () => {
                it('works', async() => {
                  const search = new ThronesSearch()
                  search.queries.bio.match("foo")
                    .and.skills.name.not.eq('knives')
                  await search.execute()
                  expect(search.results.map((r) => r.id)).to.deep.eq([3])
                })
              })

              describe('via constructor', () => {
                it('works', async() => {
                  const search = new ThronesSearch({
                    queries: {
                      bio: {
                        match: 'foo',
                        and: {
                          skills: {
                            name: {
                              not: {
                                eq: 'knives'
                              }
                            }
                          }
                        }
                      }
                    }
                  })
                  await search.execute()
                  expect(search.results.map((r) => r.id)).to.deep.eq([3])
                })
              })
            })
          })
        })

        describe('via constructor', () => {
          it('works', async() => {
            const search = new ThronesSearch({
              queries: {
                skills: {
                  keywords: {
                    eq: "baking",
                    fields: ['skills.description']
                  }
                }
              }
            })
            await search.execute()
            expect(search.results.map((r) => r.id)).to.deep.eq([3, 2])
          })
        })
      })

      describe('scoreMode', () => {
        describe('via direct assignment', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.skills.scoreMode('sum')
            search.queries.skills.keywords.eq('foo')
            await search.execute()
            let { nested } = search.lastQuery.body.query.bool.should[0].bool.must[0]
            expect(nested.score_mode).to.eq('sum')
          })
        })

        describe('via constructor', () => {
          it('works', async() => {
            const search = new ThronesSearch({
              queries: {
                skills: {
                  scoreMode: 'sum',
                  keywords: { eq: 'foo' }
                }
              }
            })
            await search.execute()
            let { nested } = search.lastQuery.body.query.bool.should[0].bool.must[0]
            expect(nested.score_mode).to.eq('sum')
          })
        })
      })

      // TodoTest: Highlight nested via condition name
      // TODO: when specifying keyword fields (+others?) only description not skills.description
      // TODO: multi-level nesting
      describe('highlighting', () => {
        it('works, putting highlights on nested objects', async() => {
          const search = new ThronesSearch()
          search.queries.bio.not.match("bar")
          search.queries.skills.keywords.eq("baking")
          search.highlight('skills.description', { fragment_size: 10, number_of_fragments: 1 })
          search.highlight('skills.note')
          await search.execute()
          expect(search.results[0]._highlights).to.eq(undefined)
          expect(search.results[0].skills[0]._highlights).to.eq(undefined)
          expect(search.results[0].skills[1]._highlights).to.deep.eq({
            description: [
              "<em>baking</em> <em>baking</em>",
            ],
          })
          expect(search.results[0].skills[2]._highlights).to.deep.eq({
            note: [
              "bakers gonna be <em>baking</em>"
            ]
          })
        })

        it('adds meta/score to nested results', async () => {
          const search = new ThronesSearch()
          search.queries.skills.keywords.eq('baking')
          search.highlight('skills.description')
          await search.execute()
          expect(search.results[0].skills[0]._meta).to.deep.eq({
            _score: 1.26859
          })
        })

        it('does not request highlights for top level', async () => {
          const search = new ThronesSearch()
          search.queries.skills.keywords.eq('baking')
          search.highlight('skills.description')
          await search.execute()
          expect(search.results.map((r) => r._highlights))
            .to.deep.eq([undefined, undefined])
          expect(search.lastQuery.body.highlight).to.eq(undefined)
        })

        describe('when highlighting a dotted but non-nested field', () => {
          beforeEach(async() => {
            await ThronesSearch.persist({
              id: 2,
              'something.dotted': 'dotted foo'
            }, true)
          })

          it('does not incorrectly apply', async() => {
            const search = new ThronesSearch()
            search.queries.keywords.eq('dotted')
            search.highlight('something.dotted')
            await search.execute()
            expect(search.results).to.deep.eq([
              {
                id: 2,
                'something.dotted': 'dotted foo',
                _highlights: {
                  'something.dotted': [
                    '<em>dotted</em> foo'
                  ]
                }
              }
            ])
          })
        })

        describe('when nested field is object, not array', () => {
          beforeEach(async() => {
            await ThronesSearch.persist({
              id: 333,
              skills: {
                description: "you findme must"
              }
            }, true)
          })

          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.skills.keywords.eq('findme')
            search.highlight('skills.description')
            await search.execute()
            expect(search.results).to.deep.eq([
              {
                id: 333,
                skills: {
                  description: "you findme must",
                  _highlights: {
                    description: ['you <em>findme</em> must']
                  },
                  _meta: {
                    _score: 1.8092318
                  }
                }
              }
            ])
          })
        })

        describe('when single result transform', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let original: any
          beforeEach(() => {
            original = (ThronesSearch.prototype as any).transformResult
            ;(ThronesSearch.prototype as any).transformResult = (result: any) => {
              return {
                alteredBio: result.bio,
                alteredSkills: result.skills
              }
            }
          })

          afterEach(() => {
            ;(ThronesSearch.prototype as any).transformResult = original
          })

          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.skills.keywords.eq('baking')
            search.highlight('skills.description')
            await search.execute()
            expect(search.results[0]).to.deep.eq({
              alteredBio: "bar",
              alteredSkills: [
                {
                  name: "baking",
                  description: "very good at baking the breads, the cakes, and such and such",
                }
              ]
            })
          })
        })

        describe('when multi-result transform', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let original: any
          beforeEach(() => {
            original = (ThronesSearch.prototype as any).transformResults
            ;(ThronesSearch.prototype as any).transformResults = (results: any[]) => {
              return results.map((result) => {
                return {
                  alteredBio: result.bio,
                  alteredSkills: result.skills
                }
              })
            }
          })

          afterEach(() => {
            ;(ThronesSearch.prototype as any).transformResults = original
          })

          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.skills.keywords.eq('baking')
            search.highlight('skills.description')
            await search.execute()
            expect(search.results[0]).to.deep.eq({
              alteredBio: "bar",
              alteredSkills: [
                {
                  name: "baking",
                  description: "very good at baking the breads, the cakes, and such and such",
                }
              ]
            })
          })
        })
      })
    })
  })
})