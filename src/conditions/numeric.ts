import { applyMixins } from "../util"
import { Condition, NotClause, AndClause, OrClause, EqCondition, NumericRangeCondition } from "../conditions"
import { ClassHook } from "../decorators"
import { RangeCondition, applyOrClause, applyAndClause, applyNotClause } from "./base"

class NumericOrClause<ConditionT extends NumericCondition<ConditionsT>, ConditionsT> extends OrClause<
  ConditionT,
  ConditionsT
> {
  eq(value: number) {
    this.value = this.condition.eq(value)
    return this.value
  }

  gt(value: number) {
    this.value = this.condition.gt(value)
    return this.value
  }

  gte(value: number) {
    this.value = this.condition.gte(value)
    return this.value
  }

  lt(value: number) {
    this.value = this.condition.lt(value)
    return this.value
  }

  lte(value: number) {
    this.value = this.condition.lte(value)
    return this.value
  }
}

class NumericNotClause<ConditionT, ConditionsT> extends NotClause<ConditionT, ConditionsT> {
  eq(value: number) {
    this.value = (this.condition as any).eq(value)
    return this.originalCondition
  }
}

class NumericAndClause<ConditionT extends NumericCondition<ConditionsT>, ConditionsT> extends AndClause<
  ConditionT,
  ConditionsT
> {}

@ClassHook()
export class NumericCondition<ConditionsT> extends Condition<ConditionsT, number> {
  static type = "numeric"

  get and(): ConditionsT & NumericCondition<ConditionsT> {
    return applyAndClause(this, NumericAndClause)  as unknown as ConditionsT & NumericCondition<ConditionsT>
  }

  get or(): ConditionsT & NumericCondition<ConditionsT> {
    return applyOrClause(this, NumericOrClause) as unknown as ConditionsT & NumericCondition<ConditionsT>
  }

  get not(): NumericNotClause<this, ConditionsT> {
    return applyNotClause(this, NumericNotClause)
  }
}
export interface NumericCondition<ConditionsT>
  extends Condition<ConditionsT, number>,
    EqCondition<ConditionsT, number>,
    NumericRangeCondition<ConditionsT> {}
applyMixins(NumericCondition, [Condition, EqCondition, RangeCondition])

interface JustNumeric {
  eq?: number
  gt?: number
  gte?: number
  lt?: number
  lte?: number
}

interface ConditionInput<ConditionsT> {
  conditions: ConditionsT
}

export interface NumericConditionInput<ConditionsT> {
  eq?: number
  gt?: number
  gte?: number
  lt?: number
  lte?: number
  not?: JustNumeric
  or?: JustNumeric | ConditionInput<ConditionsT>
}
