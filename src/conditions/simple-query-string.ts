import { ClassHook } from "../decorators"
import { Condition } from "../conditions"
import { SimpleQueryClauseOptions } from '../types'

@ClassHook()
export class SimpleQueryStringCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "query"
  fields?: string[]

  eq(input: string, options?: SimpleQueryClauseOptions<ConditionsT>): any {
    this.value = input
    if (options && options.fields) {
      this.fields = options.fields
    }
  }

  toElastic(): any {
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

      return {
        multi_match: {
          query: this.value,
          fields,
        },
      }
    } else {
      return {
        simple_query_string: {
          query: this.value,
        },
      }
    }
  }
}
