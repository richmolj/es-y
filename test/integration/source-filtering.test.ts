import { expect } from "chai"
import { GlobalSearch, ThronesSearch } from "../fixtures"
import { setupIntegrationTest } from '../util'

describe("integration", () => {
  setupIntegrationTest()

  describe("source filtering", () => {
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
    })

    describe('basic', () => {
      describe('via direct assignment', () => {
        it('works with includes', async() => {
          const search = new ThronesSearch()
          search.sourceFields({ includes: ['bio'] })
          await search.execute()
          expect(search.results).to.deep.eq([{
            bio: "foo"
          }])
        })

        it('works with excludes', async() => {
          const search = new ThronesSearch()
          search.sourceFields({ excludes: ['id'] })
          await search.execute()
          expect(search.results).to.deep.eq([
            {
              bio: 'foo',
              skills: [
                {
                  name: 'knives',
                  description: 'very good at knive throwing, knife stabbing, and general cutlery'
                }
              ]
            }
          ])
        })
      })

      describe('via constructor', () => {
        it('works', async() => {
          const search = new ThronesSearch({
            sourceFields: { excludes: ['skills'] }
          })
          await search.execute()
          expect(search.results).to.deep.eq([
            { id: 1, bio: 'foo' }
          ])
        })
      })
    })

    describe('when a nested field', () => {
      it('works for individual subfields', async () => {
        const search = new ThronesSearch()
        search.sourceFields({ excludes: ['skills.description'] })
        await search.execute()
        expect(search.results).to.deep.eq([{
          id: 1,
          bio: 'foo',
          skills: [{
            name: 'knives'
          }]
        }])
      })

      describe('onlyHighlight', () => {
        beforeEach(async() => {
          await ThronesSearch.persist({
            skills: [
              {
                name: 'a',
                description: 'blah blah blah'
              },
              {
                name: 'b',
                description: 'bar foo baz'
              },
              {
                name: 'c',
                description: 'bark bark bark'
              }
            ]
          }, true)
        })

        it('only returns nested documents that have highlights', async () => {
          const search = new ThronesSearch()
          search.queries.skills.keywords.eq('foo')
          search.sourceFields({ onlyHighlights: ['skills'] })
          search.highlight('skills.description')
          await search.execute()
          expect(search.results).to.deep.eq([{
            skills: [{
              name: 'b',
              description: 'bar foo baz',
              _highlights: {
                description: ['bar <em>foo</em> baz']
              }
            }]
          }])
        })

        it('still respects includes', async () => {
          const search = new ThronesSearch()
          search.queries.skills.keywords.eq('foo')
          search.sourceFields({
            onlyHighlights: ['skills'],
            includes: ['skills.description']
          })
          search.highlight('skills.description')
          await search.execute()
          expect(search.results).to.deep.eq([{
            skills: [{
              description: 'bar foo baz',
              _highlights: {
                description: ['bar <em>foo</em> baz']
              }
            }]
          }])
        })

        it('still respects excludes', async () => {
          const search = new ThronesSearch()
          search.queries.skills.keywords.eq('foo')
          search.sourceFields({
            onlyHighlights: ['skills'],
            excludes: ['skills.description']
          })
          search.highlight('skills.description')
          await search.execute()
          expect(search.results).to.deep.eq([{
            skills: [{
              name: 'b',
              _highlights: {
                description: ['bar <em>foo</em> baz']
              }
            }]
          }])
        })
      })
    })

    describe('when multisearch', () => {
      describe('when not splitting', () => {
        describe('and the sourceField is on the MultiSearch', () => {
          describe('via direct assignment', () => {
            it('works', async() => {
              const thrones = new ThronesSearch()
              const search = new GlobalSearch()
              search.searchInstances = [thrones]
              search.sourceFields({ includes: ['bio'] })
              await search.execute()
              expect(search.results).to.deep.eq([{
                _type: 'thrones',
                bio: 'foo'
              }])
            })
          })

          describe('via constructor', () => {
            it('works', async() => {
              const search = new GlobalSearch({
                thrones: {},
                sourceFields: { includes: ['bio'] }
              })
              await search.execute()
              expect(search.results).to.deep.eq([{
                _type: 'thrones',
                bio: 'foo'
              }])
            })
          })
        })

        // Does not, and cannot work!
        // Fields must be top-level and not search-specific
        // TODO: throw a good error
        describe('and the sourceField is on the individual search', () => {
        })
      })

      describe('when splitting', () => {
        describe('and the sourceField is on the MultiSearch', () => {
          describe('via direct assignment', () => {
            it('works', async() => {
              const thrones = new ThronesSearch()
              const search = new GlobalSearch()
              search.searchInstances = [thrones]
              search.sourceFields({ includes: ['bio'] })
              search.split(1)
              await search.execute()
              expect(search.results).to.deep.eq([{
                _type: 'thrones',
                bio: 'foo'
              }])
            })
          })

          describe('via constructor', () => {
            it('works', async() => {
              const search = new GlobalSearch({
                thrones: {},
                sourceFields: { includes: ['bio'] },
                split: 1
              })
              await search.execute()
              expect(search.results).to.deep.eq([{
                _type: 'thrones',
                bio: 'foo'
              }])
            })
          })
        })

        // Does not, and cannot work!
        // Fields must be top-level and not search-specific
        // TODO: throw a good error
        describe('and the sourceField is on the individual search', () => {
        })
      })
    })

    describe('when multisearch AND nested', () => {
      beforeEach(async() => {
        await ThronesSearch.persist({
          skills: [
            {
              name: 'a',
              description: 'blah blah blah'
            },
            {
              name: 'b',
              description: 'bar foo baz'
            },
            {
              name: 'c',
              description: 'bark bark bark'
            }
          ]
        }, true)
      })

      describe('onlyHighlight', () => {
        describe('when highlights are on on MultiSearch', () => {
          it('works', async() => {
            const search = new GlobalSearch({
              highlights: [{ name: 'skills.description' }],
              thrones: {
                queries: {
                  skills: {
                    keywords: { eq: 'foo' }
                  }
                }
              },
              sourceFields: {
                onlyHighlights: ['skills'],
                excludes: ['skills.description']
              },
            })
            await search.execute()
            expect(search.results).to.deep.eq([{
              _type: 'thrones',
              skills: [{
                name: 'b',
                _highlights: {
                  description: ['bar <em>foo</em> baz']
                }
              }]
            }])
          })
        })

        describe('when highlights are on specific search', () => {
          it('works', async() => {
            const search = new GlobalSearch({
              thrones: {
                highlights: [{ name: 'skills.description' }],
                queries: {
                  skills: {
                    keywords: { eq: 'foo' }
                  }
                }
              },
              sourceFields: {
                onlyHighlights: ['skills'],
                excludes: ['skills.description']
              },
            })
            await search.execute()
            expect(search.results).to.deep.eq([{
              _type: 'thrones',
              skills: [{
                name: 'b',
                _highlights: {
                  description: ['bar <em>foo</em> baz']
                }
              }]
            }])
          })
        })
      })
    })
  })
})