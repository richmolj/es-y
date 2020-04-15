/* eslint-disable @typescript-eslint/unbound-method */
import { expect } from "chai"
import { ThronesSearch } from "../fixtures"

const index = ThronesSearch.index

describe("integration", () => {
  describe("results", () => {
    beforeEach(async () => {
      await ThronesSearch.client.index({
        index,
        body: {
          id: 1,
          otherId: 5,
          name: "Ned Stark",
          quote: "Winter is coming.",
        },
      })
      await ThronesSearch.client.indices.refresh({ index })
    })

    afterEach(async () => {
      await ThronesSearch.client.indices.delete({ index })
    })

    it("can execute basic query and get results", async () => {
      const search = new ThronesSearch()
      await search.execute()
      expect(search.results).to.deep.eq([
        {
          id: 1,
          name: "Ned Stark",
          otherId: 5,
          quote: "Winter is coming.",
        },
      ])
    })

    describe("meta", () => {
      beforeEach(async () => {
        await ThronesSearch.client.index({
          index,
          body: { id: 2, otherId: 4 },
        })
        await ThronesSearch.client.index({
          index,
          body: { id: 3, otherId: 3 },
        })
        await ThronesSearch.client.index({
          index,
          body: { id: 4, otherId: 2 },
        })
        await ThronesSearch.client.index({
          index,
          body: { id: 5, otherId: 1 },
        })
        await ThronesSearch.client.indices.refresh({ index })
      })

      describe("via direct assignment", () => {
        it("can set pagination", async () => {
          const search = new ThronesSearch()
          search.page.number = 2
          search.page.size = 2
          await search.execute()
          expect(search.results.length).to.eq(2)
          expect(search.results.map(r => r.id)).to.deep.eq([3, 4])
        })

        // aggregations
        it("can set page size to 0", async () => {
          const search = new ThronesSearch()
          search.page.size = 0
          await search.execute()
          expect(search.results.length).to.eq(0)
        })

        it("sets total entries", async () => {
          const search = new ThronesSearch()
          await search.execute()
          expect(search.total).to.eq(5)
        })

        it("can sort ascending", async () => {
          const search = new ThronesSearch()
          search.sort = [{ att: "otherId", dir: "asc" }]
          await search.execute()
          expect(search.results.map(r => r.id)).to.deep.eq([5, 4, 3, 2, 1])
        })

        it("can sort descending", async () => {
          const search = new ThronesSearch()
          search.sort = [{ att: "id", dir: "asc" }]
          await search.execute()
          expect(search.results.map(r => r.id)).to.deep.eq([1, 2, 3, 4, 5])
        })
      })

      describe("via constructor", () => {
        it("can set pagination", async () => {
          const search = new ThronesSearch({
            page: { size: 2, number: 2 },
          })
          await search.execute()
          expect(search.results.length).to.eq(2)
          expect(search.results.map(r => r.id)).to.deep.eq([3, 4])
        })

        it("can sort ascending", async () => {
          const search = new ThronesSearch({
            sort: [{ att: "otherId", dir: "asc" }],
          })
          await search.execute()
          expect(search.results.map(r => r.id)).to.deep.eq([5, 4, 3, 2, 1])
        })

        it("can sort descending", async () => {
          const search = new ThronesSearch({
            sort: [{ att: "id", dir: "asc" }],
          })
          await search.execute()
          expect(search.results.map(r => r.id)).to.deep.eq([1, 2, 3, 4, 5])
        })
      })
    })

    describe("when resultMetadata is true", () => {
      let original: boolean
      beforeEach(() => {
        original = ThronesSearch.resultMetadata
        ThronesSearch.resultMetadata = true
      })

      afterEach(() => {
        ThronesSearch.resultMetadata = original
      })

      it("assigns metadata to the results", async () => {
        const search = new ThronesSearch()
        await search.execute()
        const { meta } = search.results[0]
        expect(meta._id).to.not.be.null
        expect(meta._score).to.not.be.null
        expect(meta._type).to.eq("_doc")
        expect(meta._index).to.eq("game-of-thrones")
      })
    })

    describe("when transforming single result", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let original: any
      beforeEach(() => {
        original = (ThronesSearch.prototype as any).transformResult
        ;(ThronesSearch.prototype as any).transformResult = (result: any) => {
          return {
            saying: result.quote,
            character: result.name,
          }
        }
      })

      afterEach(() => {
        ;(ThronesSearch.prototype as any).transformResult = original
      })

      it("works", async () => {
        const search = new ThronesSearch()
        await search.execute()
        expect(search.results).to.deep.eq([
          {
            character: "Ned Stark",
            saying: "Winter is coming.",
          },
        ])
      })
    })

    describe("when transforming results", () => {
      let original: any
      beforeEach(() => {
        original = (ThronesSearch.prototype as any).transformResults
        ;(ThronesSearch.prototype as any).transformResults = (results: any[]) => {
          return [{ foo: "bar" }]
        }
      })

      afterEach(() => {
        ;(ThronesSearch.prototype as any).transformResults = original
      })

      it("works", async () => {
        const search = new ThronesSearch()
        await search.execute()
        expect(search.results).to.deep.eq([{ foo: "bar" }])
      })
    })
  })
})
