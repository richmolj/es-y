import { NotClause } from "."

export class AndClause<ConditionT, ConditionsT> {
  conditions: ConditionsT
  protected condition: ConditionT
  protected value?: ConditionT
  protected isNot = false

  constructor(condition: ConditionT, conditions: ConditionsT) {
    this.condition = condition
    this.conditions = conditions
  }

  get not(): this {
    this.isNot = true
    return this
  }

  toElastic() {
    let must = [] as any[]
    let must_not = [] as any[]
    let should = [] as any[]
    if (this.value) {
      const es = (this.condition as any).toElastic()

      if (es.bool.should.length > 1) {
        // or .and.match("a").or.match("b")
        should = should.concat(es.bool.should)
      } else {
        // default .and.eq("foo")
        must = must.concat(es.bool.should)
      }

      if (es.bool.must.length > 0) {
        // and .and.match('a').and.match('b')
        must = must.concat(es.bool.must)
      }

      // MUST NOT ADDING MUST
      if (es.bool.must_not.length > 0) {
        // and .and.match('a').and.match('b')
        must = must.concat(es.bool.must_not)
      }
    }
    const conditions = this.conditions as any
    const query = (this.conditions as any).buildQuery()
    if (
      query &&
      query.bool &&
      query.bool.filter &&
      query.bool.filter.bool &&
      query.bool.filter.bool.should &&
      query.bool.filter.bool.should.length > 0
    ) {
      const subQuery = query.bool.filter.bool.should[0].bool.must[0].bool
      console.log(JSON.stringify(subQuery, null, 2))
      // subQuery.bool.must[0].bool.must[0].bool.should
      // subQuery.bool.must[0].bool.should
      if (subQuery.must.length > 0) {
        should = should.concat({ bool: { must: subQuery.must } })
      }

      if (subQuery.should.length > 0) {
        should = should.concat(subQuery.should)
      }

      if (subQuery.must_not.length > 0) {
        must_not = must_not.concat(subQuery.must_not)
      }

      return { should, must_not }
    } else {
      if (this.isNot) {
        return { must_not: must }
      } else {
        return { must, should }
      }
    }
  }
}
