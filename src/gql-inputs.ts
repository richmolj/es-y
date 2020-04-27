import * as fs from "fs"
import * as rimraf from "rimraf"
import { Search } from "./search"
import { MultiSearch } from "./multi-search"

function eachCondition(klass: typeof Search, callback: Function) {
  const instance = new klass.conditionsClass()
  Object.keys(instance).forEach(k => {
    if (k === "_or" || k === "_not" || k === "isQuery") {
      return
    }
    const value = (instance as any)[k]
    const conditionType = value.klass.type
    callback(k, conditionType, value)
  })
}

function generateConditionInputs(klass: typeof Search): string {
  let inputs = ''
  const instance = new klass()
  const name = instance.constructor.name

  eachCondition(klass, (conditionName: string, type: string, condition: any) => {
    if (type === "keyword" || type === "query") {
      inputs = inputs.concat(`
@Field(type => ${name}KeywordConditionInput, { nullable: true })
${conditionName}!: ${name}KeywordConditionInput
      `)
    }

    if (type == "text") {
      inputs = inputs.concat(`
@Field(type => ${name}TextConditionInput, { nullable: true })
${conditionName}!: ${name}TextConditionInput
      `)
    }

    if (type == "numeric") {
      inputs = inputs.concat(`
@Field(type => ${name}NumericConditionInput, { nullable: true })
${conditionName}!: ${name}NumericConditionInput
      `)
    }

    if (type == "date") {
      inputs = inputs.concat(`
@Field(type => ${name}DateConditionInput, { nullable: true })
${conditionName}!: ${name}DateConditionInput
      `)
    }
  })

  return inputs
}

function generateMultiSearchInput(klass: typeof MultiSearch, name: string) {
  let searchInput = `
import { InputType, Field } from 'type-graphql'
import { ${name}TermsInput } from './aggregations/terms'
  `

  Object.keys(klass.searches).forEach((k) => {
    const searchClass = klass.searches[k]
    const instance = new searchClass()
    const searchName = instance.constructor.name

    searchInput = searchInput.concat(`
import { ${searchName}Input } from '../${searchName}'
    `)
  })

  searchInput = searchInput.concat(`
@InputType()
export class ${name}AggregationsInput {
  @Field({ nullable: true })
  sum!: string

  @Field({ nullable: true })
  avg!: string

  @Field(type => ${name}TermsInput, { nullable: true })
  terms!: ${name}TermsInput[]
}

@InputType()
class ${name}PaginationInput {
  @Field({ nullable: true })
  size!: number

  @Field({ nullable: true })
  number!: number
}

@InputType()
class ${name}SortInput {
  @Field()
  att!: string

  // todo: enum
  @Field()
  dir!: string
}

@InputType()
class SimpleKeywordsInput {
  @Field()
  eq!: string

  @Field(type => [String], { nullable: true })
  fields!: string[]
}

@InputType()
class ${name}ConditionsInput {
  @Field(type => SimpleKeywordsInput)
  keywords!: SimpleKeywordsInput
}

@InputType()
export class ${name}Input {
  @Field({ nullable: true })
  split!: number

  // TODO shared fields
  @Field(type => ${name}ConditionsInput, { nullable: true })
  filters!: ${name}ConditionsInput

  @Field(type => ${name}ConditionsInput, { nullable: true })
  queries!: ${name}ConditionsInput

  @Field(type => ${name}PaginationInput, { nullable: true })
  page!: ${name}PaginationInput

  @Field(type => [${name}SortInput], { nullable: true })
  sort!: ${name}SortInput[]

  @Field(type => ${name}AggregationsInput, { nullable: true })
  aggregations!: ${name}AggregationsInput
  `)

  Object.keys(klass.searches).forEach((k) => {
    const searchClass = klass.searches[k]
    const instance = new searchClass()
    const searchName = instance.constructor.name
    searchInput = searchInput.concat(`
  @Field(type => ${searchName}Input, { nullable: true })
  ${k}!: ${searchName}Input
    `)
  })

  searchInput = searchInput.concat(`
}
  `)

  fs.writeFileSync(`src/search-inputs/${name}/index.ts`, searchInput)
}

