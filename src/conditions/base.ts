import { OrClause } from "./or-clause"
import { AndClause } from "./and-clause"
import { NotClause } from "./not-clause"
import { ClassHook } from "../decorators"
import { Constructor } from "../util/util-types"
import { ClauseOptions } from '../types'
import { Search } from ".."
import cloneDeep = require('lodash/cloneDeep')

interface ConditionToElastic {
  (value: any): any // todo
}

interface TransformFunction {
  (value: any, condition: any): any // todo
}

interface Config {
  toElastic?: ConditionToElastic
  transforms?: TransformFunction[]
}

// TODO: Ideally, this class would have the .or function
// But it can't because types?
@ClassHook()
export class Condition<ConditionsT, ValueType> {
  protected _elasticField: string
  private conditions: ConditionsT
  protected queryType!: "term" | "prefix" | "match" | "match_phrase" | "range"
  protected value?: ValueType | ValueType[] | RangeConditionValue<ValueType>
  protected orClauses: OrClause<this, ConditionsT>[]
  protected andClauses: AndClause<this, ConditionsT>[]
  protected notClauses: NotClause<this, ConditionsT>[]
  protected klass!: typeof Condition
  protected config?: Config
  static currentClass: typeof Condition = Condition
  static type: string
  boost?: null | number

  constructor(elasticField: string, conditions: ConditionsT, config?: Config) {
    this._elasticField = elasticField
    this.conditions = conditions
    this.orClauses = []
    this.andClauses = []
    this.notClauses = []
    this.config = config
  }

  get elasticField() {
    let field = this._elasticField
    const nested = ((this.conditions as any).klass.nested)
    if (nested) {
      field = `${nested}.${field}`
    }
    return field
  }

  protected hasClause(): boolean {
    return !!this.value || (this as any).value === 0 || this.notClauses.length > 0
  }

  protected toElastic() {
    let must = [] as any
    let should = [] as any
    let must_not = [] as any
    let main
    let condition = this as Condition<ConditionsT, ValueType>
    let queryType = this.queryType

    if (
      ['numeric', 'date'].includes(condition.klass.type) &&
      !Array.isArray(condition.value) &&
      typeof condition.value == "object"
    ) {
      queryType = 'range'
    }

    if (condition.value || (condition.value as any) === 0) {
      if (this.config && this.config.transforms) {
        condition = this.applyTransforms() // NB condition is now duped
      }

      let values = condition.value as any[]
      if (Array.isArray(values)) {
        let should = [] as any[]
        values.forEach((v) => {
          should.push(this.elasticClause(queryType, v, condition))
        })
        main = { bool: { should } }
      } else {
        main = this.elasticClause(queryType, condition.value, condition)
      }
    }

    if (condition.config && condition.config.toElastic) {
      main = condition.config.toElastic(condition)
    }

    if (condition.andClauses.length > 0) {
      if (main) {
        must.push(main)
      }
      condition.andClauses.forEach((c: any) => {
        const esPayload = c.toElastic()

        // foo and (this)
        // foo and (this and that)
        if (esPayload && esPayload.must && esPayload.must.length > 0) {
          must = must.concat(esPayload.must)
        }

        // foo and (this or that)
        if (esPayload && esPayload.should && esPayload.should.length > 0) {
          const key = Object.keys(esPayload.should[0])[0]
          if (esPayload.should.length > 1 && Object.keys(esPayload.should[0][key])[0] === this.elasticField) {
            // within condition
            const anded = esPayload.should.shift()
            must = must.concat(anded)
            should = should.concat({
              bool: {
                must,
              }
            })
            should = should.concat(esPayload.should)
            must = []
          } else {
            // across conditions
            must = must.concat({
              bool: {
                should: esPayload.should,
              },
            })
          }
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

    if (condition.orClauses.length > 0) {
      condition.orClauses.forEach((c: any) => {
        const esPayload = c.toElastic()
        // Push to "should", because "or"

        if (esPayload && esPayload.must && esPayload.must.length > 0) {
          should = should.concat({ bool: { must: esPayload.must } })
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

    if (condition.notClauses.length > 0) {
      condition.notClauses.forEach((c: any) => {
        const esPayload = c.toElastic()
        if (esPayload && esPayload.should.length > 0) {
          // Push to "should", so we can accomodate "this OR NOT that" / "not this OR that"
          if (condition.orClauses.length > 0) {
            should = should.concat({
              bool: {
                must_not: esPayload.should,
              },
            })
          } else {
            must_not = must_not.concat(esPayload.should)
          }
        }
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

  protected dupe<ThisType extends Condition<ConditionsT, ValueType>>(this: ThisType, heavy: boolean = false): ThisType {
    if (heavy) {
      return cloneDeep(this)
    } else {
      let instance = new (this as any).klass(this._elasticField, this.conditions)
      instance.config = this.config
      return instance
    }
  }

  protected _setSimpleValue(val: ValueType | ValueType[]) {
    if (this.value) {
      throw new Error("Attempted to reassign value condition")
    }

    this.value = val
  }

  private applyTransforms(): this {
    let value = this.value
    const dupe = this.dupe(true)
    const config = this.config as Config
    const transforms = config.transforms as Function[]
    transforms.forEach((transform: Function) => {
      const result = transform(...[value, dupe])

      if (result || result === 0) {
        dupe.value = value = result
      }
    })
    return dupe
  }

  private elasticClause(queryType: string, value: any, condition: Condition<ConditionsT, ValueType>) {
    let main
    let clause
    if (condition.boost) {
      if (['numeric', 'date'].includes(condition.klass.type) && typeof value == "object") {
        clause = {
          [condition.elasticField]: { ...value, ...{ boost: condition.boost } }
        }
      } else {
        let boostKey = 'value'
        if (condition.klass.type === 'text') {
          boostKey = 'query'
        }
        clause = {
          [condition.elasticField]: {
            [boostKey]: value,
            boost: condition.boost
          }
        }
      }
    } else {
      clause = { [condition.elasticField]: value }
    }

    return { [queryType!]: clause }
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
  dupeConditions.setSearch((condition as any).conditions.search)
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
  dupeConditions.setSearch((condition as any).conditions.search)
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
  dupeConditions.setSearch((condition as any).conditions.search)
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
  gt(input: ValueType, options?: ClauseOptions): this {
    this._setValue(input, "gt", options)
    return this
  }

  gte(input: ValueType, options?: ClauseOptions): this {
    this._setValue(input, "gte", options)
    return this
  }

  lt(input: ValueType, options?: ClauseOptions): this {
    this._setValue(input, "lt", options)
    return this
  }

  lte(input: ValueType, options?: ClauseOptions): this {
    this._setValue(input, "lte", options)
    return this
  }

  protected _setValue(input: ValueType, type: ComparatorOperator, options?: ClauseOptions) {
    if (this.value) {
      if (isPrimitiveValue(this.value)) {
        throw new Error("Attempted to overwrite a previously set condition with a range condition")
      }

      this.value[type] = input
    } else {
      this.value = { [type]: input } as RangeConditionValue<ValueType>
    }

    if (options && options.boost) {
      this.boost = options.boost
    }
  }
}
