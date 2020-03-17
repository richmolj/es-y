import { OrClause } from "./or-clause"
import { AndClause } from "./and-clause"
import { NotClause } from "./not-clause"
import { ClassHook } from "../decorators"
import { Constructor } from "../util/util-types"

// TODO: Ideally, this class would have the .or function
// But it can't because types?
@ClassHook()
export class Condition<ConditionsT, ValueType> {
  protected elasticField: string
  private conditions: ConditionsT
  protected queryType?: "term" | "match" | "match_phrase" | "range"
  protected value?: ValueType | RangeConditionValue<ValueType>
  protected orClauses: OrClause<this, ConditionsT>[]
  protected andClauses: AndClause<this, ConditionsT>[]
  protected notClauses: NotClause<this, ConditionsT>[]
  protected klass!: typeof Condition
  static currentClass: typeof Condition = Condition
  static type: string

  constructor(elasticField: string, conditions: ConditionsT) {
    this.elasticField = elasticField
    this.conditions = conditions
    this.orClauses = []
    this.andClauses = []
    this.notClauses = []
  }

  protected hasClause(): boolean {
    return !!this.value || (this as any).value === 0 || this.notClauses.length > 0
  }

  protected toElastic() {
    let must = [] as any
    let should = [] as any
    let must_not = [] as any
    let main
    if (this.value || (this.value as any) === 0) {
      main = {
        [this.queryType!]: {
          [this.elasticField]: this.value,
        },
      }
    }

    if (this.andClauses.length > 0) {
      if (main) {
        must.push(main)
      }
      this.andClauses.forEach((c: any) => {
        const esPayload = c.toElastic()

        // foo and (this)
        // foo and (this and that)
        if (esPayload && esPayload.must && esPayload.must.length > 0) {
          must = must.concat(esPayload.must)
        }

        // foo and (this or that)
        if (esPayload && esPayload.should && esPayload.should.length > 0) {
          must = must.concat({
            bool: {
              should: esPayload.should,
            },
          })
        }

        // foo and (not that)
        if (esPayload && esPayload.must_not && esPayload.must_not.length > 0) {
          must_not = must_not.concat(esPayload.must_not)
        }
      })
    } else {
      if (main) {
        should.push(main)
      }
    }

    if (this.orClauses.length > 0) {
      this.orClauses.forEach((c: any) => {
        const esPayload = c.toElastic()
        // Push to "should", because "or"

        if (esPayload && esPayload.must && esPayload.must.length > 0) {
          must = must.concat(esPayload.must)
        }
        if (esPayload && esPayload.should && esPayload.should.length > 0) {
          should = should.concat(esPayload.should)
        }
        if (esPayload && esPayload.must_not && esPayload.must_not.length > 0) {
          // Push to "should", so we can accomodate "this OR NOT that"
          should = should.concat({
            bool: {
              must_not: esPayload.must_not,
            },
          })
        }
      })
    }

    if (this.notClauses.length > 0) {
      this.notClauses.forEach((c: any) => {
        const esPayload = c.toElastic()
        if (esPayload && esPayload.should.length > 0) {
          // Push to "should", so we can accomodate "this OR NOT that" / "not this OR that"
          if (this.orClauses.length > 0) {
            should = should.concat({
              bool: {
                must_not: esPayload.should,
              },
            })
          } else {
            must_not = must_not.concat(esPayload.should)
          }
        }

        // NEW: NOT AND
        // if (esPayload && esPayload.bool.must.length > 0) {
        //   must_not = must_not.concat(esPayload.bool.must)
        // }
      })
    }

    return {
      bool: {
        must,
        should,
        must_not,
      },
    }
  }

  protected dupe<ThisType extends Condition<ConditionsT, ValueType>>(this: ThisType): ThisType {
    return new (this as any).klass(this.elasticField, this.conditions)
  }

  protected _setSimpleValue(val: ValueType) {
    if (this.value) {
      throw new Error("Attempted to reassign value condition")
    }

    this.value = val
  }
}

function getConditionsClassConstructor<
  ConditionT extends Condition<ConditionsT, ValueType>,
  ConditionsT extends {},
  ValueType
>(cond: ConditionT) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (cond as any).conditions.klass
}

export function applyOrClause<
  Conditions,
  ValueType,
  Or extends OrClause<Condition<Conditions, ValueType>, Conditions>,
  OrClass extends Constructor<Or>
>(condition: Condition<Conditions, ValueType>, orClass: OrClass): Or {
  const conditionsKlass = getConditionsClassConstructor(condition)
  const dupe = (condition as any).dupe()
  const dupeConditions = new conditionsKlass()
  const clause = new orClass(dupe, dupeConditions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(condition as any).orClauses.push(clause)
  return clause
}

export function applyAndClause<
  Conditions,
  ValueType,
  And extends AndClause<Condition<Conditions, ValueType>, Conditions>,
  AndClass extends Constructor<And>
>(condition: Condition<Conditions, ValueType>, andClass: AndClass): And {
  const conditionsKlass = getConditionsClassConstructor(condition)
  const dupe = (condition as any).dupe()
  const dupeConditions = new conditionsKlass()
  const clause = new andClass(dupe, dupeConditions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(condition as any).andClauses.push(clause)
  return clause
}

export function applyNotClause<
  Conditions,
  ValueType,
  Not extends NotClause<Condition<Conditions, ValueType>, Conditions>,
  NotClass extends Constructor<Not>
>(condition: Condition<Conditions, ValueType>, notClass: NotClass): Not {
  const conditionsKlass = getConditionsClassConstructor(condition)
  const dupe = (condition as any).dupe()
  const dupeConditions = new conditionsKlass()
  const clause = new notClass(dupe, dupeConditions, condition)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(condition as any).notClauses.push(clause)
  return clause
}

export type ComparatorOperator = "gt" | "gte" | "lt" | "lte"
export type RangeConditionValue<ValueType> = Record<ComparatorOperator, ValueType | undefined>

function isPrimitiveValue<ValueType>(x: ValueType | RangeConditionValue<ValueType>): x is ValueType {
  return typeof x === "number" || typeof x === "string"
}

export class RangeCondition<ConditionsT, ValueType> extends Condition<ConditionsT, ValueType> {
  gt(input: ValueType): this {
    this._setValue(input, "gt")
    return this
  }

  gte(input: ValueType): this {
    this._setValue(input, "gte")
    return this
  }

  lt(input: ValueType): this {
    this._setValue(input, "lt")
    return this
  }

  lte(input: ValueType): this {
    this._setValue(input, "lte")
    return this
  }

  protected _setValue(input: ValueType, type: ComparatorOperator) {
    this.queryType = "range"
    if (this.value) {
      if (isPrimitiveValue(this.value)) {
        throw new Error("Attempted to overwrite a previously set condition with a range condition")
      }

      this.value[type] = input
    } else {
      this.value = { [type]: input } as RangeConditionValue<ValueType>
    }
  }
}
