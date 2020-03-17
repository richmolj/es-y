import { ClassHook } from "../decorators"
import { Condition } from "../conditions"

@ClassHook()
export class SimpleQueryStringCondition<ConditionsT> extends Condition<ConditionsT, string> {
  static type = "query"

  eq(input: string): any {
    this.value = input
  }

  toElastic(): any {
    return {
      simple_query_string: {
        query: this.value,
      },
    }
  }
}
