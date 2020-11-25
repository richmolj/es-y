import { Condition } from "./base"
import { ClauseOptions } from '../types'

export class MatchCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "match"

  match(input: string | string[], options?: any): this {
    this.queryType = "match"
    this._setSimpleValue(input)
    if (options) {
      this.elasticOptions = options
    }
    return this
  }
}

interface JustMatches {
  match?: string | string[]
  matchPhrase?: string | string[]
}

interface ConditionInput<ConditionsT> {
  conditions: ConditionsT
}

export interface MatchConditionInput<ConditionsT> {
  match?: string | string[]
  matchPhrase?: string | string[]
  not?: JustMatches
  or?: JustMatches | ConditionInput<ConditionsT>
}
