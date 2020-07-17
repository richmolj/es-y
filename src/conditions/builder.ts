// terrible code, needs betterization
function buildCondition(condition: any, payload: any) {
  Object.keys(payload).forEach(operator => {
    const value = payload[operator]
    if (operator === "not") {
      const keys = Object.keys(value)
      const subOperator = Object.keys(value)[0]
      let res: any

      if (value.boost) {
        res = condition.not[subOperator](value[subOperator], { boost: value.boost })
      } else {
        res = condition.not[subOperator](value[subOperator])
      }

      if (keys.length > 1) {
        const k2 = keys[1] // and
        const v2 = value[k2]
        if (k2 === "and") {
          const k3 = Object.keys(v2)[0]
          const v3 = v2[k3]
          if (typeof res.and[k3] === "function") {
            if (v2.boost) {
              res.and[k3](v3, { boost: v2.boost })
            } else {
              res.and[k3](v3)
            }
          } else {
            buildConditions(res.and, { [k3]: v3 })
          }
        } else {
          buildConditions(res[k2], v2)
        }
      }
    } else if (operator === "and") {
      const k = Object.keys(value)[0]
      const v = value[k]
      if (k === "not") {
        const subk = Object.keys(v)[0]
        const subv = v[subk]
        if (v.boost) {
          condition.and.not[subk](subv, { boost: v.boost })
        } else {
          condition.and.not[subk](subv)
        }
      } else {
        if (typeof condition.and[k] === "function") {
          if (v.boost) {
            condition.and[k](v, { boost: value.boost })
          } else {
            condition.and[k](v)
          }
        } else {
          buildConditions(condition.and, { [k]: v })
        }
      }
    } else if (operator === "or") {
      const k = Object.keys(value)[0]
      const v = value[k]
      if (typeof condition.or[k] === "function") {
        if (value.boost) {
          condition.or[k](v, { boost: value.boost })
        } else {
          condition.or[k](v)
        }
      } else {
        buildConditions(condition.or, { [k]: v })
      }
    } else {
      if (operator === "boost") {
        condition.boost = value
      } else if(operator === "fields") {
        condition.fields = value
      } else if(operator === "combinator") {
        condition.combinator = value
      } else {
        condition[operator](value)
      }
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
