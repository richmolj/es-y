import { Condition } from "./base"

export interface PrefixOptions {
  rewrite?: string
  caseInsensitive?: boolean
  boost?: number
}

export class PrefixCondition<ConditionsT, ValueType> extends Condition<ConditionsT, ValueType> {
  prefix(input: ValueType | ValueType[], options?: PrefixOptions): this {
    this.queryType = "prefix"
    this._setSimpleValue(input)
    if (options) {
      this.elasticOptions = options
    }
    return this
  }
}

interface JustPrefix {
  prefix: string | string[]
}

interface ConditionInput<ConditionsT> {
  conditions: ConditionsT
}

export interface StringPrefixConditionInput<ConditionsT> {
  eq?: string | string[]
  not?: JustPrefix
  or?: JustPrefix | ConditionInput<ConditionsT>
}