export class NotClause<ConditionT, ConditionsT> {
  conditions: ConditionsT
  protected condition: ConditionT
  protected originalCondition: ConditionT
  protected value?: ConditionT

  // Need original condition for "not or"
  // ie foo.not('adf').or.conditions.bar.eq('other')
  constructor(condition: ConditionT, conditions: ConditionsT, originalCondition: ConditionT) {
    this.condition = condition
    this.conditions = conditions
    this.originalCondition = originalCondition
  }

  protected toElastic() {
    let should = [] as any[]
    if (this.value) {
      should = (this.condition as any).toElastic().bool.should
    }
    const conditions = this.conditions as any
    const query = (this.conditions as any).buildQuery()
    if (query && query.bool) {
      if (should.length > 0) {
        query.bool.filter.bool.must[0].bool.should = query.bool.filter.bool.must[0].bool.should.concat(should)
      }
      return query.bool.filter.bool.must[0].bool
    } else {
      return { should }
    }
  }
}
