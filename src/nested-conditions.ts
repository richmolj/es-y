import { Conditions } from './conditions'
import { ClassHook } from './decorators'

@ClassHook()
export class NestedConditions extends Conditions {
  static nested: string
  protected _scoreMode?: 'avg' | 'max' | 'min' | 'sum' | 'none'

  scoreMode(mode: 'avg' | 'max' | 'min' | 'sum' | 'none'): this {
    this._scoreMode = mode
    return this
  }
}