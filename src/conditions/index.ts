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
import { asyncForEach } from "../util"

@ClassHook()
class Conditions {
  protected isConditions = true
  protected klass!: typeof Conditions
  static currentClass: typeof Conditions = Conditions
  protected _not!: Conditions
  protected _or!: Conditions
  protected isQuery: boolean = false
  protected search!: Search

  keywords = new SimpleQueryStringCondition<this>("", this)

  protected setSearch(search: Search) {
    this.search = search
    const _this = this as any
    Object.keys(this).forEach((k) => {
      if (_this[k].isConditions) { // nested conditions
        _this[k].search = search
      }
    })
  }

  get not(): this {
    if (this._not) {
      return this._not as this
    } else {
      this._not = new this.klass()
      this._not.setSearch(this.search)
      return this._not as this
    }
  }

  get or(): this {
    if (this._or) {
      return this._or as this
    } else {
      this._or = new this.klass()
      this._or.setSearch(this.search)
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

  protected async buildQuery() {
    let must = [] as any[]
    let must_not = [] as any[]
    let should = [] as any[]

    if (this._not) {
      must_not = (await this._not.buildQuery()).bool.filter.bool.should
    }

    if (this._or) {
      should = (await this._or.buildQuery()).bool.filter.bool.should
    }

    const _this = this as any
    const presentConditions = Object.keys(this)
      .filter(k => _this[k].hasClause && _this[k].hasClause())
      .map(k => _this[k])

    await asyncForEach(presentConditions, async (c: any) => {
      const clause = await c.toElastic()
      must = must.concat(clause)
    })

    const nestedPayloads = await buildNestedQueryPayloads(this)
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
