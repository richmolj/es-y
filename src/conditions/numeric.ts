import { applyMixins } from "../util"
import { Condition, NotClause, AndClause, OrClause, EqCondition, NumericRangeCondition } from "../conditions"
import { ClassHook } from "../decorators"
import { RangeCondition, applyOrClause, applyAndClause, applyNotClause } from "./base"
import { ClauseOptions } from '../types'

class NumericOrClause<ConditionT extends NumericCondition<ConditionsT>, ConditionsT> extends OrClause<
  ConditionT,
  ConditionsT
> {
  eq(value: number, options?: ClauseOptions) {
    this.value = this.condition.eq(value, options)
    return this.value
  }

  gt(value: number, options?: ClauseOptions) {
    this.value = this.condition.gt(value, options)
    return this.value
  }

  gte(value: number, options?: ClauseOptions) {
    this.value = this.condition.gte(value, options)
    return this.value
  }

  lt(value: number, options?: ClauseOptions) {
    this.value = this.condition.lt(value, options)
    return this.value
  }

  lte(value: number, options?: ClauseOptions) {
    this.value = this.condition.lte(value, options)
    return this.value
  }
}

class NumericNotClause<ConditionT, ConditionsT> extends NotClause<ConditionT, ConditionsT> {
  eq(value: number, options?: ClauseOptions) {
    this.value = (this.condition as any).eq(value, options)
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
