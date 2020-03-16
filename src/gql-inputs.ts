import * as fs from "fs"
import { Search } from "./search"

function generateSearchInput(klass: typeof Search, name: string) {
  let searchInput = `
import { InputType, Field } from 'type-graphql'
import { ${name}KeywordConditionInput } from './conditions/keyword'
import { ${name}TextConditionInput } from './conditions/text'
import { ${name}NumericConditionInput } from './conditions/numeric'
import { ${name}DateConditionInput } from './conditions/date'
import { ${name}TermsInput } from './aggregations/terms'
import { ${name}MetaInput } from './meta'

@InputType()
class ${name}SimpleQueryStringConditionInput {
  @Field()
  eq!: string
}

@InputType()
export class ${name}ConditionsInput {
  @Field(type => ${name}ConditionsInput, { nullable: true })
  not!: ${name}ConditionsInput

  @Field(type => ${name}ConditionsInput, { nullable: true })
  or!: ${name}ConditionsInput

  @Field(type => ${name}SimpleQueryStringConditionInput, { nullable: true })
  keywords!: ${name}SimpleQueryStringConditionInput
    `
  const instance = new klass.conditionsClass()
  Object.keys(instance).forEach(k => {
    if (k === "_or" || k === "_not") {
      return
    }
    const value = (instance as any)[k]
    const conditionType = value.klass.type

    if (conditionType == "keyword") {
      searchInput = searchInput.concat(`
  @Field(type => ${name}KeywordConditionInput, { nullable: true })
  ${k}!: ${name}KeywordConditionInput
      `)
    }

    if (conditionType == "text") {
      searchInput = searchInput.concat(`
  @Field(type => ${name}TextConditionInput, { nullable: true })
  ${k}!: ${name}TextConditionInput
      `)
    }

    if (conditionType == "numeric") {
      searchInput = searchInput.concat(`
  @Field(type => ${name}NumericConditionInput, { nullable: true })
  ${k}!: ${name}NumericConditionInput
      `)
    }

    if (conditionType == "date") {
      searchInput = searchInput.concat(`
  @Field(type => ${name}DateConditionInput, { nullable: true })
  ${k}!: ${name}DateConditionInput
      `)
    }
  })

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
export class ${name}Input {
  @Field(type => ${name}ConditionsInput, { nullable: true })
  conditions!: ${name}ConditionsInput

  @Field(type => ${name}MetaInput, { nullable: true })
  meta!: ${name}MetaInput

  @Field(type => ${name}AggregationsInput, { nullable: true })
  aggregations!: ${name}AggregationsInput
}
  `)
  fs.writeFileSync(`src/search-inputs/${name}/index.ts`, searchInput)
}

function generateMetaInput(klass: typeof Search, name: string) {
  const metaContent = `
import { Field, InputType } from 'type-graphql'

@InputType()
class ${name}Sort {
  @Field()
  att!: string
  @Field()
  dir!: string
}

@InputType()
export class ${name}MetaInput {
  @Field({ nullable: true })
  page?: number

  @Field({ nullable: true })
  perPage?: number

  @Field(type => [${name}Sort], { nullable: true })
  sort?: ${name}Sort[]
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/meta.ts`, metaContent)
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
}

@InputType()
export class ${name}KeywordConditionInput {
  @Field({ nullable: true })
  eq?: string

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
import { ${name}ConditionsInput } from '../index'
import { Field, InputType } from 'type-graphql'

@InputType()
export class ${name}KeywordOrInput {
  @Field(type => ${name}ConditionsInput, { nullable: true })
  conditions?: ${name}ConditionsInput

  @Field({ nullable: true })
  eq?: string
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/keyword-or.ts`, keywordOrContent)

  const keywordAndContent = `
import { ${name}ConditionsInput } from '../index'
import { Field, InputType } from 'type-graphql'

@InputType()
export class ${name}KeywordAndInput {
  @Field(type => ${name}ConditionsInput, { nullable: true })
  conditions?: ${name}ConditionsInput
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
  matchPhrase?: string
}

@InputType()
export class ${name}TextConditionInput {
  @Field({ nullable: true })
  match?: string

  @Field({ nullable: true })
  matchPhrase?: string

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
import { ${name}ConditionsInput } from '../index'
import { Field, InputType } from 'type-graphql'

@InputType()
export class ${name}TextOrInput {
  @Field({ nullable: true })
  match?: string

  @Field({ nullable: true })
  matchPhrase?: string

  @Field(type => ${name}ConditionsInput, { nullable: true })
  conditions?: ${name}ConditionsInput
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/text-or.ts`, textOrContent)

  const textAndContent = `
import { ${name}ConditionsInput } from '../index'
import { Field, InputType } from 'type-graphql'

@InputType()
export class ${name}TextAndInput {
  @Field({ nullable: true })
  match?: string

  @Field({ nullable: true })
  matchPhrase?: string

  @Field(type => ${name}ConditionsInput, { nullable: true })
  conditions?: ${name}ConditionsInput
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
  and?: ${name}NumericAndInput

  @Field({ nullable: true })
  or?: ${name}NumericOrInput

  @Field({ nullable: true })
  not?: ${name}NumericNotInput
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/numeric.ts`, numericContent)

  const numericOrContent = `
import { ${name}ConditionsInput } from '../index'
import { Field, InputType } from 'type-graphql'

@InputType()
export class ${name}NumericOrInput {
  @Field(type => ${name}ConditionsInput, { nullable: true })
  conditions?: ${name}ConditionsInput

  @Field({ nullable: true })
  eq?: number
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/numeric-or.ts`, numericOrContent)

  const numericAndContent = `
import { ${name}ConditionsInput } from '../index'
import { Field, InputType } from 'type-graphql'

@InputType()
export class ${name}NumericAndInput {
  @Field(type => ${name}ConditionsInput, { nullable: true })
  conditions?: ${name}ConditionsInput
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
import { ${name}ConditionsInput } from '../index'
import { Field, InputType } from 'type-graphql'

@InputType()
export class ${name}DateOrInput {
  @Field(type => ${name}ConditionsInput, { nullable: true })
  conditions?: ${name}ConditionsInput

  @Field({ nullable: true })
  eq?: string
}
  `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/date-or.ts`, dateOrContent)

  const dateAndContent = `
import { ${name}ConditionsInput } from '../index'
import { Field, InputType } from 'type-graphql'

@InputType()
export class ${name}DateAndInput {
  @Field(type => ${name}ConditionsInput, { nullable: true })
  conditions?: ${name}ConditionsInput
}
    `
  fs.writeFileSync(`src/search-inputs/${name}/conditions/date-and.ts`, dateAndContent)
}

function generateTermsInput(klass: typeof Search, name: string) {
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

function generateGqlInput(klass: typeof Search, name: string) {
  generateSearchInput(klass, name)
  generateMetaInput(klass, name)
  generateKeywordInput(klass, name)
  generateTextInput(klass, name)
  generateNumericInput(klass, name)
  generateDateInput(klass, name)
  generateTermsInput(klass, name)
}

export function generateGqlInputs(searchClasses: typeof Search[]) {
  const directory = "src/search-inputs"

  searchClasses.forEach(searchClass => {
    const instance = new searchClass()
    const searchName = instance.constructor.name
    fs.mkdirSync(`${directory}/${searchName}/conditions`, { recursive: true })
    fs.mkdirSync(`${directory}/${searchName}/aggregations`, { recursive: true })
    generateGqlInput(searchClass, searchName)
  })
}
