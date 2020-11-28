import { Condition } from "./base"

export interface MatchPhraseOptions {
  slop?: number
  analyzer?: string
  zeroTermsQuery?: 'none' | 'all'
  boost?: number
}

export class MatchPhraseCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "match_phrase"

  matchPhrase(input: string | string[], options?: MatchPhraseOptions): this {
    this.queryType = "match_phrase"
    this._setSimpleValue(input)
    if (options) {
      this.elasticOptions = options
    }
    return this
  }
}