function generateSearchInput(klass: typeof Search, name: string) {
  let searchInput = `
import { InputType, Field } from 'type-graphql'
import { ${name}KeywordConditionInput } from './conditions/keyword'
import { ${name}TextConditionInput } from './conditions/text'
import { ${name}NumericConditionInput } from './conditions/numeric'
import { ${name}DateConditionInput } from './conditions/date'
import { ${name}TermsInput } from './aggregations/terms'

@InputType()
class ${name}SimpleQueryStringConditionInput {
  @Field()
  eq!: string

  @Field(type => [String], { nullable: true })
  fields!: string[]
}

@InputType()
export class ${name}ConditionsInput {
  @Field(type => ${name}ConditionsInput, { nullable: true })
  not!: ${name}ConditionsInput

  @Field(type => ${name}ConditionsInput, { nullable: true })
  or!: ${name}ConditionsInput

  ${generateConditionInputs(klass)}
    `

  searchInput = searchInput.concat(`
}

@InputType()
export class ${name}AggregationsInput {
  @Field({ nullable: true })
  sum!: string

  @Field({ nullable: true })
  avg!: string

  @Field(type => ${name}TermsInput, { nullable: true })
  terms!: ${name}TermsInput[]
}

@InputType()
class ${name}PaginationInput {
  @Field({ nullable: true })
  size!: number

  @Field({ nullable: true })
  number!: number
}

@InputType()
class ${name}SortInput {
  @Field()
  att!: string

  // todo: enum
  @Field()
  dir!: string
}

@InputType()
export class ${name}Input {
  @Field(type => ${name}ConditionsInput, { nullable: true })
  filters!: ${name}ConditionsInput

  @Field(type => ${name}ConditionsInput, { nullable: true })
  queries!: ${name}ConditionsInput

  @Field(type => ${name}PaginationInput, { nullable: true })
  page!: ${name}PaginationInput

  @Field(type => [${name}SortInput], { nullable: true })
  sort!: ${name}SortInput[]

  @Field(type => ${name}AggregationsInput, { nullable: true })
  aggregations!: ${name}AggregationsInput

  @Field({ nullable: true })
  boost!: number
}
  `)
  fs.writeFileSync(`src/search-inputs/${name}/index.ts`, searchInput)
}

function generateKeywordInput(klass: typeof Search, name: string) {
  const keywordContent = `
import { Field, InputType } from 'type-graphql'
import { ${name}KeywordOrInput } from './keyword-or'
import { ${name}KeywordAndInput } from './keyword-and'

@InputType()
export class ${name}KeywordNotInput {
  @Field({ nullable: true })
  eq?: string

  @Field({ nullable: true })
  boost?: number
}

@InputType()
export class ${name}KeywordConditionInput {
  @Field({ nullable: true })
  eq?: string

  @Field({ nullable: true })
  boost?: number

  @Field({ nullable: true })
  and?: ${name}KeywordAndInput

  @Field({ nullable: true })
  or?: ${name}KeywordOrInput

  @Field({ nullable: true })
  not?: ${name}KeywordNotInput
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/keyword.ts`, keywordContent)

  const keywordOrContent = `
import { Field, InputType } from 'type-graphql'
import { ${name}KeywordConditionInput } from './keyword'
import { ${name}TextConditionInput } from './text'
import { ${name}NumericConditionInput } from './numeric'
import { ${name}DateConditionInput } from './date'

@InputType()
export class ${name}KeywordOrInput {
  @Field({ nullable: true })
  eq?: string

  @Field({ nullable: true })
  boost?: number

  ${generateConditionInputs(klass)}
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/keyword-or.ts`, keywordOrContent)

  const keywordAndContent = `
import { Field, InputType } from 'type-graphql'
import { ${name}KeywordConditionInput } from './keyword'
import { ${name}TextConditionInput } from './text'
import { ${name}NumericConditionInput } from './numeric'
import { ${name}DateConditionInput } from './date'

@InputType()
export class ${name}KeywordAndInput {
  ${generateConditionInputs(klass)}
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/keyword-and.ts`, keywordAndContent)
}

