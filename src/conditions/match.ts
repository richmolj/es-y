import { Condition } from "./base"
import { ClauseOptions } from '../types'

export class MatchCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "match"

  match(input: string, options?: ClauseOptions): this {
    this.queryType = "match"
    this._setSimpleValue(input)
    if (options && options.boost) {
      this.boost = options.boost
    }
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
