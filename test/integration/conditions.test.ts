import { config } from "./../../src/util/env"
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/camelcase */
import { expect } from "chai"
import { Search } from "../../src/index"
import { ThronesSearch } from "../fixtures"
import { setupIntegrationTest } from "../util"

const index = ThronesSearch.index

describe("integration", () => {
  setupIntegrationTest()

  beforeEach(async () => {
    await ThronesSearch.persist({
      id: 1,
      name: "Daenerys Targaryen",
      title: "Queen of Dragons",
      rating: 250,
      age: 13,
      quote: "And I swear this. If you ever betray me, I’ll burn you alive.",
      bio: "The standard dragon queen take over the world shit",
      created_at: "1980-02-26",
      updated_at: "1980-02-27",
    })

    await ThronesSearch.persist({
      id: 2,
      name: "Ned Stark",
      title: "Warden of the North",
      rating: 500,
      age: 35,
      quote: "Winter is coming.",
      bio: "Does a lot of things, really digs vows and duty and whatnot",
      created_at: "1960-11-14",
      updated_at: "1960-11-15",
    })
    // Seed something that should never come back when conditions applied
    await ThronesSearch.persist({
      id: 999,
      name: "asdf",
      quote: "asdf",
    })
    await ThronesSearch.refresh()
  })

  it('can search without filters or queries', async () => {
    const search = new ThronesSearch()
    await search.execute()
    expect(search.results.map(r => r.id)).to.deep.eq([1, 2, 999])
  })

  describe("keywords", () => {
    beforeEach(async () => {
      await ThronesSearch.persist({
        id: 333,
        quote: "dragon dragon dragon dragon",
      }, true)
    })

    describe('on filters', () => {
      it("works", async () => {
        const search = new ThronesSearch()
        search.filters.keywords.eq("dragon")
        await search.execute()
        expect(search.results.map(r => r.id)).to.deep.eq([1, 333])
      })
    })

    describe('on queries', () => {
      it("works", async () => {
        const search = new ThronesSearch()
        search.queries.keywords.eq("dragon")
        await search.execute()
        expect(search.results.map(r => r.id)).to.deep.eq([333, 1])
      })
    })

    describe('specifying combinator', () => {
      beforeEach(async () => {
        await ThronesSearch.client.index({
          index,
          body: {
            id: 777,
            quote: "one two three four",
          },
        })
        await ThronesSearch.client.index({
          index,
          body: {
            id: 888,
            quote: "one five"
          },
        })
        await ThronesSearch.client.indices.refresh({ index })
      })

      describe('via direct assignment', () => {
        it("works", async () => {
          const search = new ThronesSearch()
          search.queries.keywords.eq("one two", { combinator: 'and' })
          await search.execute()
          expect(search.results.map(r => r.id)).to.deep.eq([777])
          search.queries.keywords.eq("one two", { combinator: 'or' })
          await search.execute()
        })
      })

      describe('via constructor', () => {
        it("works", async () => {
          let search = new ThronesSearch({
            queries: {
              keywords: {
                eq: "one two",
                combinator: "and"
              }
            }
          })
          await search.execute()
          expect(search.results.map(r => r.id)).to.deep.eq([777])
          search = new ThronesSearch({
            queries: {
              keywords: {
                eq: "one two",
                combinator: "or"
              }
            }
          })
          await search.execute()
          expect(search.results.map(r => r.id)).to.deep.eq([777, 888])
        })
      })
    })
  })

  describe("filters", () => {
    describe("keyword type", () => {
      describe("basic equality", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.name.eq("Ned Stark")
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([2])
          })

          it("does not match partial strings", async () => {
            const search = new ThronesSearch()
            search.filters.name.eq("Ned")
            await search.execute()
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
            await search.execute()
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
              await search.execute()
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
              await search.execute()
              expect(search.results.map(r => r.id)).to.have.members([1, 999])
            })
          })

          describe("AND NOT", () => {
            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.persist({
                  id: 222,
                  name: "Ned Stark",
                  title: "other",
                }, true)
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.name.eq("Ned Stark").and.title.not.eq("Warden of the North")
                  await search.execute()
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
                  await search.execute()
                  expect(search.results.map(r => r.id)).to.have.members([222])
                })
              })
            })
          })

          describe("NOT AND", () => {
            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.persist([
                  {
                    id: 999,
                    name: "Ned Stark",
                    title: "Warden of the North",
                  },
                  {
                    id: 222,
                    name: "Ned Stark",
                    title: "other",
                  }
                ], true)
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.title.not.eq("Warden of the North").and.name.eq("Ned Stark")
                  await search.execute()
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
                  await search.execute()
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
                await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([1, 999])
              })
            })
          })

          describe("NOT OR across fields", () => {
            beforeEach(async () => {
              await ThronesSearch.persist({
                id: 777,
                name: "Ned Stark",
                title: "Other Ned",
              }, true)
            })

            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.name.not.eq("Ned Stark").or.title.eq("Other Ned")
              await search.execute()
              expect(search.results.map(r => r.id)).to.have.members([1, 999, 777])
            })
          })
        })
      })

      describe("AND clause", () => {
        beforeEach(async () => {
          await ThronesSearch.persist({
            id: 333,
            name: "Ned Stark",
            title: "Other Ned",
          }, true)
        })

        // No "across same field" test because doesnt make sense with eq
        describe("across multiple fields", () => {
          describe("by direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.name.eq("Ned Stark").and.title.eq("Other Ned")
              await search.execute()
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
              await search.execute()
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
              await search.execute()
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
              await search.execute()
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
            await search.execute()
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
              await search.execute()
              expect(search.results.map(r => r.id)).to.have.members([1, 2])
            })
          })
        })

        describe("across multiple fields", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.name.eq("Ned Stark").or.title.eq("Queen of Dragons")
            await search.execute()
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
              await search.execute()
              expect(search.results.map(r => r.id)).to.have.members([1, 2])
            })
          })
        })
      })

      // TODO GQL
      describe('prefix', () => {
        describe('basic', () => {
          describe('via direct assignment', () => {
            it('works', async() => {
              const search = new ThronesSearch()
              search.filters.name.prefix("Ne")
              await search.execute()
              expect(search.results.map((r) => r.id)).to.deep.eq([2])
            })
          })

          describe('via constructor', () => {
            it('works', async() => {
              const search = new ThronesSearch({
                filters: { name: { prefix: "Ne" } }
              })
              await search.execute()
              expect(search.results.map((r) => r.id)).to.deep.eq([2])
            })
          })
        })

        describe('not', () => {
          describe('via direct assignment', () => {
            it('works', async() => {
              const search = new ThronesSearch()
              search.filters.name.not.prefix("Ne")
              await search.execute()
              expect(search.results.map((r) => r.id)).to.deep.eq([1, 999])
            })
          })

          describe('via constructor', () => {
            it('works', async() => {
              const search = new ThronesSearch({
                filters: { name: { not: { prefix: "Ne" } } }
              })
              await search.execute()
              expect(search.results.map((r) => r.id)).to.deep.eq([1, 999])
            })
          })
        })

        describe('and not', () => {
          describe('within field', () => {
            beforeEach(async() => {
              await ThronesSearch.persist({
                id: 333,
                name: "Neil Stark"
              }, true)
            })

            describe('via direct assignment', () => {
              it('works', async() => {
                const search = new ThronesSearch()
                search.filters.name.prefix("Ne").and.not.prefix("Ned")
                await search.execute()
                expect(search.results.map((r) => r.id)).to.deep.eq([333])
              })
            })

            describe('via constructor', () => {
              it('works', async() => {
                const search = new ThronesSearch({
                  filters: {
                    name: {
                      prefix: "Ne",
                      and: {
                        not: {
                          prefix: "Ned"
                        }
                      }
                    }
                  }
                })
                await search.execute()
                expect(search.results.map((r) => r.id)).to.deep.eq([333])
              })
            })
          })

          describe('across fields', () => {
            beforeEach(async() => {
              await ThronesSearch.persist({
                id: 333,
                name: "Ned Stark",
                title: "blah"
              }, true)
            })

            describe('via direct assignment', () => {
              it('works', async() => {
                const search = new ThronesSearch()
                search.filters.name.prefix("Ne").and.title.not.prefix("War")
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })

            describe('via constructor', () => {
              it('works', async() => {
                const search = new ThronesSearch({
                  filters: {
                    name: {
                      prefix: "Ne",
                      and: {
                        title: {
                          not: {
                            prefix: "War"
                          }
                        }
                      }
                    }
                  }
                })
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })
          })
        })

        describe('not and', () => {
          describe('within field', () => {
            beforeEach(async() => {
              await ThronesSearch.persist({
                id: 333,
                name: "Neil Stark"
              }, true)
            })

            describe('via direct assignment', () => {
              it('works', async() => {
                const search = new ThronesSearch()
                search.filters.name.not.prefix("Ned").and.prefix("Ne")
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })

            describe('via constructor', () => {
              it('works', async() => {
                const search = new ThronesSearch({
                  filters: {
                    name: {
                      not: {
                        prefix: "Ned",
                        and: {
                          prefix: "Ne"
                        }
                      }
                    }
                  }
                })
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })
          })

          describe('across fields', () => {
            beforeEach(async() => {
              await ThronesSearch.persist({
                id: 333,
                name: "Ned Stark",
                title: "blah"
              }, true)
            })

            describe('via direct assignment', () => {
              it('works', async() => {
                const search = new ThronesSearch()
                search.filters.title.not.prefix("War").and.name.prefix("Ne")
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })

            describe('via constructor', () => {
              it('works', async() => {
                const search = new ThronesSearch({
                  filters: {
                    title: {
                      not: {
                        prefix: "War",
                        and: {
                          name: {
                            prefix: "Ne"
                          }
                        }
                      }
                    }
                  }
                })
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })
          })
        })

        describe('or not', () => {
          describe('across fields', () => {
            describe('via direct assignment', () => {
              it('works', async() => {
                const search = new ThronesSearch()
                search.filters.name.prefix("Ne").or.title.not.prefix("Que")
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([2, 999])
              })
            })

            describe('via constructor', () => {
              it('works', async() => {
                const search = new ThronesSearch({
                  filters: {
                    name: {
                      prefix: "Ne",
                      or: {
                        title: {
                          not: {
                            prefix: "Qu"
                          }
                        }
                      }
                    }
                  }
                })
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([2, 999])
              })
            })
          })
        })

        describe('not or', () => {
          describe('across fields', () => {
            beforeEach(async() => {
              await ThronesSearch.persist({
                id: 333,
                name: "Ned Stark",
                title: "other ned"
              }, true)
            })

            describe('via direct assignment', () => {
              it('works', async() => {
                const search = new ThronesSearch()
                search.filters.name.not.prefix("Ne").or.title.prefix("other")
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([1, 999, 333])
              })
            })

            describe('via constructor', () => {
              it('works', async() => {
                const search = new ThronesSearch({
                  filters: {
                    name: {
                      not: {
                        prefix: "Ne",
                        or: {
                          title: {
                            prefix: "other"
                          }
                        }
                      }
                    }
                  }
                })
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([1, 999, 333])
              })
            })
          })
        })

        describe('and', () => {
          describe('across fields', () => {
            beforeEach(async() => {
              await ThronesSearch.persist({
                id: 333,
                name: "Ned Stark",
                title: "other ned"
              }, true)
            })

            describe('via direct assignment', () => {
              it('works', async() => {
                const search = new ThronesSearch()
                search.filters.name.prefix("Ne").and.title.prefix("other")
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })

            describe('via constructor', () => {
              it('works', async() => {
                const search = new ThronesSearch({
                  filters: {
                    name: {
                      prefix: "Ne",
                      and: {
                        title: {
                          prefix: "other"
                        }
                      }
                    }
                  }
                })
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })
          })
        })

        describe('or', () => {
          describe('within field', () => {
            describe('by direct assignment', () => {
              it('works', async() => {
                const search = new ThronesSearch()
                search.filters.name.prefix("Ne").or.prefix("Da")
                await search.execute()
                expect(search.results.map((r) => r.id)).to.deep.eq([1, 2])
              })
            })

            describe('by constructor', () => {
              it('works', async() => {
                const search = new ThronesSearch({
                  filters: {
                    name: {
                      prefix: "Ne",
                      or: {
                        prefix: "Da"
                      }
                    }
                  }
                })
                await search.execute()
                expect(search.results.map((r) => r.id)).to.deep.eq([1, 2])
              })
            })
          })

          describe('across fields', () => {
            describe('by direct assignment', () => {
              it('works', async() => {
                const search = new ThronesSearch()
                search.filters.name.prefix("Ne").or.title.prefix("Qu")
                await search.execute()
                expect(search.results.map((r) => r.id)).to.deep.eq([1, 2])
              })
            })

            describe('by constructor', () => {
              it('works', async() => {
                const search = new ThronesSearch({
                  filters: {
                    name: {
                      prefix: "Ne",
                      or: {
                        title: {
                          prefix: "Qu"
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
        })
      })
    })

    describe("text type", () => {
      describe("fuzzy match", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.quote.match("betray")
            await search.execute()
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
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([1])
          })
        })

        describe("NOT", () => {
          describe("when direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.quote.not.match("winter")
              await search.execute()
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
              await search.execute()
              expect(search.results.map(r => r.id)).to.have.members([1, 999])
            })
          })

          describe("AND NOT", () => {
            describe("across same field", () => {
              beforeEach(async () => {
                await ThronesSearch.persist([
                  {
                    id: 222,
                    quote: "Winter is here!",
                  },
                  {
                    id: 999,
                    quote: "Winter is coming other text",
                  }
                ], true)
              })

              describe("by direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.quote.match("winter").and.not.match("other text")
                  await search.execute()
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
                  await search.execute()
                  expect(search.results.map(r => r.id)).to.have.members([2, 222])
                })
              })
            })

            describe("across different fields", () => {
              beforeEach(async () => {
                await ThronesSearch.persist([
                  {
                    id: 999,
                    quote: "Winter is here!",
                    name: "Other Ned",
                  },
                  {
                    id: 222,
                    quote: "Winter is here!",
                    name: "Find me!",
                  }
                ], true)
              })

              describe("by direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.quote.match("winter").and.name.not.eq("Other Ned")
                  await search.execute()
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
                  await search.execute()
                  expect(search.results.map(r => r.id)).to.have.members([2, 222])
                })
              })
            })
          })

          describe("NOT AND", () => {
            describe("within same field", () => {
              beforeEach(async () => {
                await ThronesSearch.persist([
                  {
                    id: 999,
                    quote: "winter is here!",
                  },
                  {
                    id: 222,
                    quote: "other text",
                  }
                ], true)
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.quote.not.match("winter").and.match("other text")
                  await search.execute()
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
                  await search.execute()
                  expect(search.results.map(r => r.id)).to.have.members([222])
                })
              })
            })

            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.persist({
                  id: 222,
                  quote: "Something else",
                  name: "Ned Stark",
                }, true)
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.quote.not.match("winter").and.name.eq("Ned Stark")
                  await search.execute()
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
                  await search.execute()
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
                await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([1, 999])
              })
            })
          })

          describe("NOT OR across fields", () => {
            beforeEach(async () => {
              await ThronesSearch.persist({
                id: 777,
                quote: "winter",
                bio: "other bio",
              }, true)
            })

            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.not.match("winter").or.bio.match("other bio")
                await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([1, 999, 777])
              })
            })
          })
        })

        describe("AND clause", () => {
          beforeEach(async () => {
            await ThronesSearch.persist({
              id: 333,
              name: "Other Ned",
              quote: "winter other text",
            }, true)
          })

          // TODO: has problems with additional levels of nesting
          describe("across same field", () => {
            describe("by direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.match("winter").and.match("other text")
                await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([333])
              })
            })
          })

          describe("across different fields", () => {
            describe("by direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.match("winter").and.name.eq("Other Ned")
                await search.execute()
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
                await search.execute()
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
              await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([1, 2])
              })
            })
          })

          describe("across multiple fields", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.quote.match("betray").or.bio.match("vows")
              await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([1, 2])
              })
            })
          })
        })
      })

      describe("phrase match", () => {
        beforeEach(async () => {
          // Same phrase in different order
          await ThronesSearch.persist([
            {
              id: 777,
              quote: "alive burn you",
            },
            {
              id: 888,
              bio: "vow digs",
            }
          ], true)
        })

        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.quote.matchPhrase("burn you alive")
            await search.execute()
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
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([1])
          })
        })

        describe("AND clause", () => {
          beforeEach(async () => {
            await ThronesSearch.persist({
              id: 333,
              bio: "Other Dany",
              quote: "burn you alive with my words",
            }, true)
          })

          describe("across same field", () => {
            describe("by direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.matchPhrase("burn you alive").and.matchPhrase("with my words")
                await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([333])
              })
            })
          })

          describe("across different fields", () => {
            describe("by constructor", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.matchPhrase("burn you alive").and.bio.matchPhrase("dragon queen")
                await search.execute()
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
                await search.execute()
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
                  await search.execute()
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
                  await search.execute()
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
                  await search.execute()
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
                  await search.execute()
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
              await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([1, 2])
              })
            })
          })

          describe("across multiple fields", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.quote.matchPhrase("burn you alive").or.bio.matchPhrase("digs vows")
              await search.execute()
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
                await search.execute()
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
              await search.execute()
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
              await search.execute()
              expect(search.results.map(r => r.id)).to.have.members([2, 777, 888, 999])
            })
          })

          describe("OR NOT across fields", () => {
            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.matchPhrase("burn you alive").or.bio.not.matchPhrase("vows")
                await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([1, 777, 888, 999])
              })
            })
          })

          describe("NOT OR across fields", () => {
            beforeEach(async () => {
              await ThronesSearch.persist({
                id: 222,
                quote: "burn you alive",
                name: "other daen",
              }, true)
            })

            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.quote.not.matchPhrase("burn you alive").or.name.eq("other daen")
                await search.execute()
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
                await search.execute()
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
            await search.execute()
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
              await search.execute()
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
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([2])
          })
        })

        describe("NOT", () => {
          describe("when direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.rating.not.eq(500)
              await search.execute()
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
              await search.execute()
              expect(search.results.map(r => r.id)).to.deep.eq([1, 999])
            })
          })

          describe("AND NOT", () => {
            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.persist([
                  {
                    id: 999,
                    rating: 500,
                    age: 100,
                  },
                  {
                    id: 222,
                    rating: 500,
                    age: 90,
                  }
                ], true)
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.rating.eq(500).and.age.not.eq(100)
                  await search.execute()
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
                  await search.execute()
                  expect(search.results.map(r => r.id)).to.have.members([2, 222])
                })
              })
            })
          })

          describe("NOT AND", () => {
            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.persist({
                  id: 222,
                  rating: 600,
                  age: 77,
                }, true)
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.rating.not.eq(500).and.age.eq(77)
                  await search.execute()
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
                  await search.execute()
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
                await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.deep.eq([2, 999])
              })
            })
          })

          describe("NOT OR across fields", () => {
            beforeEach(async () => {
              await ThronesSearch.persist({
                id: 222,
                rating: 500,
                name: "other ned",
              }, true)
            })

            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.rating.not.eq(500).or.name.eq("other ned")
                await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([1, 222, 999])
              })
            })
          })
        })

        describe("AND clause", () => {
          beforeEach(async () => {
            await ThronesSearch.persist({
              id: 333,
              rating: 500,
              age: 100,
            }, true)
          })

          // across same field doesnt make sense bc only eq

          describe("across different fields", () => {
            describe("by direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.rating.eq(500).and.age.eq(100)
                await search.execute()
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
                await search.execute()
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
                  await search.execute()
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
                  await search.execute()
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
              await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([1, 2])
              })
            })
          })

          describe("across multiple fields", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.rating.eq(250).or.age.eq(35)
              await search.execute()
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
                await search.execute()
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
            await search.execute()
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
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([2])
          })
        })
      })

      describe("gte", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.rating.gte(250)
            await search.execute()
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
            await search.execute()
            expect(search.results.map(r => r.id)).to.have.members([1, 2])
          })
        })
      })

      describe("lt", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.rating.lt(500)
            await search.execute()
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
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([1])
          })
        })
      })

      describe("lte", () => {
        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.rating.lte(500)
            await search.execute()
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
            await search.execute()
            expect(search.results.map(r => r.id)).to.have.members([1, 2])
          })
        })
      })

      describe("combining gt and lt", () => {
        beforeEach(async () => {
          await ThronesSearch.persist({
            id: 999,
            name: "Thrones",
            rating: 300,
          }, true)
        })

        describe("by direct assignment", () => {
          it("works", async () => {
            const search = new ThronesSearch()
            search.filters.rating.gt(250).lt(500)
            await search.execute()
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
            await search.execute()
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
            await search.execute()
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
            await search.execute()
            expect(search.results.map(r => r.id)).to.have.members([2])
          })
        })

        describe("NOT", () => {
          describe("when direct assignment", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.createdAt.not.eq("1960-11-14")
              await search.execute()
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
              await search.execute()
              expect(search.results.map(r => r.id)).to.have.members([1, 999])
            })
          })

          describe("AND NOT", () => {
            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.persist({
                  id: 333,
                  created_at: "1960-11-14",
                  updated_at: "2000-01-01",
                }, true)
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.createdAt.eq("1960-11-14").and.updatedAt.not.eq("2000-01-01")
                  await search.execute()
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
                  await search.execute()
                  expect(search.results.map(r => r.id)).to.have.members([2])
                })
              })
            })
          })

          describe("NOT AND", () => {
            describe("across fields", () => {
              beforeEach(async () => {
                await ThronesSearch.persist([
                  {
                    id: 999,
                    created_at: "1960-11-14",
                    updated_at: "2000-01-01",
                  },
                  {
                    id: 333,
                    created_at: "1980-07-07",
                    updated_at: "2000-01-01",
                  }
                ], true)
              })

              describe("via direct assignment", () => {
                it("works", async () => {
                  const search = new ThronesSearch()
                  search.filters.createdAt.not.eq("1960-11-14").and.updatedAt.eq("2000-01-01")
                  await search.execute()
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
                  await search.execute()
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
                await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([2, 999])
              })
            })
          })

          describe("NOT OR across fields", () => {
            beforeEach(async () => {
              await ThronesSearch.persist({
                id: 222,
                createdAt: "1960-11-14",
                name: "other ned",
              }, true)
            })

            describe("via direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.createdAt.not.eq("1960-11-14").or.name.eq("other ned")
                await search.execute()
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
                await search.execute()
                expect(search.results.map(r => r.id)).to.have.members([1, 222, 999])
              })
            })
          })
        })

        describe("AND clause", () => {
          beforeEach(async () => {
            await ThronesSearch.persist({
              id: 333,
              created_at: "1960-11-14",
              updated_at: "2000-01-01",
            }, true)
          })

          // across same field makes no sense here

          describe("across different fields", () => {
            describe("by direct assignment", () => {
              it("works", async () => {
                const search = new ThronesSearch()
                search.filters.createdAt.eq("1960-11-14").and.updatedAt.eq("2000-01-01")
                await search.execute()
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
                await search.execute()
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
              await search.execute()
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
                await search.execute()
                expect(search.results.map((r: any) => r.id)).to.have.members([1, 2])
              })
            })
          })

          describe("across multiple fields", () => {
            it("works", async () => {
              const search = new ThronesSearch()
              search.filters.createdAt.eq("1960-11-14").or.updatedAt.eq("1980-02-27")
              await search.execute()
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
                await search.execute()
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
            await search.execute()
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
            await search.execute()
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
            await search.execute()
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
            await search.execute()
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
        await ThronesSearch.persist([
          // Include because age not 35
          {
            id: 543,
            name: "Ned Stark",
            title: "Warden of the North",
            age: 36,
          },
          // Include because title not warden
          {
            id: 555,
            name: "Ned Stark",
            title: "foo",
            age: 35,
          }
        ], true)
      })

      describe("via direct assignment", () => {
        it("works", async () => {
          const search = new ThronesSearch()
          search.filters.name.eq("Ned Stark")
          search.filters.not.title.eq("Warden of the North").and.age.eq(35)
          await search.execute()
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
          await search.execute()
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
          await search.execute()
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
          await search.execute()
          expect(search.results.map(r => r.id)).to.have.members([1, 2])
        })
      })
    })

    describe("top-level AND", () => {
      beforeEach(async () => {
        await ThronesSearch.persist({
          id: 888,
          name: "Ned Stark",
          title: "findme",
        }, true)
      })

      it("works", async () => {
        const search = new ThronesSearch()
        search.filters.name.eq("Ned Stark")
        search.filters.title.eq("findme")
        await search.execute()
        expect(search.results.map(r => r.id)).to.have.members([888])
      })
    })

    describe('OR then AND', () => {
      describe('within a condition', () => {
        beforeEach(async () => {
          await ThronesSearch.persist([
            // exclude, only foo
            {
              id: 999,
              quote: "foo"
            },
            // exclude, only bar
            {
              id: 999,
              quote: "bar"
            },
            // include, foo and bar
            {
              id: 444,
              quote: "foo bar"
            },
          ], true)
        })

        it('has AND trump OR', async() => {
          const search = new ThronesSearch()
          search.filters.quote.match("burn")
            .or.match("foo").and.match("bar")
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([1, 444])
        })
      })

      describe('across conditions', () => {
        beforeEach(async () => {
          await ThronesSearch.persist([
            // wrong age
            {
              id: 999,
              name: "Ned Stark",
              title: "Other Ned",
            },
            {
              id: 777,
              name: "Ned Stark",
              age: 4
            }
          ], true)
        })

        it('opens new parens on new condition: (bio or (name and age))', async() => {
          const search = new ThronesSearch()
          search.filters.bio.match("dragon")
            .or.name.eq("Ned Stark").and.age.eq(4)
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([1, 777])
        })
      })
    })

    describe('AND then OR', () => {
      describe('within same condition', () => {
        beforeEach(async () => {
          await ThronesSearch.persist({
            id: 777,
            bio: "dragon foo",
          })
          await ThronesSearch.persist({
            id: 888,
            bio: "bar",
          })
          await ThronesSearch.refresh()
        })

        it('has AND trump OR', async() => {
          const search = new ThronesSearch()
          search.filters.bio.match("dragon")
            .and.match("foo").or.match("bar")
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([777, 888])
        })
      })

      describe('across conditions', () => {
        beforeEach(async () => {
          // excluded, correct name but not bio
          await ThronesSearch.persist({
            id: 999,
            name: "Ned Stark"
          })
          // excluded, correct age but not bio
          await ThronesSearch.persist({
            id: 999,
            age: 4
          })
          // included because correct bio and age
          await ThronesSearch.persist({
            id: 888,
            bio: "dragon",
            age: 4
          })
          // included because correct bio and name
          await ThronesSearch.persist({
            id: 777,
            bio: "dragon",
            name: "Ned Stark"
          })
          await ThronesSearch.refresh()
        })

        it('opens new parens on condition: (bio and (name or age))', async() => {
          const search = new ThronesSearch()
          search.filters.bio.match("dragon")
            .and.name.eq("Ned Stark").or.age.eq(4)
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([888, 777])
        })
      })
    })

    describe("complex, nested queries", () => {
      beforeEach(async () => {
        await ThronesSearch.persist([
          // Right name
          {
            id: 11,
            name: "Ned Stark",
            title: "Other Ned",
          },
          // Same as 11 but bio excluded by global not
          {
            id: 11,
            name: "Ned Stark",
            title: "Other Ned",
            bio: "dontfindme",
          },
          // Right name, right age + rating
          {
            id: 111,
            name: "Ned Stark",
            age: 10,
            rating: 77,
          },
          // OR name
          {
            id: 345,
            name: "Rando name",
          },
          // Right name, right age, wrong rating
          {
            id: 999,
            name: "Ned Stark",
            age: 10,
            rating: 10,
          },
          // Right name, wrong title/age
          {
            id: 999,
            name: "Ned Stark",
            title: "dontfindme",
            age: 9,
          }
        ], true)
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
          await search.execute()
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
          await search.execute()
          expect(search.results.map(r => r.id)).to.have.members([11, 111, 345])
        })
      })
    })
  })

  describe('queries', () => {
    beforeEach(async () => {
      await ThronesSearch.persist({
        id: 333,
        bio: "dragon dragon dragon"
      }, true)
    })

    describe('via direct assignment', () => {
      it('applies condition in query context', async () => {
        const search = new ThronesSearch()
        search.queries.bio.match("dragon")
        await search.execute()
        expect(search.results.map((r) => r.id)).to.deep.eq([333, 1])
      })
    })

    describe('via constructor', () => {
      it('applies condition in query context', async () => {
        const search = new ThronesSearch({
          queries: {
            bio: {
              match: "dragon"
            }
          }
        })
        await search.execute()
        expect(search.results.map((r) => r.id)).to.deep.eq([333, 1])
      })
    })

    describe('with and/or/not', () => {
      beforeEach(async () => {
        // exclude, because age > 10
        await ThronesSearch.persist([
          {
            id: 999,
            quote: "foo",
            age: 9
          },
          // rank lower, only one foo
          {
            id: 7,
            quote: "foo",
            age: 20
          },
          // rank higher, many foos
          {
            id: 8,
            quote: "foo foo foo foo foo foo foo foo foo foo foo foo",
            age: 20
          }
        ], true)
      })

      // 8 first, because tons of foos
      // Then 7, because match foo AND the age
      // Then 333, because a few dragons
      // Then 1, because just match single dragon
      it('works', async() => {
        const search = new ThronesSearch()
        search.queries.bio.match("dragon")
          .or.quote.match("foo").and.age.gt(10)
        await search.execute()
        expect(search.results.map((r) => r.id)).to.deep.eq([8, 7, 333, 1])
      })
    })

    describe('when combined with filters', () => {
      beforeEach(async () => {
        await ThronesSearch.persist({
          id: 444,
          bio: "dragon dragon dragon dragon dragon",
          age: 77
        }, true)
      })

      it('works', async() => {
        const search = new ThronesSearch()
        search.queries.bio.match("dragon")
        search.filters.age.eq(77).or.eq(13)
        await search.execute()
        expect(search.results.map((r) => r.id)).to.deep.eq([444, 1])
      })
    })
  })
})