function generateTextInput(klass: typeof Search, name: string) {
  const textContent = `
import { Field, InputType } from 'type-graphql'
import { ${name}TextOrInput } from './text-or'
import { ${name}TextAndInput } from './text-and'

@InputType()
export class ${name}TextNotInput {
  @Field({ nullable: true })
  match?: string

  @Field({ nullable: true })
  matchPhrase?: string

  @Field({ nullable: true })
  boost?: number
}

@InputType()
export class ${name}TextConditionInput {
  @Field({ nullable: true })
  match?: string

  @Field({ nullable: true })
  matchPhrase?: string

  @Field({ nullable: true })
  boost?: number

  @Field({ nullable: true })
  and?: ${name}TextAndInput

  @Field({ nullable: true })
  or?: ${name}TextOrInput

  @Field({ nullable: true })
  not?: ${name}TextNotInput
}
    `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/text.ts`, textContent)

  const textOrContent = `
import { Field, InputType } from 'type-graphql'
import { ${name}KeywordConditionInput } from './keyword'
import { ${name}TextConditionInput } from './text'
import { ${name}NumericConditionInput } from './numeric'
import { ${name}DateConditionInput } from './date'

@InputType()
export class ${name}TextOrInput {
  @Field({ nullable: true })
  match?: string

  @Field({ nullable: true })
  matchPhrase?: string

  @Field({ nullable: true })
  boost?: number

  ${generateConditionInputs(klass)}
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/text-or.ts`, textOrContent)

  const textAndContent = `
import { Field, InputType } from 'type-graphql'
import { ${name}KeywordConditionInput } from './keyword'
import { ${name}TextConditionInput } from './text'
import { ${name}NumericConditionInput } from './numeric'
import { ${name}DateConditionInput } from './date'

@InputType()
export class ${name}TextAndInput {
  @Field({ nullable: true })
  match?: string

  @Field({ nullable: true })
  matchPhrase?: string

  @Field({ nullable: true })
  boost?: number

  ${generateConditionInputs(klass)}
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/text-and.ts`, textAndContent)
}

function generateNumericInput(klass: typeof Search, name: string) {
  const numericContent = `
import { Field, InputType } from 'type-graphql'
import { ${name}NumericOrInput } from './numeric-or'
import { ${name}NumericAndInput } from './numeric-and'

@InputType()
export class ${name}NumericNotInput {
  @Field({ nullable: true })
  eq?: number

  @Field({ nullable: true })
  boost?: number
}

@InputType()
export class ${name}NumericConditionInput {
  @Field({ nullable: true })
  eq?: number

  @Field({ nullable: true })
  gt?: number

  @Field({ nullable: true })
  gte?: number

  @Field({ nullable: true })
  lt?: number

  @Field({ nullable: true })
  lte?: number

  @Field({ nullable: true })
  boost?: number

  @Field({ nullable: true })
  and?: ${name}NumericAndInput

  @Field({ nullable: true })
  or?: ${name}NumericOrInput

  @Field({ nullable: true })
  not?: ${name}NumericNotInput
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/numeric.ts`, numericContent)

  const numericOrContent = `
import { Field, InputType } from 'type-graphql'
import { ${name}KeywordConditionInput } from './keyword'
import { ${name}TextConditionInput } from './text'
import { ${name}NumericConditionInput } from './numeric'
import { ${name}DateConditionInput } from './date'

@InputType()
export class ${name}NumericOrInput {
  @Field({ nullable: true })
  eq?: number

  @Field({ nullable: true })
  boost?: number

  ${generateConditionInputs(klass)}
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/numeric-or.ts`, numericOrContent)

  const numericAndContent = `
import { Field, InputType } from 'type-graphql'
import { ${name}KeywordConditionInput } from './keyword'
import { ${name}TextConditionInput } from './text'
import { ${name}NumericConditionInput } from './numeric'
import { ${name}DateConditionInput } from './date'

@InputType()
export class ${name}NumericAndInput {
  ${generateConditionInputs(klass)}
}
    `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/numeric-and.ts`, numericAndContent)
}

function generateDateInput(klass: typeof Search, name: string) {
  const dateContent = `
import { Field, InputType } from 'type-graphql'
import { ${name}DateOrInput } from './date-or'
import { ${name}DateAndInput } from './date-and'

@InputType()
export class ${name}DateNotInput {
  @Field({ nullable: true })
  eq?: number

  @Field({ nullable: true })
  boost?: number
}

@InputType()
export class ${name}DateConditionInput {
  @Field({ nullable: true })
  eq?: string

  @Field({ nullable: true })
  gt?: string

  @Field({ nullable: true })
  gte?: string

  @Field({ nullable: true })
  lt?: string

  @Field({ nullable: true })
  lte?: string

  @Field({ nullable: true })
  boost?: number

  @Field({ nullable: true })
  pastFiscalYears?: number

  @Field({ nullable: true })
  and?: ${name}DateAndInput

  @Field({ nullable: true })
  or?: ${name}DateOrInput

  @Field({ nullable: true })
  not?: ${name}DateNotInput
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/date.ts`, dateContent)

  const dateOrContent = `
import { Field, InputType } from 'type-graphql'
import { ${name}KeywordConditionInput } from './keyword'
import { ${name}TextConditionInput } from './text'
import { ${name}NumericConditionInput } from './numeric'
import { ${name}DateConditionInput } from './date'

@InputType()
export class ${name}DateOrInput {
  @Field({ nullable: true })
  eq?: string

  @Field({ nullable: true })
  boost?: number

  ${generateConditionInputs(klass)}
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/date-or.ts`, dateOrContent)

  const dateAndContent = `
import { Field, InputType } from 'type-graphql'
import { ${name}KeywordConditionInput } from './keyword'
import { ${name}TextConditionInput } from './text'
import { ${name}NumericConditionInput } from './numeric'
import { ${name}DateConditionInput } from './date'

@InputType()
export class ${name}DateAndInput {
  ${generateConditionInputs(klass)}
}
    `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/date-and.ts`, dateAndContent)
}

function generateTermsInput(klass: typeof Search | typeof MultiSearch, name: string) {
  const termsContent = `
import { ${name}AggregationsInput } from '../index'
import { Field, InputType } from 'type-graphql'

@InputType()
export class ${name}TermsInput {
  @Field({ nullable: true })
  name!: string

  @Field({ nullable: true })
  field!: string

  @Field({ nullable: true })
  size!: number

  @Field({ nullable: true })
  sum!: string

  @Field({ nullable: true })
  avg!: string

  @Field({ nullable: true })
  ensureQuality!: boolean

  @Field(type => [String], { nullable: true })
  order!: string[]

  @Field(type => [String], { nullable: true })
  sourceFields!: string[]

  @Field(type => [${name}AggregationsInput], { nullable: true })
  children!: ${name}AggregationsInput[]
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/aggregations/terms.ts`, termsContent)
}

function generateGqlInput(klass: typeof Search | typeof MultiSearch, name: string) {
  if (klass.isMultiSearch) {
    generateMultiSearchInput(klass as typeof MultiSearch, name)
    generateTermsInput(klass, name)
  } else {
    generateSearchInput(klass, name)
    generateKeywordInput(klass, name)
    generateTextInput(klass, name)
    generateNumericInput(klass, name)
    generateDateInput(klass, name)
    generateTermsInput(klass, name)
  }
}

export function generateGqlInputs(searchClasses: (typeof Search | typeof MultiSearch)[]) {
  const directory = "src/search-inputs"

  searchClasses.forEach(searchClass => {
    const instance = new searchClass()
    const searchName = instance.constructor.name
    rimraf.sync(`${directory}/${searchName}`)
    fs.mkdirSync(`${directory}/${searchName}`)
    fs.mkdirSync(`${directory}/${searchName}/conditions`, { recursive: true })
    fs.mkdirSync(`${directory}/${searchName}/aggregations`, { recursive: true })
    generateGqlInput(searchClass, searchName)
  })
}
