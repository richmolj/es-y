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
    if (type === "query") {
      inputs = inputs.concat(`
@Field(type => ${name}SimpleKeywordsInput, { nullable: true })
${conditionName}!: ${name}SimpleKeywordsInput
      `)
    }

    if (type === "keyword") {
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
import { ${name}DateHistogramInput } from './aggregations/date-histogram'
import { ${name}RangeInput } from './aggregations/range'
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
  @Field(type => [String, [String]], { nullable: true })
  sum!: string | string[]

  @Field(type => [String, [String]], { nullable: true })
  avg!: string | string[]

  @Field(type => [${name}TermsInput], { nullable: true })
  terms!: ${name}TermsInput[]

  @Field(type => [${name}DateHistogramInput], { nullable: true })
  dateHistograms!: ${name}DateHistogramInput[]

  @Field(type => [${name}RangeInput], { nullable: true })
  ranges!: ${name}RangeInput[]
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
class ${name}SimpleKeywordsInput {
  @Field()
  eq!: string

  @Field({ nullable: true })
  combinator!: string

  @Field(type => [String], { nullable: true })
  fields!: string[]
}

@InputType()
class ${name}ConditionsInput {
  @Field(type => ${name}SimpleKeywordsInput, { nullable: true })
  keywords!: ${name}SimpleKeywordsInput
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
import { ${name}DateHistogramInput } from './aggregations/date-histogram'
import { ${name}RangeInput } from './aggregations/range'
import { ${name}SimpleKeywordsInput } from './conditions/simple-keywords'
import { GraphQLJSONObject } from 'graphql-type-json'

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
  @Field(type => [String, [String]], { nullable: true })
  sum!: string | string[]

  @Field(type => [String, [String]], { nullable: true })
  avg!: string | string[]

  @Field(type => [${name}TermsInput], { nullable: true })
  terms!: ${name}TermsInput[]

  @Field(type => [${name}DateHistogramInput], { nullable: true })
  dateHistograms!: ${name}DateHistogramInput[]

  @Field(type => [${name}RangeInput], { nullable: true })
  ranges!: ${name}RangeInput[]
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

  // for multisearch
  @Field({ nullable: true })
  boost!: number

  @Field(type => GraphQLJSONObject, { nullable: true })
  scriptQuery!: any

  @Field(type => GraphQLJSONObject, { nullable: true })
  scriptScore!: any
}
  `)
  fs.writeFileSync(`src/search-inputs/${name}/index.ts`, searchInput)
}

function generateSimpleKeywordsInput(klass: typeof Search, name: string) {
  const content = `
import { Field, InputType } from 'type-graphql'

@InputType()
export class ${name}SimpleKeywordsInput {
  @Field()
  eq?: string

  @Field({ nullable: true })
  combinator?: string

  @Field(type => [String], { nullable: true })
  fields?: string[]
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/simple-keywords.ts`, content)
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
  prefix?: string

  @Field({ nullable: true })
  boost?: number
}

@InputType()
export class ${name}KeywordConditionInput {
  @Field({ nullable: true })
  eq?: string

  @Field({ nullable: true })
  prefix?: string

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
import { ${name}SimpleKeywordsInput } from './simple-keywords'

@InputType()
export class ${name}KeywordOrInput {
  @Field({ nullable: true })
  eq?: string

  @Field({ nullable: true })
  prefix?: string

  @Field({ nullable: true })
  boost?: number

  @Field({ nullable: true })
  or?: ${name}KeywordOrInput

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
import { ${name}SimpleKeywordsInput } from './simple-keywords'

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
import { ${name}SimpleKeywordsInput } from './simple-keywords'

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
import { ${name}SimpleKeywordsInput } from './simple-keywords'

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
import { ${name}SimpleKeywordsInput } from './simple-keywords'

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
import { ${name}SimpleKeywordsInput } from './simple-keywords'

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
import { ${name}SimpleKeywordsInput } from './simple-keywords'

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
import { ${name}SimpleKeywordsInput } from './simple-keywords'

@InputType()
export class ${name}DateAndInput {
  ${generateConditionInputs(klass)}
}
    `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/date-and.ts`, dateAndContent)
}

function generateDateHistogramInput(klass: typeof Search | typeof MultiSearch, name: string) {
  const dateHistogramContent = `
import { ${name}AggregationsInput } from '../index'
import { Field, InputType } from 'type-graphql'

@InputType()
export class ${name}DateHistogramInput {
  @Field()
  name!: string

  @Field(type => [String, [String]], { nullable: true })
  sum!: string | string[]

  @Field(type => [String, [String]] as const, { nullable: true })
  avg!: string | string[]

  @Field()
  interval!: string

  @Field({ nullable: true })
  field!: string

  @Field({ nullable: true })
  min_doc_count!: number

  @Field(type => [${name}AggregationsInput], { nullable: true })
  children!: ${name}AggregationsInput[]
}
`

  fs.writeFileSync(`src/search-inputs/${name}/aggregations/date-histogram.ts`, dateHistogramContent)
}

function generateRangeInput(klass: typeof Search | typeof MultiSearch, name: string) {
  const rangeContent = `
import { ${name}AggregationsInput } from '../index'
import { Field, InputType } from 'type-graphql'

@InputType()
class ${name}ToFrom {
  @Field({ nullable: true })
  from!: number

  @Field({ nullable: true })
  to!: number

  @Field({ nullable: true })
  key!: string
}

@InputType()
export class ${name}RangeInput {
  @Field()
  name!: string

  @Field(type => [String, [String]], { nullable: true })
  sum!: string | string[]

  @Field(type => [String, [String]], { nullable: true })
  avg!: string | string[]

  @Field({ nullable: true })
  min_doc_count!: number

  @Field(type => [${name}ToFrom], { nullable: true })
  ranges!: ${name}ToFrom[]

  @Field(type => [${name}AggregationsInput], { nullable: true })
  children!: ${name}AggregationsInput[]
}
  `

  fs.writeFileSync(`src/search-inputs/${name}/aggregations/range.ts`, rangeContent)
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
  min_doc_count!: number

  @Field({ nullable: true })
  size!: number

  @Field(type => [String, [String]], { nullable: true })
  sum!: string | string[]

  @Field(type => [String, [String]], { nullable: true })
  avg!: string | string[]

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
    generateDateHistogramInput(klass, name)
    generateRangeInput(klass, name)
  } else {
    generateSearchInput(klass, name)
    generateSimpleKeywordsInput(klass, name)
    generateKeywordInput(klass, name)
    generateTextInput(klass, name)
    generateNumericInput(klass, name)
    generateDateInput(klass, name)
    generateTermsInput(klass, name)
    generateDateHistogramInput(klass, name)
    generateRangeInput(klass, name)
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
