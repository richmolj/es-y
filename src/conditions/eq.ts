import { Condition } from "./base"

export class EqCondition<ConditionsT, ValueType> extends Condition<ConditionsT, ValueType> {
  eq(input: ValueType | ValueType[], options?: any): this {
    this.queryType = "term"
    this._setSimpleValue(input)
    if (options) {
      this.elasticOptions = options
    }
    return this
  }
}

interface JustEq {
  eq: string | string[]
}

interface ConditionInput<ConditionsT> {
  conditions: ConditionsT
}

export interface StringEqConditionInput<ConditionsT> {
  eq?: string | string[]
  not?: JustEq
  or?: JustEq | ConditionInput<ConditionsT>
}
