// terrible code, needs betterization
function buildCondition(condition: any, payload: any) {
  Object.keys(payload).forEach(operator => {
    const value = payload[operator]
    if (operator === "not") {
      const keys = Object.keys(value)
      const subOperator = Object.keys(value)[0]
      let res = condition.not[subOperator](value[subOperator])
      if (keys.length > 1) {
        const k2 = keys[1] // and
        const v2 = value[k2]
        const k3 = Object.keys(v2)[0]
        const v3 = v2[k3]
        if (k3 === "conditions") {
          buildConditions(res[k2].conditions, v3)
        } else {
          res = res[k2][k3](v3) // .and.match("asdf")
        }
      }
    } else if (operator === "and") {
      const k = Object.keys(value)[0]
      const v = value[k]
      if (k === "conditions") {
        buildConditions(condition.and.conditions, v)
      } else {
        if (k === "not") {
          const subk = Object.keys(v)[0]
          const subv = v[subk]
          condition.and.not[subk](subv)
        } else {
          condition.and[k](v)
        }
      }
    } else if (operator === "or") {
      const k = Object.keys(value)[0]
      const v = value[k]
      if (k === "conditions") {
        buildConditions(condition.or.conditions, v)
      } else {
        condition.or[k](v)
      }
    } else {
      condition[operator](value)
    }
  })
}

export function buildConditions(base: any, input: any) {
  if (input) {
    Object.keys(input).forEach(key => {
      if (key === "not") {
        Object.keys(input.not).forEach(conditionName => {
          const condition = base.not[conditionName]
          buildCondition(condition, input.not[conditionName])
        })
      } else if (key === "or") {
        Object.keys(input.or).forEach(conditionName => {
          const condition = base.or[conditionName]
          buildCondition(condition, input.or[conditionName])
        })
      } else {
        const condition = base[key]
        buildCondition(condition, input[key])
      }
    })
  }
}
