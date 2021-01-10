import { applyMixins } from "../util"
import { ClassHook } from "../decorators"
import { RangeOptions, RangeCondition, applyOrClause, applyAndClause, applyNotClause } from "./base"
import {
  Condition,
  NotClause,
  AndClause,
  OrClause,
  EqCondition,
  NumericRangeCondition,
  ExistsCondition,
} from "../conditions"

class NumericOrClause<ConditionT extends NumericCondition<ConditionsT>, ConditionsT> extends OrClause<
  ConditionT,
  ConditionsT
> {
  eq(value: number | number[], options?: RangeOptions) {
    this.value = this.condition.eq(value, options)
    return this.value
  }

  gt(value: number, options?: RangeOptions) {
    this.value = this.condition.gt(value, options)
    return this.value
  }

  gte(value: number, options?: RangeOptions) {
    this.value = this.condition.gte(value, options)
    return this.value
  }

  lt(value: number, options?: RangeOptions) {
    this.value = this.condition.lt(value, options)
    return this.value
  }

  lte(value: number, options?: RangeOptions) {
    this.value = this.condition.lte(value, options)
    return this.value
  }
}

class NumericNotClause<ConditionT, ConditionsT> extends NotClause<ConditionT, ConditionsT> {
  eq(value: number | number[], options?: RangeOptions) {
    this.value = (this.condition as any).eq(value, options)
    return this.originalCondition
  }

  exists(bool: boolean = true) {
    this.value = (this.condition as any).exists(bool)
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
    ExistsCondition<ConditionsT, number>,
    NumericRangeCondition<ConditionsT> {}
applyMixins(NumericCondition, [Condition, EqCondition, ExistsCondition, RangeCondition])

interface JustNumeric {
  eq?: number | number[]
  gt?: number
  gte?: number
  lt?: number
  lte?: number
  exists?: boolean
}

interface ConditionInput<ConditionsT> {
  conditions: ConditionsT
}

export interface NumericConditionInput<ConditionsT> {
  eq?: number | number[]
  gt?: number
  gte?: number
  lt?: number
  lte?: number
  exists?: boolean
  not?: JustNumeric
  or?: JustNumeric | ConditionInput<ConditionsT>
}
