import { expect } from "chai"
import { ThronesSearch, ThronesSearchConditions } from "../fixtures"
import { setupIntegrationTest } from '../util'
import {
  SearchClass,
  ClassHook,
  KeywordCondition,
  DateCondition,
  TextCondition,
  NumericCondition,
  Search,
  transformRange,
} from './../../src/index'

const index = ThronesSearch.index

@ClassHook()
class TransformedThronesSearchConditions extends ThronesSearchConditions {
  titleOrName = new KeywordCondition<this>("name", this, {
    transforms: [
      (value: any, condition: any) => {
        condition.or.title.eq(value)
      }
    ]
  })

  anyDate = new DateCondition<this>("created_at", this, {
    transforms: [
      (value: any, condition: any) => {
        condition.or.updatedAt.value = value
      }
    ]
  })

  alteredQuote = new TextCondition<this>("quote", this, {
    transforms: [
      (value: any, condition: any) => {
        return value.replace('boo-urns', 'burn')
      }
    ]
  })

  alteredAgeGranular = new NumericCondition<this>("age", this, {
    transforms: [
      (value: any, condition: any) => {
        if (typeof value === 'object') {
          if (value.gt) value.gt = value.gt * 10
          if (value.gte) value.gte = value.gte * 10
          if (value.lt) value.lt = value.lt * 10
          if (value.lte) value.lte = value.lte * 10
          return value
        } else {
          return value * 10
        }
      }
    ]
  })

  alteredAge = new NumericCondition<this>("age", this, {
    transforms: [
      transformRange((value: any) => {
        return value * 10
      })
    ]
  })

  boostAlteredQuote = new TextCondition<this>("quote", this, {
    transforms: [
      (value: any, condition: any) => {
        condition.elasticOptions = { boost: 5 }
        return value.replace('boo-urns', 'burn')
      }
    ]
  })

  expander = new KeywordCondition<this>("name", this, {
    transforms: [
      (value: any, condition: any) => {
        return ["one", "two", "three"]
      },
    ]
  })

  altered = new KeywordCondition<this>("name", this, {
    transforms: [
      (value: any, condition: any) => {
        return value.replace(/\./g, '+')
      },
      (value: any) => {
        return value.replace(/\+/g, '=').replace(/\*/g, '-')
      },
    ],
    // NB: dangerous override. If document, document value array
    toElastic(condition: any) {
      if (condition.value[0] === 'dontmindme') condition.value = ['bar']
      return { terms: { name: condition.value } }
    }
  })
}

@SearchClass()
class TransformedThronesSearch extends ThronesSearch {
  static conditionsClass = TransformedThronesSearchConditions
  filters!: TransformedThronesSearchConditions
  queries!: TransformedThronesSearchConditions
}

