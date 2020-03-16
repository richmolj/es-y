import { OrClause } from "./or-clause"
import { AndClause } from "./and-clause"
import { NotClause } from "./not-clause"
import { applyMixins } from "../util"
import { ClassHook } from "../decorators"
import { Condition, EqCondition, MatchCondition } from "../conditions"
import { applyOrClause, applyNotClause, applyAndClause } from "./base"

class KeywordNotClause<ConditionT extends KeywordCondition<ConditionsT>, ConditionsT> extends NotClause<
  ConditionT,
  ConditionsT
> {
  eq(value: string): ConditionT {
    this.value = this.condition.eq(value)
    return this.originalCondition
  }
}

class KeywordOrClause<ConditionT extends KeywordCondition<ConditionsT>, ConditionsT> extends OrClause<
  ConditionT,
  ConditionsT
> {
  eq(value: string) {
    this.value = this.condition.eq(value)
    return this.value
  }

  get not(): KeywordNotClause<ConditionT, ConditionsT> {
    return applyNotClause(this.condition, KeywordNotClause)
  }
}

class KeywordAndClause<ConditionT extends KeywordCondition<ConditionsT>, ConditionsT> extends AndClause<
  ConditionT,
  ConditionsT
> {}

@ClassHook()
export class KeywordCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "keyword"

  get or(): KeywordOrClause<this, ConditionsT> {
    return applyOrClause(this, KeywordOrClause)
  }

  get and(): KeywordAndClause<this, ConditionsT> {
    return applyAndClause(this, KeywordAndClause)
  }

  get not(): KeywordNotClause<this, ConditionsT> {
    return applyNotClause(this, KeywordNotClause)
  }
}

export interface KeywordCondition<ConditionsT>
  extends Condition<ConditionsT, string>,
    EqCondition<ConditionsT, string> {}
applyMixins(KeywordCondition, [EqCondition, MatchCondition])
