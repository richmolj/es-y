export function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name) as any,
      )
    })
  })
}

export async function asyncForEach(array: any[], callback: Function) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

export function camelToSnake(str: string): string {
  return str.replace(/[\w]([A-Z])/g, (m) => {
      return `${m[0]}_${m[1]}`
  }).toLowerCase()
}

export function snakeifyObject(obj: null | undefined | Record<string, any>) {
  if (obj) {
    const newObj = {} as any
    Object.keys(obj).forEach((key) => {
      newObj[camelToSnake(key)] = obj[key]
    })
    return newObj
  }
}

export function transformRange(fn: Function) {
  return (value: any, condition: any) => {
    if (typeof value === 'object') {
      if (value.gt) value.gt = fn(value.gt)
      if (value.gte) value.gte = fn(value.gte)
      if (value.lt) value.lt = fn(value.lt)
      if (value.lte) value.lte = fn(value.lte)
      return value
    } else {
      return fn(value)
    }
  }
}