import { Condition } from "./base"

export interface MatchOptions {
  analyzer?: string
  autoGenerateSynonymsPhraseQuery?: boolean
  fuzziness?: string
  maxExpansions?: number
  prefixLength?: number
  fuzzyTranspositions?: boolean
  fuzzyRewrite?: string
  lenient?: boolean
  operator?: 'OR' | 'AND'
  minimumShouldMatch?: number | string
  zeroTermsQuery?: 'none' | 'all'
  boost?: number
}

export class MatchCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "match"

  match(input: string | string[], options?: MatchOptions): this {
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
