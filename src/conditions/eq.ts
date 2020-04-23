import { ClauseOptions } from './../types'
import { Condition } from "./base"

export class EqCondition<ConditionsT, ValueType> extends Condition<ConditionsT, ValueType> {
  eq(input: ValueType, options?: ClauseOptions): this {
    this.queryType = "term"
    this._setSimpleValue(input)
    if (options && options.boost) {
      this.boost = options.boost
    }
    return this
  }
}

interface JustEq {
  eq: string
}

interface ConditionInput<ConditionsT> {
  conditions: ConditionsT
}

export interface StringEqConditionInput<ConditionsT> {
  eq?: string
  not?: JustEq
  or?: JustEq | ConditionInput<ConditionsT>
}
