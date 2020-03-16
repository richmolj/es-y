export class OrClause<ConditionT, ConditionsT> {
  conditions: ConditionsT
  protected condition: ConditionT
  protected value?: ConditionT

  constructor(condition: ConditionT, conditions: ConditionsT) {
    this.condition = condition
    this.conditions = conditions
  }

  toElastic() {
    let should = [] as any[]
    let must = [] as any[]
    let must_not = [] as any[]
    if (this.value) {
      should = (this.condition as any).toElastic().bool.should
    }
    const conditions = this.conditions as any
    const query = (this.conditions as any).buildQuery()
    if (query && query.bool) {
      const nested = query.bool.filter.bool.should[0].bool.must[0].bool
      if (nested.should.length > 0) {
        should = should.concat(nested.should)
      }

      if (nested.must.length > 0) {
        must = must.concat(nested.must)
      }

      if (nested.must_not.length > 0) {
        must_not = must_not.concat(nested.must_not)
      }

      return { must, should, must_not }
    } else {
      return { should }
    }
  }
}
