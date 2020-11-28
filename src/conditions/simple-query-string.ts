import { ClassHook } from "../decorators"
import { Condition } from "../conditions"
import { NotClause } from "./not-clause"
import { AndClause } from "./and-clause"
import { OrClause } from "./or-clause"
import { snakeifyObject } from '../util'
import { applyNotClause, applyOrClause, applyAndClause } from "./base"

interface SimpleQueryStringOptions {
  fields?: string[]
  boost?: number
  allFields?: boolean
  analyzer?: string
  autoGenerateSynonymsPhraseQuery?: boolean
  flags?: string
  fuzzyMaxExpansions?: number
  fuzzyPrefixLength?: number
  fuzzyTranspositions?: boolean
  lenient?: boolean
  minimumShouldMatch?: string | number
  quoteFieldSuffix?: string
  // alias
  combinator?: 'and' | 'or',
  defaultOperator?: 'AND' | 'OR',
}

class SimpleQueryStringNotClause<ConditionT extends SimpleQueryStringCondition<ConditionsT>, ConditionsT> extends NotClause<
  ConditionT,
  ConditionsT
> {
  eq(value: string | string[], options?: SimpleQueryStringOptions): ConditionT {
    this.value = this.condition.eq(value, options)
    return this.originalCondition
  }
}

class SimpleQueryStringAndClause<ConditionT extends SimpleQueryStringCondition<ConditionsT>, ConditionsT> extends AndClause<
  ConditionT,
  ConditionsT
> {
  eq(value: string | string[], options?: SimpleQueryStringOptions): ConditionT {
    this.value = this.condition.eq(value, options)
    return this.value as ConditionT
  }
}

class SimpleQueryStringOrClause<ConditionT extends SimpleQueryStringCondition<ConditionsT>, ConditionsT> extends OrClause<
  ConditionT,
  ConditionsT
> {
  eq(value: string | string[], options?: SimpleQueryStringOptions): ConditionT {
    this.value = this.condition.eq(value, options)
    return this.value as ConditionT
  }

  get not(): SimpleQueryStringNotClause<ConditionT, ConditionsT> {
    return applyNotClause(this.condition, SimpleQueryStringNotClause)
  }
}


@ClassHook()
export class SimpleQueryStringCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "query"
  fields?: string[]
  combinator: 'and' | 'or' = 'or'
  boost?: number

  get not(): SimpleQueryStringNotClause<this, ConditionsT> {
    return applyNotClause(this, SimpleQueryStringNotClause)
  }

  get and(): ConditionsT & SimpleQueryStringCondition<ConditionsT> {
    return applyAndClause(this, SimpleQueryStringAndClause) as unknown as ConditionsT & SimpleQueryStringCondition<ConditionsT>
  }

  get or(): ConditionsT & SimpleQueryStringCondition<ConditionsT> {
    return applyOrClause(this, SimpleQueryStringOrClause) as unknown as ConditionsT & SimpleQueryStringCondition<ConditionsT>
  }

  eq(input: string | string[], options?: SimpleQueryStringOptions): this {
    this.value = input
    if (options) {
      this.elasticOptions = options
    }
    return this
  }

  // TODO: combine this to base
  protected elasticClause(queryType: string, value: any, condition: any) {
    const elasticOptions = snakeifyObject(this.elasticOptions)
    const payload = {
      query: this.value,
      ...elasticOptions
    } as any

    // legacy compat
    if (payload.combinator) {
      payload.default_operator = payload.combinator
      delete payload.combinator
    }

    if (payload.fields) {
      let fields = payload.fields
      fields = fields.map((field: string) => {
        const [name, boost] = field.split('^')
        const condition = (this as any).conditions[name];
        if (condition) {
          if (boost) {
            field = `${condition.elasticField}^${boost}`
          } else {
            field = condition.elasticField
          }
        } else {
          // TODO: raise error if unknown
        }
        return field
      })
      payload.fields = fields
    }

    return { simple_query_string: payload }
  }
}