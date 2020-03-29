import { NotClause } from "."

export class AndClause<ConditionT, ConditionsT> {
  protected conditions: ConditionsT
  protected condition: ConditionT
  protected value?: ConditionT
  protected isNot = false

  constructor(condition: ConditionT, conditions: ConditionsT) {
    this.condition = condition
    this.conditions = conditions

    Object.keys(this.conditions).forEach((k) => {
      (this as any)[k] = (this.conditions as any)[k]
    })
  }

  get not(): this {
    this.isNot = true
    return this
  }

  get elasticContext() {
    return (this.conditions as any).elasticContext
  }

  protected toElastic() {
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
      query.bool[this.elasticContext] &&
      query.bool[this.elasticContext].bool &&
      query.bool[this.elasticContext].bool.should &&
      query.bool[this.elasticContext].bool.should.length > 0
    ) {
      const subQuery = query.bool[this.elasticContext].bool.should[0].bool.must[0].bool

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