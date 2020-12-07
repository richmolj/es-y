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

// NOT before and/or
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
      // Support 'heavy' structure
      // match: { query: "foo bar baz", minimumShouldMatch: 2 }
      if (typeof value === 'object' && !Array.isArray(value)) {
        const { query } = value
        const options = omit(value, ACTIONS.concat('query'))
        condition = condition[action](query, options)
      } else {
        // Support 'light' structure
        // match: "foo bar baz", minimumShouldMatch: 2
        const options = omit(payload, ACTIONS)
        condition = condition[action](value, options)
      }
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

    let keys = Object.keys(omit(input, TOP_LEVEL_KEYS)) as string[]
    // Combinators go last
    keys = keys.sort((a: string, b: string) => {
      return COMBINATORS.includes(a) ? 1 : -1
    })

    keys.some(key => {
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
