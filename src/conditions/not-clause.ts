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

  get elasticContext() {
    return (this.conditions as any).elasticContext
  }

  protected async toElastic() {
    let should = [] as any[]
    if (this.value) {
      should = (await (this.condition as any).toElastic()).bool.should
    }
    const conditions = this.conditions as any
    const query = await (this.conditions as any).buildQuery()
    if (query && query.bool) {
      if (should.length > 0) {
        query.bool[this.elasticContext].bool.must[0].bool.should = query.bool[this.elasticContext].bool.must[0].bool.should.concat(should)
      }
      return query.bool[this.elasticContext].bool.must[0].bool
    } else {
      return { should }
    }
  }
}
