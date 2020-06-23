import { ClassHook } from "../decorators"
import { Condition } from "../conditions"
import { SimpleQueryClauseOptions } from '../types'

@ClassHook()
export class SimpleQueryStringCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "query"
  fields?: string[]
  combinator: 'and' | 'or' = 'or'

  eq(input: string, options?: SimpleQueryClauseOptions<ConditionsT>): any {
    this.value = input
    if (options && options.fields) {
      this.fields = options.fields
    }
    if (options && options.combinator) {
      this.combinator = options.combinator
    }
  }

  toElastic(): any {
    const payload = {
      query: this.value
    } as any

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