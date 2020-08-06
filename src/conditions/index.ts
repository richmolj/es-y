import { ClassHook } from "../decorators"
import { OrClause } from "./or-clause"
import { AndClause } from "./and-clause"
import { NotClause } from "./not-clause"
import { Condition } from "./base"
import { EqCondition, StringEqConditionInput } from "./eq"
import { PrefixCondition, StringPrefixConditionInput } from "./prefix"
import { MatchCondition, MatchConditionInput } from "./match"
import { MatchPhraseCondition } from "./match-phrase"
import { NumericRangeCondition } from "./numeric-range"
import { DateRangeCondition } from "./date-range"
import { KeywordCondition } from "./keyword"
import { SimpleQueryStringCondition } from "./simple-query-string"
import { TextCondition } from "./text"
import { NumericCondition, NumericConditionInput } from "./numeric"
import { DateCondition, DateConditionInput } from "./date"
import { buildConditions } from "./builder"
import { Search } from "../search"
import { buildHighlightRequest } from "../util/highlighting"
import { sourceFieldsRequestPayload } from "../util/source-fields"
import { buildNestedQueryPayloads } from "../util/nesting"

@ClassHook()
class Conditions {
  isConditions = true
  protected klass!: typeof Conditions
  static currentClass: typeof Conditions = Conditions
  protected _not!: Conditions
  protected _or!: Conditions
  protected isQuery: boolean = false
  protected search!: Search

  keywords = new SimpleQueryStringCondition<this>("", this)

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

  protected get elasticContext(): 'filter' | 'query' {
    if (this.isQuery) {
      return 'query'
    } else {
      return 'filter'
    }
  }

  protected nestedConditions() {
    const _this = this as any
    return Object.keys(this)
      .filter(k => _this[k].isConditions && k !== '_not' && k !== '_or')
      .map(k => _this[k])
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

    const nestedPayloads = buildNestedQueryPayloads(this)
    nestedPayloads.forEach((nested) => {
      must = must.concat({ nested })
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
        [this.elasticContext]: {
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

  protected build(input?: any) {
    buildConditions(this, input)
  }
}

export {
  Conditions,
  OrClause,
  AndClause,
  NotClause,
  Condition,
  EqCondition,
  PrefixCondition,
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
  SimpleQueryStringCondition,
}
