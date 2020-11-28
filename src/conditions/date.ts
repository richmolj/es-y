import { applyMixins } from "../util"
import { Condition, NotClause, AndClause, OrClause, EqCondition, DateRangeCondition } from "../conditions"
import { ClassHook } from "../decorators"
import { RangeCondition, applyOrClause, applyAndClause, applyNotClause } from "./base"

interface DateOptions {
  format?: string
  relation?: string
  timeZone?: string
  boost?: number
}

class DateOrClause<ConditionT extends DateCondition<ConditionsT>, ConditionsT> extends OrClause<
  ConditionT,
  ConditionsT
> {
  eq(value: string | string[], options?: DateOptions) {
    this.value = this.condition.eq(value, options)
    return this.value
  }

  gt(value: string, options?: DateOptions) {
    this.value = this.condition.gt(value, options)
    return this.value
  }

  gte(value: string, options?: DateOptions) {
    this.value = this.condition.gte(value, options)
    return this.value
  }

  lt(value: string, options?: DateOptions) {
    this.value = this.condition.lt(value, options)
    return this.value
  }

  lte(value: string, options?: DateOptions) {
    this.value = this.condition.lte(value, options)
    return this.value
  }
}

class DateNotClause<ConditionT, ConditionsT> extends NotClause<ConditionT, ConditionsT> {
  eq(value: string | string[], options?: DateOptions) {
    this.value = (this.condition as any).eq(value, options)
    return this.originalCondition
  }
}

function getCurrentFiscalYear(): number {
  const date = new Date()
  const fyOffset = 1000 * 60 * 60 * 24 * 92 // 92 days
  const fyDate = new Date(date.getTime() + fyOffset)
  return fyDate.getUTCFullYear() // use UTC or we get the wrong FY on Oct 1 (data-side dates are EDT)
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

  get and(): ConditionsT & DateCondition<ConditionsT> {
    return applyAndClause(this, DateAndClause) as unknown as ConditionsT & DateCondition<ConditionsT>
  }

  get or(): ConditionsT & DateCondition<ConditionsT> {
    return applyOrClause(this, DateOrClause) as unknown as ConditionsT & DateCondition<ConditionsT>
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
  eq?: string | string[]
  gt?: string
  gte?: string
  lt?: string
  lte?: string
}

interface ConditionInput<ConditionsT> {
  conditions: ConditionsT
}

export interface DateConditionInput<ConditionsT> {
  eq?: string | string[]
  gt?: string
  gte?: string
  lt?: string
  lte?: string
  not?: JustDate
  or?: JustDate | ConditionInput<ConditionsT>
}
