import omit = require('lodash/omit')
import pick = require('lodash/pick')

// Order matters! Process not then and/or LAST
const OPERATORS = [
  'eq',
  'prefix',
  'match',
  'matchPhrase',
  'gt',
  'gte',
  'lt',
  'lte',
  'pastFiscalYears',
]

const COMBINATORS = [
  'not',
  'and',
  'or'
]

const ACTIONS = OPERATORS.concat(COMBINATORS)

const TOP_LEVEL_KEYS = [
  'page',
  'sort',
  'scoreMode' // nested conditions
]

function buildCondition(condition: any, payload: any) {
  ACTIONS.forEach(action => {
    if (!payload[action]) return

    const value = payload[action]
    if (COMBINATORS.includes(action)) {
      buildConditions(condition[action], value)
    } else {
      const options = omit(payload, ACTIONS)
      condition = condition[action](value, options)
    }
  })
}

export function buildConditions(base: any, input: any) {
  if (input) {
    TOP_LEVEL_KEYS.forEach((topLevel) => {
      if (input[topLevel]) {
        if (typeof base[topLevel] === 'function') {
          base[topLevel](input[topLevel])
        } else {
          base[topLevel] = input[topLevel]
        }
      }
    })

    Object.keys(omit(input, TOP_LEVEL_KEYS)).some(key => {
      if (ACTIONS.includes(key)) {
        buildCondition(base, input)
        return true // rest is handled recursively
      } else {
        const condition = base[key]
        // Accomodate nested conditions
        if (condition.isConditions) {
          buildConditions(condition, input[key])
        } else {
          buildCondition(condition, input[key])
        }
      }
    })
  }
}
