import { applyMixins } from "../util"
import { Condition, NotClause, AndClause, OrClause, EqCondition, DateRangeCondition } from "../conditions"
import { ClassHook } from "../decorators"
import { RangeCondition, applyOrClause, applyAndClause, applyNotClause } from "./base"

class DateOrClause<ConditionT extends DateCondition<ConditionsT>, ConditionsT> extends OrClause<
  ConditionT,
  ConditionsT
> {
  eq(value: string) {
    this.value = this.condition.eq(value)
    return this.value
  }

  gt(value: string) {
    this.value = this.condition.gt(value)
    return this.value
  }

  gte(value: string) {
    this.value = this.condition.gte(value)
    return this.value
  }

  lt(value: string) {
    this.value = this.condition.lt(value)
    return this.value
  }

  lte(value: string) {
    this.value = this.condition.lte(value)
    return this.value
  }
}

class DateNotClause<ConditionT, ConditionsT> extends NotClause<ConditionT, ConditionsT> {
  eq(value: string) {
    this.value = (this.condition as any).eq(value)
    return this.originalCondition
  }
}

function getCurrentFiscalYear(): number {
  const today = new Date()
  if (today.getMonth() + 1 <= 3) {
    return today.getFullYear()
  } else {
    return today.getFullYear() + 1
  }
}

function derivePastFiscalYears(num: number): number[] {
  const currentYear = getCurrentFiscalYear()
  return [currentYear - num, currentYear]
}

class DateAndClause<ConditionT extends DateCondition<ConditionsT>, ConditionsT> extends AndClause<
  ConditionT,
  ConditionsT
> {}

@ClassHook()
export class DateCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "date"

  get and(): DateAndClause<this, ConditionsT> {
    return applyAndClause(this, DateAndClause)
  }

  get or(): DateOrClause<this, ConditionsT> {
    return applyOrClause(this, DateOrClause)
  }

  get not(): DateNotClause<this, ConditionsT> {
    return applyNotClause(this, DateNotClause)
  }

  pastFiscalYears(num: number) {
    const [startYear, endYear] = derivePastFiscalYears(num)
    const gte = `${startYear}-10-01T00:00:00.0`
    const lte = `${endYear}-09-30T23:59:59.999`
    return this.gte(gte).lte(lte)
  }
}
export interface DateCondition<ConditionsT>
  extends Condition<ConditionsT, string>,
    EqCondition<ConditionsT, string>,
    DateRangeCondition<ConditionsT> {}
applyMixins(DateCondition, [Condition, EqCondition, RangeCondition])

interface JustDate {
  eq?: string
  gt?: string
  gte?: string
  lt?: string
  lte?: string
}

interface ConditionInput<ConditionsT> {
  conditions: ConditionsT
}

export interface DateConditionInput<ConditionsT> {
  eq?: string
  gt?: string
  gte?: string
  lt?: string
  lte?: string
  not?: JustDate
  or?: JustDate | ConditionInput<ConditionsT>
}