describe("integration", () => {
  setupIntegrationTest()

  describe("low-level toElastic override", () => {
    beforeEach(async () => {
      await TransformedThronesSearch.persist({
        id: 1,
        name: "foo",
        title: "bar",
      })
      await TransformedThronesSearch.persist({
        id: 2,
        name: "bar",
        title: "foo",
      })
      await TransformedThronesSearch.refresh()
    })

    it('works', async() => {
      const search = new TransformedThronesSearch()
      search.filters.altered.eq("dontmindme")
      await search.execute()
      expect(search.results.map((r) => r.id)).to.deep.eq([2])
    })

    it('can be blended with other conditions', async() => {
      const search = new TransformedThronesSearch()
      search.filters.altered.eq("dontmindme").or.name.eq("foo")
      await search.execute()
      expect(search.results.map((r) => r.id)).to.deep.eq([1, 2])
    })
  })

  describe('transforms', () => {
    describe('transforming values', () => {
      beforeEach(async () => {
        await TransformedThronesSearch.persist({
          id: 1,
          name: "foo",
          title: "bar"
        })
        await TransformedThronesSearch.persist({
          id: 2,
          name: "foo=bar=baz-bax",
        })
        await TransformedThronesSearch.refresh()
      })

      it('properly passes the transformed value', async () => {
        const search = new TransformedThronesSearch()
        search.filters.altered.eq("foo.bar.baz*bax")
        await search.execute()
        expect(search.results.map((r) => r.id)).to.deep.eq([2])
      })

      describe("when chained", () => {
        it('still works', async() => {
          const search = new TransformedThronesSearch()
          search.filters.name.eq("asdf").or.altered.eq("foo.bar.baz*bax")
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([2])
        })
      })

      describe('when passed an array', () => {
        beforeEach(async() => {
          await TransformedThronesSearch.persist({
            id: 17,
            name: "boo=bar=baz-bax",
          }, true)
        })

        it('processes one by one', async() => {
          const search = new TransformedThronesSearch()
          search.filters.altered.eq(["foo.bar.baz*bax", "boo.bar.baz*bax"])
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([2, 17])
        })
      })

      describe('when expanding', () => {
        beforeEach(async() => {
          await ThronesSearch.persist([{
            name: "one"
          },{
            name: "two"
          },{
            name: "three"
          },{
            name: "four"
          }], true)
        })

        describe('when passed array, expanding to larger array', () => {
          it('works', async() => {
            const search = new TransformedThronesSearch()
            search.filters.expander.eq(["one"])
            await search.execute()
            expect(search.results.map((r) => r.name)).to.deep.eq(["one", "two", "three"])
          })
        })

        describe('when single value, expanding to array', () => {
          it('works', async() => {
            const search = new TransformedThronesSearch()
            search.filters.expander.eq("one")
            await search.execute()
            expect(search.results.map((r) => r.name)).to.deep.eq(["one", "two", "three"])
          })
        })
      })
    })

    describe('transforming conditions', () => {
      beforeEach(async () => {
        await TransformedThronesSearch.persist({
          id: 1,
          name: "foo",
          created_at: '1980-01-01',
          updated_at: '1960-01-01',
          bio: "burn baby burn",
        })
        await TransformedThronesSearch.persist({
          id: 2,
          created_at: '1950-01-01',
          updated_at: '1960-01-01'
        })
        await TransformedThronesSearch.persist({
          id: 3,
          title: "foo",
          created_at: '1950-01-01',
          updated_at: '1980-01-01',
          quote: "burn baby burn",
        })
        await TransformedThronesSearch.refresh()
      })

      it('properly uses the transformed condition', async () => {
        const search = new TransformedThronesSearch()
        search.filters.titleOrName.eq('foo')
        await search.execute()
        expect(search.results.map((r) => r.id)).to.deep.eq([1, 3])
      })

      it('does not alter the condition after execution', async () => {
        const search = new TransformedThronesSearch()
        let condition = search.filters.titleOrName as any
        search.filters.titleOrName.eq("foo")
        const original = await condition.toElastic()
        const another = await condition.toElastic()
        expect(original).to.deep.eq(another)
      })

      describe("when chained", () => {
        it('still works', async() => {
          const search = new TransformedThronesSearch()
          search.filters.name.eq("asdf").or.titleOrName.eq("foo")
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([1, 3])
        })
      })

      describe('transforming ranges', () => {
        it('is still easy', async() => {
          const search = new TransformedThronesSearch()
          search.filters.anyDate.gt("1970-01-01")
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([1, 3])
        })
      })

      describe('with boosting', () => {
        describe('preserving an existing boost', () => {
          it('works', async() => {
            const search = new TransformedThronesSearch()
            search.queries
              .alteredQuote.match("boo-urns", { boost: 5 })
              .or.bio.match("burn")
            await search.execute()
            expect(search.results.map((r) => r.id)).to.deep.eq([3, 1])
          })
        })

        describe('applying boost during transform', () => {
          it('works', async() => {
            const search = new TransformedThronesSearch()
            search.queries
              .boostAlteredQuote.match("boo-urns")
              .or.bio.match("burn")
            await search.execute()
            expect(search.results.map((r) => r.id)).to.deep.eq([3, 1])
          })
        })
      })
    })

    describe('transforming ranges', () => {
      beforeEach(async() => {
        await ThronesSearch.persist([{
          id: 456,
          age: 20
        }, {
          id: 457,
          age: 30
        }], true)
      })

      describe('granular', () => {
        it('works for eq', async () => {
          const search = new TransformedThronesSearch()
          search.filters.alteredAgeGranular.eq(2)
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([456])
        })

        it('works for gt', async () => {
          const search = new TransformedThronesSearch()
          search.filters.alteredAgeGranular.gt(2)
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([457])
        })

        it('works for gte', async () => {
          const search = new TransformedThronesSearch()
          search.filters.alteredAgeGranular.gte(2)
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([456, 457])
        })

        it('works for lt', async () => {
          const search = new TransformedThronesSearch()
          search.filters.alteredAgeGranular.lt(3)
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([456])
        })

        it('works for lte', async () => {
          const search = new TransformedThronesSearch()
          search.filters.alteredAgeGranular.lte(3)
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([456, 457])
        })
      })

      describe('with helper', () => {
        it('works for eq', async () => {
          const search = new TransformedThronesSearch()
          search.filters.alteredAge.eq(2)
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([456])
        })

        it('works for gt', async () => {
          const search = new TransformedThronesSearch()
          search.filters.alteredAge.gt(2)
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([457])
        })

        it('works for gte', async () => {
          const search = new TransformedThronesSearch()
          search.filters.alteredAge.gte(2)
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([456, 457])
        })

        it('works for lt', async () => {
          const search = new TransformedThronesSearch()
          search.filters.alteredAge.lt(3)
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([456])
        })

        it('works for lte', async () => {
          const search = new TransformedThronesSearch()
          search.filters.alteredAge.lte(3)
          await search.execute()
          expect(search.results.map((r) => r.id)).to.deep.eq([456, 457])
        })
      })
    })
  })
})