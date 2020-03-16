import { ClassHook } from "../decorators"
import { OrClause } from "./or-clause"
import { AndClause } from "./and-clause"
import { NotClause } from "./not-clause"
import { Condition } from "./base"
import { EqCondition, StringEqConditionInput } from "./eq"
import { MatchCondition, MatchConditionInput } from "./match"
import { MatchPhraseCondition } from "./match-phrase"
import { NumericRangeCondition } from "./numeric-range"
import { DateRangeCondition } from "./date-range"
import { KeywordCondition } from "./keyword"
import { TextCondition } from "./text"
import { NumericCondition, NumericConditionInput } from "./numeric"
import { DateCondition, DateConditionInput } from "./date"

@ClassHook()
class Conditions {
  protected klass!: typeof Conditions
  static currentClass: typeof Conditions = Conditions
  protected _not!: Conditions
  protected _or!: Conditions

  get not(): this {
    if (this._not) {
      return this._not as this
    } else {
      this._not = new this.klass()
      return this._not as this
    }
  }

  get or(): this {
    if (this._or) {
      return this._or as this
    } else {
      this._or = new this.klass()
      return this._or as this
    }
  }

  protected buildQuery() {
    let must = [] as any[]
    let must_not = [] as any[]
    let should = [] as any[]

    if (this._not) {
      must_not = this._not.buildQuery().bool.filter.bool.should
    }

    if (this._or) {
      should = this._or.buildQuery().bool.filter.bool.should
    }

    const _this = this as any
    const presentConditions = Object.keys(this)
      .filter(k => _this[k].hasClause && _this[k].hasClause())
      .map(k => _this[k])

    presentConditions.forEach(c => {
      const clause = c.toElastic()
      must = must.concat(clause)
    })

    if (must.length > 0) {
      should.push({
        bool: {
          must,
        },
      })
    }

    const payload = {} as any
    if (must.length > 0 || must_not.length > 0 || should.length > 0) {
      payload.bool = {
        filter: {
          bool: {
            // must,
            should,
            must_not,
          },
        },
      }
    }
    return payload
  }

  // terrible code, make recursive and betterize
  private buildCondition(condition: any, payload: any) {
    Object.keys(payload).forEach(operator => {
      const value = payload[operator]
      if (operator === "not") {
        const keys = Object.keys(value)
        const subOperator = Object.keys(value)[0]
        let res = condition.not[subOperator](value[subOperator])
        if (keys.length > 1) {
          const k2 = keys[1] // and
          const v2 = value[k2]
          const k3 = Object.keys(v2)[0]
          const v3 = v2[k3]
          if (k3 === "conditions") {
            const k4 = Object.keys(v3)[0]
            const v4 = v3[k4]
            const k5 = Object.keys(v4)[0]
            const v5 = v4[k5]
            res = res[k2][k3][k4][k5](v5) // .and.conditions.name.eq("asdf")
          } else {
            res = res[k2][k3](v3) // .and.match("asdf")
          }
        }
      } else if (operator === "and") {
        const k = Object.keys(value)[0]
        const v = value[k]
        if (k === "conditions") {
          const subk = Object.keys(v)[0]
          const subv = v[subk]
          const subk2 = Object.keys(subv)[0]
          const subv2 = subv[subk2]
          if (subk2 === "not") {
            const subk3 = Object.keys(subv2)[0]
            const subv3 = subv2[subk3]
            condition.and.conditions[subk][subk2][subk3](subv3)
          } else {
            condition.and.conditions[subk][subk2](subv2)
          }
        } else {
          if (k === "not") {
            const subk = Object.keys(v)[0]
            const subv = v[subk]
            condition.and.not[subk](subv)
          } else {
            condition.and[k](v)
          }
        }
      } else if (operator === "or") {
        const k = Object.keys(value)[0]
        const v = value[k]
        if (k === "conditions") {
          const subk = Object.keys(v)[0]
          const subv = v[subk]
          const subk2 = Object.keys(subv)[0]
          const subv2 = subv[subk2]
          if (subk2 === "not") {
            const subk3 = Object.keys(subv2)[0]
            const subv3 = subv2[subk3]
            condition.or.conditions[subk][subk2][subk3](subv3)
          } else {
            condition.or.conditions[subk][subk2](subv2)
          }
        } else {
          condition.or[k](v)
        }
      } else {
        condition[operator](value)
      }
    })
  }

  protected build(input?: any) {
    if (input) {
      // TODO: automatic/ recursive
      Object.keys(input).forEach(key => {
        if (key === "not") {
          Object.keys(input.not).forEach(conditionName => {
            const condition = (this as any).not[conditionName]
            this.buildCondition(condition, input.not[conditionName])
          })
        } else if (key === "or") {
          Object.keys(input.or).forEach(conditionName => {
            const condition = (this as any).or[conditionName]
            this.buildCondition(condition, input.or[conditionName])
          })
        } else {
          const condition = (this as any)[key]
          this.buildCondition(condition, input[key])
        }
      })
    }
  }
}

export {
  Conditions,
  OrClause,
  AndClause,
  NotClause,
  Condition,
  EqCondition,
  StringEqConditionInput,
  MatchCondition,
  MatchConditionInput,
  MatchPhraseCondition,
  NumericRangeCondition,
  DateRangeCondition,
  KeywordCondition,
  TextCondition,
  NumericCondition,
  NumericConditionInput,
  DateCondition,
  DateConditionInput,
}
