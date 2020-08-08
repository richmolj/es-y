export class OrClause<ConditionT, ConditionsT> {
  conditions: ConditionsT
  protected condition: ConditionT
  protected value?: ConditionT

  constructor(condition: ConditionT, conditions: ConditionsT) {
    this.condition = condition
    this.conditions = conditions

    Object.keys(this.conditions).forEach((k) => {
      (this as any)[k] = (this.conditions as any)[k]
    })
  }

  get elasticContext() {
    return (this.conditions as any).elasticContext
  }

  protected toElastic() {
    let should = [] as any[]
    let must = [] as any[]
    let must_not = [] as any[]
    if (this.value) {
      let esPayload = (this.condition as any).toElastic().bool
      must = must.concat(esPayload.must)
      should = should.concat(esPayload.should)
      must_not = must_not.concat(esPayload.must_not)
    }
    const conditions = this.conditions as any
    const query = (this.conditions as any).buildQuery()
    if (query && query.bool) {
      const baseClause = query.bool[this.elasticContext].bool.should[0].bool.must[0]
      if (baseClause.bool) {
        if (baseClause.bool.should.length > 0) {
          should = should.concat(baseClause.bool.should)
        }

        if (baseClause.bool.must.length > 0) {
          must = must.concat(baseClause.bool.must)
        }

        if (baseClause.bool.must_not.length > 0) {
          must_not = must_not.concat(baseClause.bool.must_not)
        }
      } else if (baseClause.nested) {
        should = should.concat(baseClause)
      }
    }

    return { must, should, must_not }
  }
}
