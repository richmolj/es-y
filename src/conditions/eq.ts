import { Condition } from "./base"

export class EqCondition<ConditionsT, ValueType> extends Condition<ConditionsT, ValueType> {
  eq(input: ValueType): this {
    this.queryType = "term"
    this._setSimpleValue(input)
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
