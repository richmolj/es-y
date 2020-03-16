import { Condition } from "./base"

export class MatchPhraseCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "match_phrase"

  matchPhrase(input: string): this {
    this.queryType = "match_phrase"
    this._setSimpleValue(input)
    return this
  }
}
