import { Condition } from "./base"

export class MatchCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "match"

  match(input: string): this {
    this.queryType = "match"
    this._setSimpleValue(input)
    return this
  }
}

interface JustMatches {
  match?: string
  matchPhrase?: string
}

interface ConditionInput<ConditionsT> {
  conditions: ConditionsT
}

export interface MatchConditionInput<ConditionsT> {
  match?: string
  matchPhrase?: string
  not?: JustMatches
  or?: JustMatches | ConditionInput<ConditionsT>
}
