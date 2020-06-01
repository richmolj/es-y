import { expect } from "chai"
import { ThronesSearch } from "../fixtures"
import { setupIntegrationTest } from '../util'

const index = ThronesSearch.index

describe("integration", () => {
  setupIntegrationTest()

  describe("scripts", () => {
    beforeEach(async () => {
      await ThronesSearch.client.index({
        index,
        body: {
          id: 1,
          rating: 100,
          age: 5,
          quote: 'burn baby burn'
        },
      })
      await ThronesSearch.client.index({
        index,
        body: {
          id: 2,
          rating: 200,
          age: 2,
          quote: 'some quote'
        },
      })
      await ThronesSearch.client.indices.refresh({ index })
    })

    describe('saving', () => {
      it('works', async() => {
        const search = new ThronesSearch()
        await search.saveScript('foo', `doc['rating'] * 2`)
        const found = await search.findScript('foo')
        expect(found).to.deep.eq({
          lang: 'painless',
          source: `doc['rating'] * 2`
        })
      })
    })

    describe('deleting', () => {
      it('works', async() => {
        const search = new ThronesSearch()
        await search.saveScript('foo', `doc['rating'] * 2`)
        const found = await search.findScript('foo')
        expect(found.source).to.eq(`doc['rating'] * 2`)
        await search.deleteScript('foo')
        const found2 = await search.findScript('foo')
      })
    })

    describe('querying', () => {
      beforeEach(async () => {
        const search = new ThronesSearch()
        await search.saveScript('foo', `doc['rating'].value > params.ratingGt`)
        await search.saveScript('bar', `doc['rating'].value * doc['age'].value`)

        await ThronesSearch.client.index({
          index,
          body: {
            id: 3,
            rating: 400,
            age: 2,
            quote: 'burn you alive'
          },
        })
        await ThronesSearch.client.indices.refresh({ index })
      })

      describe('script query', () => {
        describe('with no conditions', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.scriptQuery({ id: 'foo', params: { ratingGt: 100 }})
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([2, 3])
          })
        })

        describe('with conditions', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.filters.quote.match("burn")
            search.scriptQuery({ id: 'foo', params: { ratingGt: 100 }})
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([3])
          })
        })

        describe('via constructor', () => {
          it('works', async() => {
            const search = new ThronesSearch({
              scriptQuery: {
                id: "foo",
                params: {
                  ratingGt: 100
                }
              }
            })
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([2, 3])
          })
        })
      })

      describe('script score', () => {
        describe('with no conditions', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.scriptScore({ id: 'bar', params: { ratingGt: 100 }})
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([3, 1, 2])
          })
        })

        describe('with conditions', () => {
          it('works', async() => {
            const search = new ThronesSearch()
            search.filters.quote.match("burn")
            search.scriptScore({ id: 'bar', params: { ratingGt: 100 }})
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([3, 1])
          })
        })

        describe('via constructor', () => {
          it('works', async() => {
            const search = new ThronesSearch({
              scriptScore: {
                id: 'bar',
                params: {
                  ratingGt: 100
                }
              }
            })
            await search.execute()
            expect(search.results.map(r => r.id)).to.deep.eq([3, 1, 2])
          })
        })
      })
    })
  })
})