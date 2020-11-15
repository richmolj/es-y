import { Conditions } from './conditions'
import { ClassHook } from './decorators'
import { Sort, Pagination } from './types'

@ClassHook()
export class NestedConditions extends Conditions {
  static nested: string
  protected _scoreMode?: 'avg' | 'max' | 'min' | 'sum' | 'none'
  page?: Pagination // elastic default is 3
  sort: Sort[] = []

  scoreMode(mode: 'avg' | 'max' | 'min' | 'sum' | 'none'): this {
    this._scoreMode = mode
    return this
  }
}