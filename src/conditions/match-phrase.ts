import { Condition } from "./base"
import { ClauseOptions } from '../types'

export class MatchPhraseCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "match_phrase"

  matchPhrase(input: string | string[], options?: ClauseOptions): this {
    this.queryType = "match_phrase"
    this._setSimpleValue(input)
    if (options) {
      this.elasticOptions = options
    }
    return this
  }
}
