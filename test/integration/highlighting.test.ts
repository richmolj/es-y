import { ThronesSearch, GlobalSearch } from "./../fixtures"
import { expect } from "chai"
import { setupIntegrationTest } from "../util"

// TODO: overall fragment size, etc not on field
describe("integration", () => {
  describe("highlighting", () => {
    setupIntegrationTest()

    describe('basic', () => {
      beforeEach(async () => {
        await ThronesSearch.persist({
          id: 1,
          bio: "He was the older brother of Benjen, Lyanna and the younger brother of Brandon Stark. He is the father of Robb, Sansa, Arya, Bran, and Rickon by his wife, Catelyn Tully, and uncle of Jon Snow, who he raised as his bastard son. He was a dedicated husband and father, a loyal friend, and an honorable lord.",
          quote: "Let me give you some advice, bastard. Never forget what you are. The rest of the world will not. Wear it like armor, and it can never be used to hurt you."
        }, true)
      })

      describe('by direct assignment', () => {
        it('works', async() => {
          const search = new ThronesSearch()
          search.queries.keywords.eq("older")
          search.highlight("bio")
          await search.execute()
          expect(search.results[0]._highlights).to.deep.eq({
            bio: [
              "He was the <em>older</em> brother of Benjen, Lyanna and the younger brother of Brandon Stark."
            ]
          })
        })

        it('is chainable', async () => {
          const search = new ThronesSearch()
          search.queries.keywords.eq("bastard")
          search.highlight("bio").highlight("quote")
          await search.execute()
          expect(search.results[0]._highlights).to.deep.eq({
            bio: [
              "Sansa, Arya, Bran, and Rickon by his wife, Catelyn Tully, and uncle of Jon Snow, who he raised as his <em>bastard</em>"
            ],
            quote: [
              "Let me give you some advice, <em>bastard</em>. Never forget what you are. The rest of the world will not."
            ]
          })
        })

        it('works with alias', async () => {
          const search = new ThronesSearch()
          search.queries.keywords.eq("older")
          search.highlight("bioAlias")
          await search.execute()
          expect(search.results[0]._highlights).to.deep.eq({
            bioAlias: [
              "He was the <em>older</em> brother of Benjen, Lyanna and the younger brother of Brandon Stark."
            ]
          })
        })

        it('works with field specified', async () => {
          const search = new ThronesSearch()
          search.queries.keywords.eq("older")
          search.highlight("thing", { field: "bio" })
          await search.execute()
          expect(search.results[0]._highlights).to.deep.eq({
            thing: [
              "He was the <em>older</em> brother of Benjen, Lyanna and the younger brother of Brandon Stark."
            ]
          })
        })

        describe('when score specified', () => {
          beforeEach(async() => {
            await ThronesSearch.persist({
              id: 333,
              quote: 'blah foo blah is a foo foo foo thing'
            }, true)
          })

          it('works', async() => {
            const search = new ThronesSearch()
            search.queries.keywords.eq("foo")
            search.highlight("quote", { order: 'score', fragment_size: 10 })
            await search.execute()
            expect(search.results[0]._highlights).to.deep.eq({
              quote: [
                "is a <em>foo</em> <em>foo</em>",
                "<em>foo</em> thing",
                "blah <em>foo</em> blah",
              ]
            })
          })
        })
      })

      describe('by constructor', () => {
        it('works', async() => {
          const search = new ThronesSearch({
            queries: {
              keywords: {
                eq: "bastard"
              }
            },
            highlights: [
              { name: "bio" },
              { name: "quote" }
            ]
          })
          await search.execute()
          expect(search.results[0]._highlights).to.deep.eq({
            bio: [
              "Sansa, Arya, Bran, and Rickon by his wife, Catelyn Tully, and uncle of Jon Snow, who he raised as his <em>bastard</em>"
            ],
            quote: [
              "Let me give you some advice, <em>bastard</em>. Never forget what you are. The rest of the world will not."
            ]
          })
        })
      })
    })

    describe('supplying options', () => {
      beforeEach(async() => {
        await ThronesSearch.persist({
          id: 2,
          bio: "the foo bar does blah blah boo boo glah glah the foo thing blah2 blah2 boo2 boo2 glah2 glah2 in the foo foo way"
        }, true)
      })

      describe('by direct assignment', () => {
        it('works', async() => {
          const search = new ThronesSearch()
          search.queries.keywords.eq("foo")
          search.highlight("thing", {
            field: "bio",
            numberOfFragments: 2,
            fragmentSize: 15,
            order: "score",
            preTags: ['<strong>'],
            postTags: ['</strong>'],
          })
          await search.execute()
          expect(search.results[0]._highlights).to.deep.eq({
            thing: [
              "<strong>foo</strong> way",
              "the <strong>foo</strong> bar does",
            ]
          })
        })
      })

      describe('by constructor', () => {
        it('works', async() => {
          const search = new ThronesSearch({
            queries: {
              keywords: {
                eq: "foo"
              }
            },
            highlights: [{
              name: "thing",
              field: "bio",
              numberOfFragments: 2,
              fragmentSize: 15,
              order: "score",
              preTags: ['<strong>'],
              postTags: ['</strong>'],
            }]
          })
          await search.execute()
          expect(search.results[0]._highlights).to.deep.eq({
            thing: [
              "<strong>foo</strong> way",
              "the <strong>foo</strong> bar does",
            ]
          })
        })
      })
    })

    describe('when results are transformed', () => {
      let original: any
      beforeEach(async() => {
        original = (ThronesSearch.prototype as any).transformResults
        ;(ThronesSearch.prototype as any).transformResults = (results: any[]) => {
          return results.map((r) => {
            return { foo: 'bar' }
          })
        }

        await ThronesSearch.persist({
          bio: 'findme'
        }, true)
      })

      afterEach(() => {
        ;(ThronesSearch.prototype as any).transformResults = original
      })

      it('still works', async() => {
        const search = new ThronesSearch()
        search.highlight('bio')
        search.queries.bio.match('findme')
        await search.execute()
        expect(search.results).to.deep.eq([{
          foo: 'bar',
          _highlights: {
            bio: ["<em>findme</em>"]
          }
        }])
      })

      // TODO: cant work bc based on index
      describe('and a the transformed results are missing entries', () => {
        let original: any
        beforeEach(async() => {
          original = (ThronesSearch.prototype as any).transformResults
          ;(ThronesSearch.prototype as any).transformResults = (results: any[], rawResults: any[]) => {
            return [
              { foo: 'bar' },
              { foo: 'manuallyadded', _highlights: rawResults[2].highlight },
            ]
          }

          await ThronesSearch.persist([
            { bio: 'findme 3' },
            { bio: 'findme' },
          ], true)
        })

        afterEach(() => {
          ;(ThronesSearch.prototype as any).transformResults = original
        })

        it('cannot work straight up, but does not blow up and allows for manually attaching', async () => {
          const search = new ThronesSearch()
          search.highlight('bio')
          search.queries.bio.match('findme')
          await search.execute()
          expect(search.results).to.deep.eq([
            { foo: 'bar' },
            {
              foo: 'manuallyadded',
              _highlights: {
                bio: [
                  "<em>findme</em> 3"
                ]
              }
            }
          ])
        })
      })
    })
  })
})