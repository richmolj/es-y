import { config } from "./../../src/util/env"
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/camelcase */
import { expect } from "chai"
import { Search } from "../../src/index"
import { ThronesSearch } from "../fixtures"
import { setupIntegrationTest } from "../util"

const index = ThronesSearch.index

describe("integration", () => {
  describe("conditions", () => {
    setupIntegrationTest()

    beforeEach(async () => {
      await ThronesSearch.client.index({
        index,
        body: {
          id: 1,
          name: "Daenerys Targaryen",
          title: "Queen of Dragons",
          rating: 250,
          age: 13,
          quote: "And I swear this. If you ever betray me, I’ll burn you alive.",
          bio: "The standard dragon queen take over the world shit",
          created_at: "1980-02-26",
          updated_at: "1980-02-27",
        },
      })
      await ThronesSearch.client.index({
        index,
        body: {
          id: 2,
          name: "Ned Stark",
          title: "Warden of the North",
          rating: 500,
          age: 35,
          quote: "Winter is coming.",
          bio: "Does a lot of things, really digs vows and duty and whatnot",
          created_at: "1960-11-14",
          updated_at: "1960-11-15",
        },
      })
      // Seed something that should never come back when conditions applied
      await ThronesSearch.client.index({
        index,
        body: {
          id: 999,
          name: "asdf",
          quote: "asdf",
        },
      })
      await ThronesSearch.client.indices.refresh({ index })
    })

    describe("query type", () => {
      it("works", async () => {
        const search = new ThronesSearch()
        search.keywords.eq("vows")
        await search.query()
        expect(search.results.map(r => r.id)).to.deep.eq([2])
      })
    })

    describe("keyword type", () => {
      describe("basic equality", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.name.eq("Ned Stark")
            await search.query()
            expect(search.results.map(r => r.id)).to.deep.eq([2])
          })

          it("does not match partial strings", async () => {
            const search = new ThronesSearch()
            search.filters.name.eq("Ned")
            await search.query()
            expect(search.results.map(r => r.id)).to.deep.eq([])
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              filters: {
                name: { eq: "Ned Stark" },
              },
            })
            await search.query()
            expect(search.results.map(r => r.id)).to.deep.eq([2])
          })
        })

        // TODO: document that
        // search.filters.foo.eq("a").or.not.eq("b") is not valid even though type is there
        // AND NOT is valid, though (gt 100 and not 500)
        // TODO: "and not"
        describe("NOT", () => {
          describe("when direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.name.not.eq("Ned Stark")
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 999])
            })
          })

          describe("when constructor", () => {
            it("works", async () => {
              const search = new ThronesSearch({
                filters: {
                  name: {
                    not: { eq: "Ned Stark" },
                  },
                },
              })
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 999])
            })
          })

          describe("AND NOT", () => {
            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 222,
                    name: "Ned Stark",
                    title: "other",
                  },
                })
                await ThronesSearch.client.indices.refresh({ index })
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.name.eq("Ned Stark").and.title.not.eq("Warden of the North")
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([222])
                })
              })

              describe("via constructor", () => {
                it("works", async () => {
                  const search = new ThronesSearch({
                    filters: {
                      name: {
                        eq: "Ned Stark",
                        and: {
                          title: {
                            not: {
                              eq: "Warden of the North",
                            },
                          },
                        },
                      },
                    },
                  })
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([222])
                })
              })
            })
          })

          describe("NOT AND", () => {
            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 999,
                    name: "Ned Stark",
                    title: "Warden of the North",
                  },
                })
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 222,
                    name: "Ned Stark",
                    title: "other",
                  },
                })
                await ThronesSearch.client.indices.refresh({ index })
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.title.not.eq("Warden of the North").and.name.eq("Ned Stark")
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([222])
                })
              })

              describe("via constructor", () => {
                it("works", async () => {
                  const search = new ThronesSearch({
                    filters: {
                      title: {
                        not: {
                          eq: "Warden of the North",
                          and: {
                            name: {
                              eq: "Ned Stark",
                            },
                          },
                        },
                      },
                    },
                  })
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([222])
                })
              })
            })
          })

          describe("OR NOT across fields", () => {
            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.name.eq("Daenerys Targaryen").or.title.not.eq("Warden of the North")
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 999])
              })
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    name: {
                      eq: "Daenerys Targaryen",
                      or: {
                        title: {
                          not: {
                            eq: "Warden of the North",
                          },
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 999])
              })
            })
          })

          describe("NOT OR across fields", () => {
            beforeEach(async () => {
              await ThronesSearch.client.index({
                index,
                body: {
                  id: 777,
                  name: "Ned Stark",
                  title: "Other Ned",
                },
              })
              await ThronesSearch.client.indices.refresh({ index })
            })

            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.name.not.eq("Ned Stark").or.title.eq("Other Ned")
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 999, 777])
            })
          })
        })
      })

      describe("AND clause", () => {
        beforeEach(async () => {
          await ThronesSearch.client.index({
            index,
            body: {
              id: 333,
              name: "Ned Stark",
              title: "Other Ned",
            },
          })
          await ThronesSearch.client.indices.refresh({ index })
        })

        // No "across same field" test because doesnt make sense with eq
        describe("across multiple fields", () => {
          describe("by direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.name.eq("Ned Stark").and.title.eq("Other Ned")
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([333])
            })
          })

          describe("by constructor", () => {
            it("works", async () => {
              const search = new ThronesSearch({
                filters: {
                  name: {
                    eq: "Ned Stark",
                    and: {
                      title: { eq: "Other Ned" }
                    },
                  },
                },
              })
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([333])
            })
          })
        })

        describe("AND NOT", () => {
          // No "across same field" test because doesnt make sense with eq

          describe("by direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.name.eq("Ned Stark").and.title.not.eq("Other Ned")
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([2])
            })
          })

          describe("by constructor", () => {
            it("works", async () => {
              const search = new ThronesSearch({
                filters: {
                  name: {
                    eq: "Ned Stark",
                    and: {
                      title: {
                        not: {
                          eq: "Other Ned",
                        },
                      },
                    },
                  },
                },
              })
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([2])
            })
          })
        })
      })

      describe("or clause", () => {
        describe("across same field", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.name.eq("Ned Stark").or.eq("Daenerys Targaryen")
            await search.query()
            expect(search.results.map(r => r.id)).to.have.members([1, 2])
          })

          describe("via constructor", () => {
            it("works", async () => {
              const search = new ThronesSearch({
                filters: {
                  name: {
                    eq: "Ned Stark",
                    or: {
                      eq: "Daenerys Targaryen",
                    },
                  },
                },
              })
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 2])
            })
          })
        })

        describe("across multiple fields", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.name.eq("Ned Stark").or.title.eq("Queen of Dragons")
            await search.query()
            expect(search.results.map(r => r.id)).to.have.members([1, 2])
          })

          describe("via constructor", () => {
            it("works", async () => {
              const search = new ThronesSearch({
                filters: {
                  name: {
                    eq: "Ned Stark",
                    or: {
                      title: {
                        eq: "Queen of Dragons",
                      },
                    },
                  },
                },
              })
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 2])
            })
          })
        })
      })
    })

    describe("text type", () => {
      describe("fuzzy match", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.quote.match("betray")
            await search.query()
            expect(search.results.map(r => r.id)).to.deep.eq([1])
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              filters: {
                quote: { match: "betray" },
              },
            })
            await search.query()
            expect(search.results.map(r => r.id)).to.deep.eq([1])
          })
        })

        describe("NOT", () => {
          describe("when direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.quote.not.match("winter")
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 999])
            })
          })

          describe("when constructor", () => {
            it("works", async () => {
              const search = new ThronesSearch({
                filters: {
                  quote: {
                    not: {
                      match: "winter",
                    },
                  },
                },
              })
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 999])
            })
          })

          describe("AND NOT", () => {
            describe("across same field", () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 222,
                    quote: "Winter is here!",
                  },
                })
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 999,
                    quote: "Winter is coming other text",
                  },
                })
                await ThronesSearch.client.indices.refresh({ index })
              })

              describe("by direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.quote.match("winter").and.not.match("other text")
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([2, 222])
                })
              })

              describe("by constructor", () => {
                it("works", async () => {
                  const search = new ThronesSearch({
                    filters: {
                      quote: {
                        match: "winter",
                        and: {
                          not: {
                            match: "other text",
                          },
                        },
                      },
                    },
                  })
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([2, 222])
                })
              })
            })

            describe("across different fields", () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 999,
                    quote: "Winter is here!",
                    name: "Other Ned",
                  },
                })
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 222,
                    quote: "Winter is here!",
                    name: "Find me!",
                  },
                })
                await ThronesSearch.client.indices.refresh({ index })
              })

              describe("by direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.quote.match("winter").and.name.not.eq("Other Ned")
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([2, 222])
                })
              })

              describe("by constructor", () => {
                it("works", async () => {
                  const search = new ThronesSearch({
                    filters: {
                      quote: {
                        match: "winter",
                        and: {
                          name: {
                            not: {
                              eq: "Other Ned",
                            },
                          },
                        },
                      },
                    },
                  })
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([2, 222])
                })
              })
            })
          })

          describe("NOT AND", () => {
            describe("within same field", () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 999,
                    quote: "winter is here!",
                  },
                })
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 222,
                    quote: "other text",
                  },
                })
                await ThronesSearch.client.indices.refresh({ index })
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.quote.not.match("winter").and.match("other text")
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([222])
                })
              })

              describe("via constructor", () => {
                it("works", async () => {
                  const search = new ThronesSearch({
                    filters: {
                      quote: {
                        not: {
                          match: "winter",
                          and: {
                            match: "other text",
                          },
                        },
                      },
                    },
                  })
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([222])
                })
              })
            })

            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 222,
                    quote: "Something else",
                    name: "Ned Stark",
                  },
                })
                await ThronesSearch.client.indices.refresh({ index })
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.quote.not.match("winter").and.name.eq("Ned Stark")
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([222])
                })
              })

              describe("via constructor", () => {
                it("works", async () => {
                  const search = new ThronesSearch({
                    filters: {
                      quote: {
                        not: {
                          match: "winter",
                          and: {
                            name: {
                              eq: "Ned Stark",
                            },
                          },
                        },
                      },
                    },
                  })
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([222])
                })
              })
            })
          })

          describe("OR NOT across fields", () => {
            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.match("betray").or.bio.not.match("vows")
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 999])
              })
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    quote: {
                      match: "betray",
                      or: {
                        bio: {
                          not: {
                            match: "vows",
                          },
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 999])
              })
            })
          })

          describe("NOT OR across fields", () => {
            beforeEach(async () => {
              await ThronesSearch.client.index({
                index,
                body: {
                  id: 777,
                  quote: "winter",
                  bio: "other bio",
                },
              })
              await ThronesSearch.client.indices.refresh({ index })
            })

            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.not.match("winter").or.bio.match("other bio")
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 999, 777])
              })
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    quote: {
                      not: {
                        match: "winter",
                      },
                      or: {
                        bio: {
                          match: "other bio",
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 999, 777])
              })
            })
          })
        })

        describe("AND clause", () => {
          beforeEach(async () => {
            await ThronesSearch.client.index({
              index,
              body: {
                id: 333,
                name: "Other Ned",
                quote: "winter other text",
              },
            })
            await ThronesSearch.client.indices.refresh({ index })
          })

          // TODO: has problems with additional levels of nesting
          describe("across same field", () => {
            describe("by direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.match("winter").and.match("other text")
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })

            describe("by constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    quote: {
                      match: "winter",
                      and: {
                        match: "other text",
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })
          })

          describe("across different fields", () => {
            describe("by direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.match("winter").and.name.eq("Other Ned")
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })

            describe("by constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    quote: {
                      match: "winter",
                      and: {
                        name: {
                          eq: "Other Ned",
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })
          })
        })

        describe("or clause", () => {
          describe("across same field", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.quote.match("betray").or.match("winter")
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 2])
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    quote: {
                      match: "betray",
                      or: {
                        match: "winter",
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 2])
              })
            })
          })

          describe("across multiple fields", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.quote.match("betray").or.bio.match("vows")
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 2])
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    quote: {
                      match: "betray",
                      or: {
                        bio: {
                          match: "vows",
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 2])
              })
            })
          })
        })
      })

      describe("phrase match", () => {
        beforeEach(async () => {
          // Same phrase in different order
          await ThronesSearch.client.index({
            index,
            body: {
              id: 777,
              quote: "alive burn you",
            },
          })
          await ThronesSearch.client.index({
            index,
            body: {
              id: 888,
              bio: "vow digs",
            },
          })
          await ThronesSearch.client.indices.refresh({ index })
        })

        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.quote.matchPhrase("burn you alive")
            await search.query()
            expect(search.results.map(r => r.id)).to.deep.eq([1])
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              filters: {
                quote: { matchPhrase: "burn you alive" },
              },
            })
            await search.query()
            expect(search.results.map(r => r.id)).to.deep.eq([1])
          })
        })

        describe("AND clause", () => {
          beforeEach(async () => {
            await ThronesSearch.client.index({
              index,
              body: {
                id: 333,
                bio: "Other Dany",
                quote: "burn you alive with my words",
              },
            })
            await ThronesSearch.client.indices.refresh({ index })
          })

          describe("across same field", () => {
            describe("by direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.matchPhrase("burn you alive").and.matchPhrase("with my words")
                await search.query()
                expect(search.results.map(r => r.id)).to.deep.eq([333])
              })
            })

            describe("by constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    quote: {
                      matchPhrase: "burn you alive",
                      and: {
                        matchPhrase: "with my words",
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.deep.eq([333])
              })
            })
          })

          describe("across different fields", () => {
            describe("by constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.matchPhrase("burn you alive").and.bio.matchPhrase("dragon queen")
                await search.query()
                expect(search.results.map(r => r.id)).to.deep.eq([1])
              })
            })

            describe("by direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    quote: {
                      matchPhrase: "burn you alive",
                      and: {
                        bio: {
                          matchPhrase: "dragon queen",
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.deep.eq([1])
              })
            })
          })

          describe("AND NOT", () => {
            describe("across same field", () => {
              describe("by direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.quote.matchPhrase("burn you alive").and.not.matchPhrase("with my words")
                  await search.query()
                  expect(search.results.map(r => r.id)).to.deep.eq([1])
                })
              })

              describe("by constructor", () => {
                it("works", async () => {
                  const search = new ThronesSearch({
                    filters: {
                      quote: {
                        matchPhrase: "burn you alive",
                        and: {
                          not: {
                            matchPhrase: "with my words",
                          },
                        },
                      },
                    },
                  })
                  await search.query()
                  expect(search.results.map(r => r.id)).to.deep.eq([1])
                })
              })
            })

            describe("across different fields", () => {
              describe("by direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.quote
                    .matchPhrase("burn you alive")
                    .and.bio.not.matchPhrase("dragon queen")
                  await search.query()
                  expect(search.results.map(r => r.id)).to.deep.eq([333])
                })
              })

              describe("by constructor", () => {
                it("works", async () => {
                  const search = new ThronesSearch({
                    filters: {
                      quote: {
                        matchPhrase: "burn you alive",
                        and: {
                          bio: {
                            not: {
                              matchPhrase: "dragon queen",
                            },
                          },
                        },
                      },
                    },
                  })
                  await search.query()
                  expect(search.results.map(r => r.id)).to.deep.eq([333])
                })
              })
            })
          })
        })

        describe("or clause", () => {
          describe("across same field", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.quote.matchPhrase("burn you alive").or.matchPhrase("is coming")
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 2])
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    quote: {
                      matchPhrase: "burn you alive",
                      or: {
                        matchPhrase: "is coming",
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 2])
              })
            })
          })

          describe("across multiple fields", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.quote.matchPhrase("burn you alive").or.bio.matchPhrase("digs vows")
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 2])
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    quote: {
                      matchPhrase: "burn you alive",
                      or: {
                        bio: {
                          matchPhrase: "digs vows",
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 2])
              })
            })
          })
        })

        describe("NOT", () => {
          describe("when direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.quote.not.matchPhrase("burn you alive")
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([2, 777, 888, 999])
            })
          })

          describe("when constructor", () => {
            it("works", async () => {
              const search = new ThronesSearch({
                filters: {
                  quote: {
                    not: {
                      matchPhrase: "burn you alive",
                    },
                  },
                },
              })
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([2, 777, 888, 999])
            })
          })

          describe("OR NOT across fields", () => {
            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.matchPhrase("burn you alive").or.bio.not.matchPhrase("vows")
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 777, 888, 999])
              })
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    quote: {
                      matchPhrase: "burn you alive",
                      or: {
                        bio: {
                          not: {
                            matchPhrase: "vows",
                          },
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 777, 888, 999])
              })
            })
          })

          describe("NOT OR across fields", () => {
            beforeEach(async () => {
              await ThronesSearch.client.index({
                index,
                body: {
                  id: 222,
                  quote: "burn you alive",
                  name: "other daen",
                },
              })
              await ThronesSearch.client.indices.refresh({ index })
            })

            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.not.matchPhrase("burn you alive").or.name.eq("other daen")
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([2, 222, 777, 888, 999])
              })
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    quote: {
                      not: {
                        matchPhrase: "burn you alive",
                      },
                      or: {
                        name: {
                          eq: "other daen",
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([2, 222, 777, 888, 999])
              })
            })
          })
        })
      })
    })

    describe("numeric type", () => {
      describe("equality", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.rating.eq(500)
            await search.query()
            expect(search.results.map(r => r.id)).to.deep.eq([2])
          })

          describe("when 0", () => {
            beforeEach(async () => {
              await ThronesSearch.client.index({
                index,
                body: {
                  id: 888,
                  rating: 0,
                },
              })
              await ThronesSearch.client.indices.refresh({ index })
            })

            it("works with 0", async () => {
              const search = new ThronesSearch()
              search.filters.rating.eq(0)
              await search.query()
              expect(search.results.map(r => r.id)).to.deep.eq([888])
            })
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              filters: {
                rating: { eq: 500 },
              },
            })
            await search.query()
            expect(search.results.map(r => r.id)).to.deep.eq([2])
          })
        })

        describe("NOT", () => {
          describe("when direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.rating.not.eq(500)
              await search.query()
              expect(search.results.map(r => r.id)).to.deep.eq([1, 999])
            })
          })

          describe("when constructor", () => {
            it("works", async () => {
              const search = new ThronesSearch({
                filters: {
                  rating: {
                    not: {
                      eq: 500,
                    },
                  },
                },
              })
              await search.query()
              expect(search.results.map(r => r.id)).to.deep.eq([1, 999])
            })
          })

          describe("AND NOT", () => {
            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 999,
                    rating: 500,
                    age: 100,
                  },
                })
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 222,
                    rating: 500,
                    age: 90,
                  },
                })
                await ThronesSearch.client.indices.refresh({ index })
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.rating.eq(500).and.age.not.eq(100)
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([2, 222])
                })
              })

              describe("via constructor", () => {
                it("works", async () => {
                  const search = new ThronesSearch({
                    filters: {
                      rating: {
                        eq: 500,
                        and: {
                          age: {
                            not: {
                              eq: 100,
                            },
                          },
                        },
                      },
                    },
                  })
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([2, 222])
                })
              })
            })
          })

          describe("NOT AND", () => {
            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 222,
                    rating: 600,
                    age: 77,
                  },
                })
                await ThronesSearch.client.indices.refresh({ index })
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.rating.not.eq(500).and.age.eq(77)
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([222])
                })
              })

              describe("via constructor", () => {
                it("works", async () => {
                  const search = new ThronesSearch({
                    filters: {
                      rating: {
                        not: {
                          eq: 500,
                          and: {
                            age: {
                              eq: 77,
                            },
                          },
                        },
                      },
                    },
                  })
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([222])
                })
              })
            })
          })

          describe("OR NOT across fields", () => {
            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.rating.eq(500).or.age.not.eq(13)
                await search.query()
                expect(search.results.map(r => r.id)).to.deep.eq([2, 999])
              })
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    rating: {
                      eq: 500,
                      or: {
                        age: {
                          not: {
                            eq: 13,
                          },
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.deep.eq([2, 999])
              })
            })
          })

          describe("NOT OR across fields", () => {
            beforeEach(async () => {
              await ThronesSearch.client.index({
                index,
                body: {
                  id: 222,
                  rating: 500,
                  name: "other ned",
                },
              })
              await ThronesSearch.client.indices.refresh({ index })
            })

            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.rating.not.eq(500).or.name.eq("other ned")
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 222, 999])
              })
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    rating: {
                      not: {
                        eq: 500,
                      },
                      or: {
                        name: {
                          eq: "other ned",
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 222, 999])
              })
            })
          })
        })

        describe("AND clause", () => {
          beforeEach(async () => {
            await ThronesSearch.client.index({
              index,
              body: {
                id: 333,
                rating: 500,
                age: 100,
              },
            })
            await ThronesSearch.client.indices.refresh({ index })
          })

          // across same field doesnt make sense bc only eq

          describe("across different fields", () => {
            describe("by direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.rating.eq(500).and.age.eq(100)
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })

            describe("by constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    rating: {
                      eq: 500,
                      and: {
                        age: {
                          eq: 100,
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })
          })

          describe("AND NOT", () => {
            // across same field doesnt make sense bc only eq

            describe("across different fields", () => {
              describe("by direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.rating.eq(500).and.age.not.eq(100)
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([2])
                })
              })

              describe("by constructor", () => {
                it("works", async () => {
                  const search = new ThronesSearch({
                    filters: {
                      rating: {
                        eq: 500,
                        and: {
                          age: {
                            not: {
                              eq: 100,
                            },
                          },
                        },
                      },
                    },
                  })
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([2])
                })
              })
            })
          })
        })

        describe("or clause", () => {
          describe("across same field", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.rating.eq(500).or.eq(250)
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 2])
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    rating: {
                      eq: 500,
                      or: {
                        eq: 250,
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 2])
              })
            })
          })

          describe("across multiple fields", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.rating.eq(250).or.age.eq(35)
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 2])
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    rating: {
                      eq: 250,
                      or: {
                        age: {
                          eq: 35,
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 2])
              })
            })
          })
        })
      })

      describe("gt", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.rating.gt(250)
            await search.query()
            expect(search.results.map(r => r.id)).to.deep.eq([2])
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              filters: {
                rating: { gt: 250 },
              },
            })
            await search.query()
            expect(search.results.map(r => r.id)).to.deep.eq([2])
          })
        })
      })

      describe("gte", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.rating.gte(250)
            await search.query()
            expect(search.results.map(r => r.id)).to.have.members([1, 2])
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              filters: {
                rating: { gte: 250 },
              },
            })
            await search.query()
            expect(search.results.map(r => r.id)).to.have.members([1, 2])
          })
        })
      })

      describe("lt", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.rating.lt(500)
            await search.query()
            expect(search.results.map(r => r.id)).to.deep.eq([1])
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              filters: {
                rating: { lt: 500 },
              },
            })
            await search.query()
            expect(search.results.map(r => r.id)).to.deep.eq([1])
          })
        })
      })

      describe("lte", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.rating.lte(500)
            await search.query()
            expect(search.results.map(r => r.id)).to.have.members([1, 2])
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              filters: {
                rating: { lte: 500 },
              },
            })
            await search.query()
            expect(search.results.map(r => r.id)).to.have.members([1, 2])
          })
        })
      })

      describe("combining gt and lt", () => {
        beforeEach(async () => {
          await ThronesSearch.client.index({
            index,
            body: {
              id: 999,
              name: "Thrones",
              rating: 300,
            },
          })
          await ThronesSearch.client.indices.refresh({ index })
        })

        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.rating.gt(250).lt(500)
            await search.query()
            expect(search.results.map(r => r.id)).to.have.members([999])
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              filters: {
                rating: { gt: 250, lt: 500 },
              },
            })
            await search.query()
            expect(search.results.map(r => r.id)).to.have.members([999])
          })
        })
      })
    })

    // TODO: past fiscal years
    // TODO date math
    // TODO write the rest of these
    describe("date type", () => {
      describe("eq", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.createdAt.eq("1960-11-14")
            await search.query()
            expect(search.results.map(r => r.id)).to.have.members([2])
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              filters: {
                createdAt: { eq: "1960-11-14" },
              },
            })
            await search.query()
            expect(search.results.map(r => r.id)).to.have.members([2])
          })
        })

        describe("NOT", () => {
          describe("when direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.createdAt.not.eq("1960-11-14")
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 999])
            })
          })

          describe("when constructor", () => {
            it("works", async () => {
              const search = new ThronesSearch({
                filters: {
                  createdAt: {
                    not: {
                      eq: "1960-11-14",
                    },
                  },
                },
              })
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 999])
            })
          })

          describe("AND NOT", () => {
            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 333,
                    created_at: "1960-11-14",
                    updated_at: "2000-01-01",
                  },
                })
                await ThronesSearch.client.indices.refresh({ index })
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.createdAt.eq("1960-11-14").and.updatedAt.not.eq("2000-01-01")
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([2])
                })
              })

              describe("via constructor", () => {
                it("works", async () => {
                  const search = new ThronesSearch({
                    filters: {
                      createdAt: {
                        eq: "1960-11-14",
                        and: {
                          updatedAt: {
                            not: {
                              eq: "2000-01-01",
                            },
                          },
                        },
                      },
                    },
                  })
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([2])
                })
              })
            })
          })

          describe("NOT AND", () => {
            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 999,
                    created_at: "1960-11-14",
                    updated_at: "2000-01-01",
                  },
                })

                await ThronesSearch.client.index({
                  index,
                  body: {
                    id: 333,
                    created_at: "1980-07-07",
                    updated_at: "2000-01-01",
                  },
                })
                await ThronesSearch.client.indices.refresh({ index })
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.createdAt.not.eq("1960-11-14").and.updatedAt.eq("2000-01-01")
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([333])
                })
              })

              describe("via constructor", () => {
                it("works", async () => {
                  const search = new ThronesSearch({
                    filters: {
                      createdAt: {
                        not: {
                          eq: "1960-11-14",
                          and: {
                            updatedAt: {
                              eq: "2000-01-01",
                            },
                          },
                        },
                      },
                    },
                  })
                  await search.query()
                  expect(search.results.map(r => r.id)).to.have.members([333])
                })
              })
            })
          })

          describe("OR NOT across fields", () => {
            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.createdAt.eq("1960-11-14").or.name.not.eq("Daenerys Targaryen")
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([2, 999])
              })
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    createdAt: {
                      eq: "1960-11-14",
                      or: {
                        name: {
                          not: {
                            eq: "Daenerys Targaryen",
                          },
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([2, 999])
              })
            })
          })

          describe("NOT OR across fields", () => {
            beforeEach(async () => {
              await ThronesSearch.client.index({
                index,
                body: {
                  id: 222,
                  createdAt: "1960-11-14",
                  name: "other ned",
                },
              })
              await ThronesSearch.client.indices.refresh({ index })
            })

            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.createdAt.not.eq("1960-11-14").or.name.eq("other ned")
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 222, 999])
              })
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    createdAt: {
                      not: {
                        eq: "1960-11-14",
                      },
                      or: {
                        name: {
                          eq: "other ned",
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 222, 999])
              })
            })
          })
        })

        describe("AND clause", () => {
          beforeEach(async () => {
            await ThronesSearch.client.index({
              index,
              body: {
                id: 333,
                created_at: "1960-11-14",
                updated_at: "2000-01-01",
              },
            })
            await ThronesSearch.client.indices.refresh({ index })
          })

          // across same field makes no sense here

          describe("across different fields", () => {
            describe("by direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.createdAt.eq("1960-11-14").and.updatedAt.eq("2000-01-01")
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })

            describe("by constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    createdAt: {
                      eq: "1960-11-14",
                      and: {
                        updatedAt: {
                          eq: "2000-01-01",
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })
          })
        })

        describe("or clause", () => {
          describe("across same field", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.createdAt.eq("1960-11-14").or.eq("1980-02-26")
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 2])
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    createdAt: {
                      eq: "1960-11-14",
                      or: {
                        eq: "1980-02-26",
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map((r: any) => r.id)).to.have.members([1, 2])
              })
            })
          })

          describe("across multiple fields", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.createdAt.eq("1960-11-14").or.updatedAt.eq("1980-02-27")
              await search.query()
              expect(search.results.map(r => r.id)).to.have.members([1, 2])
            })

            describe("via constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch({
                  filters: {
                    createdAt: {
                      eq: "1960-11-14",
                      or: {
                        updatedAt: {
                          eq: "1980-02-27",
                        },
                      },
                    },
                  },
                })
                await search.query()
                expect(search.results.map(r => r.id)).to.have.members([1, 2])
              })
            })
          })
        })
      })

      describe("gt", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.createdAt.gt("1960-11-14")
            await search.query()
            expect(search.results.map(r => r.id)).to.have.members([1])
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              filters: {
                createdAt: { gt: "1960-11-14" },
              },
            })
            await search.query()
            expect(search.results.map(r => r.id)).to.have.members([1])
          })
        })
      })

      // Yes, this will fail in the next fiscal year
      // I don't want to deal with it right now
      describe("pastFiscalYears", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.createdAt.pastFiscalYears(5)
            await search.query()
            expect(search.lastQuery.body.query.bool.filter.bool.should[0].bool.must[0].bool.should[0].range).to.deep.eq(
              {
                created_at: {
                  gte: "2015-10-01T00:00:00.0",
                  lte: "2020-09-30T23:59:59.999",
                },
              },
            )
          })
        })

        describe("by constructor", () => {
          it("works", async () => {
            const search = new ThronesSearch({
              filters: {
                createdAt: {
                  pastFiscalYears: 5,
                },
              },
            })
            await search.query()
            expect(search.lastQuery.body.query.bool.filter.bool.should[0].bool.must[0].bool.should[0].range).to.deep.eq(
              {
                created_at: {
                  gte: "2015-10-01T00:00:00.0",
                  lte: "2020-09-30T23:59:59.999",
                },
              },
            )
          })
        })
      })
    })

    describe("top-level NOT", () => {
      beforeEach(async () => {
        // Include because age not 35
        await ThronesSearch.client.index({
          index,
          body: {
            id: 543,
            name: "Ned Stark",
            title: "Warden of the North",
            age: 36,
          },
        })

        // Include because title not warden
        await ThronesSearch.client.index({
          index,
          body: {
            id: 555,
            name: "Ned Stark",
            title: "foo",
            age: 35,
          },
        })
        await ThronesSearch.client.indices.refresh({ index })
      })

      describe("via direct assignment", () => {
        it("works", async () => {
          const search = new ThronesSearch()
          search.filters.name.eq("Ned Stark")
          search.filters.not.title.eq("Warden of the North").and.age.eq(35)
          await search.query()
          expect(search.results.map(r => r.id)).to.have.members([543, 555])
        })
      })

      describe("via constructor", () => {
        it("works", async () => {
          const search = new ThronesSearch({
            filters: {
              name: { eq: "Ned Stark" },
              not: {
                title: {
                  eq: "Warden of the North",
                  and: {
                    age: {
                      eq: 35,
                    },
                  },
                },
              },
            },
          })
          await search.query()
          expect(search.results.map(r => r.id)).to.have.members([543, 555])
        })
      })
    })

    describe("top-level OR", () => {
      describe("via direct assignment", () => {
        it("works", async () => {
          const search = new ThronesSearch()
          search.filters.name.eq("Ned Stark")
          search.filters.or.title.eq("Queen of Dragons")
          await search.query()
          expect(search.results.map(r => r.id)).to.have.members([1, 2])
        })
      })

      describe("via constructor", () => {
        it("works", async () => {
          const search = new ThronesSearch({
            filters: {
              name: {
                eq: "Ned Stark",
              },
              or: {
                title: {
                  eq: "Queen of Dragons",
                },
              },
            },
          })
          await search.query()
          expect(search.results.map(r => r.id)).to.have.members([1, 2])
        })
      })
    })

    describe("top-level AND", () => {
      beforeEach(async () => {
        await ThronesSearch.client.index({
          index,
          body: {
            id: 888,
            name: "Ned Stark",
            title: "findme",
          },
        })
        await ThronesSearch.client.indices.refresh({ index })
      })

      it("works", async () => {
        const search = new ThronesSearch()
        search.filters.name.eq("Ned Stark")
        search.filters.title.eq("findme")
        await search.query()
        expect(search.results.map(r => r.id)).to.have.members([888])
      })
    })

    describe("complex, nested queries", () => {
      beforeEach(async () => {
        // Right name
        await ThronesSearch.client.index({
          index,
          body: {
            id: 11,
            name: "Ned Stark",
            title: "Other Ned",
          },
        })

        // Same as 11 but bio excluded by global not
        await ThronesSearch.client.index({
          index,
          body: {
            id: 11,
            name: "Ned Stark",
            title: "Other Ned",
            bio: "dontfindme",
          },
        })

        // Right name, right age + rating
        await ThronesSearch.client.index({
          index,
          body: {
            id: 111,
            name: "Ned Stark",
            age: 10,
            rating: 77,
          },
        })

        // OR name
        await ThronesSearch.client.index({
          index,
          body: {
            id: 345,
            name: "Rando name",
          },
        })

        // Right name, right age, wrong rating
        await ThronesSearch.client.index({
          index,
          body: {
            id: 999,
            name: "Ned Stark",
            age: 10,
            rating: 10,
          },
        })
        // Right name, wrong title/age
        await ThronesSearch.client.index({
          index,
          body: {
            id: 999,
            name: "Ned Stark",
            title: "dontfindme",
            age: 9,
          },
        })
        await ThronesSearch.client.indices.refresh({ index })
      })

      describe("via direct assignment", () => {
        it("works", async () => {
          const search = new ThronesSearch()
          search.filters.name
            .eq("Ned Stark")
            .and.title.eq("Other Ned")
            .or.age.eq(10)
            .and.rating.eq(77)
          search.filters.or.name.eq("Rando name")
          search.filters.not.bio.match("dontfindme")
          await search.query()
          expect(search.results.map(r => r.id)).to.have.members([11, 111, 345])
        })
      })

      describe("via constructor", () => {
        it("works", async () => {
          const search = new ThronesSearch({
            filters: {
              name: {
                eq: "Ned Stark",
                and: {
                  title: {
                    eq: "Other Ned",
                    or: {
                      age: {
                        eq: 10,
                        and: {
                          rating: {
                            eq: 77,
                          },
                        },
                      },
                    },
                  },
                },
              },
              or: {
                name: {
                  eq: "Rando name",
                },
              },
              not: {
                bio: {
                  match: "dontfindme",
                },
              },
            },
          })
          await search.query()
          expect(search.results.map(r => r.id)).to.have.members([11, 111, 345])
        })
      })
    })
  })
})