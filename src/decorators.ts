import { Search } from "./search"

export function ClassHook() {
  return (target: any) => {
    if (target.currentClass !== target) {
      target.currentClass.inherited(target)
    } else {
      target.inherited = (subclass: any) => {
        subclass.parentClass = target
        subclass.currentClass = subclass
        subclass.prototype.klass = subclass
      }
    }
    return target
  }
}

export function SearchClass() {
  return <T extends typeof Search>(target: T): T => {
    if (target.currentClass !== target) {
      target.currentClass.inherited(target)
    }
    return target
  }
}

export const ConditionsClass = (klass: any) => {
  return (target: any, prop: any) => {
    target.conditionsClass = klass
    return target
  }
}
