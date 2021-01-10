import { Condition } from "./base"

export class ExistsCondition<ConditionsT, ValueType> extends Condition<ConditionsT, ValueType> {
  exists(bool: boolean = true): this {
    this.queryType = "exists"
    this._setSimpleValue(bool as any)
    return this
  }
}

interface JustExists {
  exists: boolean
}

interface ConditionInput<ConditionsT> {
  conditions: ConditionsT
}

export interface ExistsConditionInput<ConditionsT> {
  exists?: boolean
  not?: JustExists
  or?: JustExists | ConditionInput<ConditionsT>
}
