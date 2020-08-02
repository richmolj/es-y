import { ClauseOptions } from './../types'
import { Condition } from "./base"

export class PrefixCondition<ConditionsT, ValueType> extends Condition<ConditionsT, ValueType> {
  prefix(input: ValueType, options?: ClauseOptions): this {
    this.queryType = "prefix"
    this._setSimpleValue(input)
    if (options && options.boost) {
      this.boost = options.boost
    }
    return this
  }
}

interface JustPrefix {
  prefix: string
}

interface ConditionInput<ConditionsT> {
  conditions: ConditionsT
}

export interface StringPrefixConditionInput<ConditionsT> {
  eq?: string
  not?: JustPrefix
  or?: JustPrefix | ConditionInput<ConditionsT>
}