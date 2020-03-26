import { ClassHook } from "../decorators"
import { Condition, NotClause, AndClause, OrClause, MatchCondition, MatchPhraseCondition } from "."
import { applyMixins } from "../util"
import { applyOrClause, applyAndClause, applyNotClause } from "./base"

class TextOrClause<ConditionT extends TextCondition<ConditionsT>, ConditionsT> extends OrClause<
  ConditionT,
  ConditionsT
> {
  match(value: string) {
    this.value = this.condition.match(value)
    return this.value
  }

  matchPhrase(value: string) {
    this.value = this.condition.matchPhrase(value)
    return this.value
  }
}

class TextNotClause<ConditionT, ConditionsT> extends NotClause<ConditionT, ConditionsT> {
  match(value: string) {
    this.value = (this.condition as any).match(value)
    return this.originalCondition
  }

  matchPhrase(value: string) {
    this.value = (this.condition as any).matchPhrase(value)
    return this.originalCondition
  }
}

// TODO AND NESTING: maybe return original condition here, like "not"
class TextAndClause<ConditionT extends TextCondition<ConditionsT>, ConditionsT> extends AndClause<
  ConditionT,
  ConditionsT
> {
  match(value: string) {
    this.value = this.condition.match(value)
    return this.value
  }

  matchPhrase(value: string) {
    this.value = this.condition.matchPhrase(value)
    return this.value
  }
}

@ClassHook()
export class TextCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "text"

  get and(): ConditionsT & TextCondition<ConditionsT> {
    return applyAndClause(this, TextAndClause) as unknown as ConditionsT & TextCondition<ConditionsT>
  }

  get or(): ConditionsT & TextCondition<ConditionsT> {
    return applyOrClause(this, TextOrClause) as unknown as ConditionsT & TextCondition<ConditionsT>
  }

  get not(): TextNotClause<this, ConditionsT> {
    return applyNotClause(this, TextNotClause)
  }
}
export interface TextCondition<ConditionsT>
  extends Condition<ConditionsT, string>,
    MatchCondition<ConditionsT>,
    MatchPhraseCondition<ConditionsT> {}
applyMixins(TextCondition, [MatchCondition, MatchPhraseCondition])
