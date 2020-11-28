import { OrClause } from "./or-clause"
import { AndClause } from "./and-clause"
import { NotClause } from "./not-clause"
import { applyMixins } from "../util"
import { ClassHook } from "../decorators"
import { PrefixOptions } from './prefix';
import { Condition, EqCondition, MatchCondition, PrefixCondition } from "../conditions"
import { applyOrClause, applyNotClause, applyAndClause } from "./base"

interface TermOptions {
  boost?: number
  caseInsensitive?: boolean
}

class KeywordNotClause<ConditionT extends KeywordCondition<ConditionsT>, ConditionsT> extends NotClause<
  ConditionT,
  ConditionsT
> {
  eq(value: string | string[], options?: TermOptions): ConditionT {
    this.value = this.condition.eq(value, options)
    return this.originalCondition
  }

  prefix(value: string | string[], options?: PrefixOptions): ConditionT {
    this.value = this.condition.prefix(value, options)
    return this.originalCondition
  }
}

class KeywordOrClause<ConditionT extends KeywordCondition<ConditionsT>, ConditionsT> extends OrClause<
  ConditionT,
  ConditionsT
> {
  eq(value: string | string[], options?: TermOptions) {
    this.value = this.condition.eq(value, options)
    return this.value
  }

  prefix(value: string | string[], options?: PrefixOptions) {
    this.value = this.condition.prefix(value, options)
    return this.value
  }

  get not(): KeywordNotClause<ConditionT, ConditionsT> {
    return applyNotClause(this.condition, KeywordNotClause)
  }
}

class KeywordAndClause<ConditionT extends KeywordCondition<ConditionsT>, ConditionsT> extends AndClause<
  ConditionT,
  ConditionsT
> {
  prefix(value: string | string[], options?: PrefixOptions) {
    this.value = this.condition.prefix(value, options)
    return this.value
  }
}

@ClassHook()
export class KeywordCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "keyword"

  get or(): ConditionsT & KeywordCondition<ConditionsT> {
    return applyOrClause(this, KeywordOrClause) as unknown as ConditionsT & KeywordCondition<ConditionsT>
  }

  get and(): ConditionsT & KeywordCondition<ConditionsT> {
    return applyAndClause(this, KeywordAndClause) as unknown as ConditionsT & KeywordCondition<ConditionsT>
  }

  get not(): KeywordNotClause<this, ConditionsT> {
    return applyNotClause(this, KeywordNotClause)
  }
}

export interface KeywordCondition<ConditionsT>
  extends Condition<ConditionsT, string>,
    EqCondition<ConditionsT, string>,
    PrefixCondition<ConditionsT, string> {}
applyMixins(KeywordCondition, [EqCondition, PrefixCondition, MatchCondition])