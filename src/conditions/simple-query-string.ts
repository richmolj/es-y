import { ClassHook } from "../decorators"
import { Condition } from "../conditions"
import { SimpleQueryClauseOptions } from '../types'
import { NotClause } from "./not-clause"
import { AndClause } from "./and-clause"
import { OrClause } from "./or-clause"
import { applyNotClause, applyOrClause, applyAndClause } from "./base"

class SimpleQueryStringNotClause<ConditionT extends SimpleQueryStringCondition<ConditionsT>, ConditionsT> extends NotClause<
  ConditionT,
  ConditionsT
> {
  eq(value: string | string[], options?: SimpleQueryClauseOptions<ConditionsT>): ConditionT {
    this.value = this.condition.eq(value, options)
    return this.originalCondition
  }
}

class SimpleQueryStringAndClause<ConditionT extends SimpleQueryStringCondition<ConditionsT>, ConditionsT> extends AndClause<
  ConditionT,
  ConditionsT
> {
  eq(value: string | string[], options?: SimpleQueryClauseOptions<ConditionsT>): ConditionT {
    this.value = this.condition.eq(value, options)
    return this.value as ConditionT
  }
}

class SimpleQueryStringOrClause<ConditionT extends SimpleQueryStringCondition<ConditionsT>, ConditionsT> extends OrClause<
  ConditionT,
  ConditionsT
> {
  eq(value: string | string[], options?: SimpleQueryClauseOptions<ConditionsT>): ConditionT {
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

  eq(input: string | string[], options?: SimpleQueryClauseOptions<ConditionsT>): this {
    this.value = input
    if (options && options.fields) {
      this.fields = options.fields
    }
    if (options && options.combinator) {
      this.combinator = options.combinator
    }
    if (options && options.boost) {
      this.boost = options.boost
    }
    return this
  }

  protected elasticClause(queryType: string, value: any, condition: any) {
    const payload = {
      query: this.value
    } as any

    if (this.boost) {
      payload.boost = this.boost
    }

    if (this.combinator) {
      payload.default_operator = this.combinator
    }

    if (this.fields) {
      let fields = this.fields
      fields = fields.map((field) => {
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