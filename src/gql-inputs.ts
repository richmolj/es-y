import * as fs from "fs"
import * as rimraf from "rimraf"
import { Search } from "./search"
import { MultiSearch } from "./multi-search"

// NB: all of this code is shit

function eachCondition(conditionsClassInstance: any, callback: Function) {
  const instance = conditionsClassInstance
  Object.keys(instance).forEach(k => {
    if (k === "_or" || k === "_not" || k === "isQuery" || k === "isConditions" || k == 'sort') {
      return
    }
    const value = (instance as any)[k]
    const conditionType = value.klass.type
    callback(k, conditionType, value)
  })
}

function generateConditionInputs(name: string, conditionsClassInstance: any): string {
  let inputs = ''

  eachCondition(conditionsClassInstance, (conditionName: string, type: string, condition: any) => {
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

    if (condition.isConditions) {
      const capName = conditionName.charAt(0).toUpperCase() + conditionName.slice(1)
      inputs = inputs.concat(`
  @Field(type => ${capName}Input, { nullable: true })
  ${conditionName}!: ${capName}Input
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
import { GraphQLJSONObject } from 'graphql-type-json'
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
  @Field(type => [String], { nullable: true })
  sum!: string[]

  @Field(type => [String], { nullable: true })
  avg!: string[]

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
class ${name}SourceFieldsInput {
  @Field(type => [String], { nullable: true })
  includes!: string[]

  @Field(type => [String], { nullable: true })
  excludes!: string[]

  @Field(type => [String], { nullable: true })
  onlyHighlights!: string[]
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

  @Field(type => [GraphQLJSONObject], { nullable: true })
  highlights!: any[]

  @Field(type => ${name}SourceFieldsInput, { nullable: true })
  sourceFields!: ${name}SourceFieldsInput
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

function generateNestedSearchInput(conditionsClassInstance: any, searchName: string, conditionName: string) {
  const name = conditionName.charAt(0).toUpperCase() + conditionName.slice(1)
  let searchInput = `
import { InputType, Field } from 'type-graphql'
import { ${name}KeywordConditionInput } from './conditions/keyword'
import { ${name}TextConditionInput } from './conditions/text'
import { ${name}NumericConditionInput } from './conditions/numeric'
import { ${name}DateConditionInput } from './conditions/date'
import { ${name}SimpleKeywordsInput } from './conditions/simple-keywords'
import { GraphQLJSONObject } from 'graphql-type-json'

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
  @Field(type => ${name}Input, { nullable: true })
  not!: ${name}Input

  @Field(type => ${name}Input, { nullable: true })
  or!: ${name}Input

  @Field(type => ${name}PaginationInput, { nullable: true })
  page!: ${name}PaginationInput

  @Field(type => [${name}SortInput], { nullable: true })
  sort!: ${name}SortInput[]

  ${generateConditionInputs(name, conditionsClassInstance)}
}
  `
  if (!fs.existsSync(`src/search-inputs/${searchName}/nested`)) {
    fs.mkdirSync(`src/search-inputs/${searchName}/nested`)
  }
  if (!fs.existsSync(`src/search-inputs/${searchName}/nested/${name}`)) {
    fs.mkdirSync(`src/search-inputs/${searchName}/nested/${name}`)
  }
  if (!fs.existsSync(`src/search-inputs/${searchName}/nested/${name}/conditions`)) {
    fs.mkdirSync(`src/search-inputs/${searchName}/nested/${name}/conditions`)
  }
  fs.writeFileSync(`src/search-inputs/${searchName}/nested/${name}/index.ts`, searchInput)
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
  `

  eachCondition(new klass.conditionsClass(), (conditionName: string, type: string, condition: any) => {
    if (condition.isConditions) {
      const capName = conditionName.charAt(0).toUpperCase() + conditionName.slice(1)
      searchInput = searchInput.concat(`
import { ${capName}Input } from './nested/${capName}'
      `)
    }
  })

  searchInput = searchInput.concat(`
@InputType()
export class ${name}ConditionsInput {
  @Field(type => ${name}ConditionsInput, { nullable: true })
  not!: ${name}ConditionsInput

  @Field(type => ${name}ConditionsInput, { nullable: true })
  or!: ${name}ConditionsInput

  ${generateConditionInputs(name, new klass.conditionsClass())}
    `)

  searchInput = searchInput.concat(`
}

@InputType()
export class ${name}AggregationsInput {
  @Field(type => [String], { nullable: true })
  sum!: string[]

  @Field(type => [String], { nullable: true })
  avg!: string[]

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
class ${name}SourceFieldsInput {
  @Field(type => [String], { nullable: true })
  includes!: string[]

  @Field(type => [String], { nullable: true })
  excludes!: string[]

  @Field(type => [String], { nullable: true })
  onlyHighlights!: string[]
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

  @Field(type => [GraphQLJSONObject], { nullable: true })
  highlights!: any[]

  // for multisearch
  @Field({ nullable: true })
  boost!: number

  @Field(type => GraphQLJSONObject, { nullable: true })
  scriptQuery!: any

  @Field(type => GraphQLJSONObject, { nullable: true })
  scriptScore!: any

  @Field(type => ${name}SourceFieldsInput, { nullable: true })
  sourceFields!: ${name}SourceFieldsInput
}
  `)
  fs.writeFileSync(`src/search-inputs/${name}/index.ts`, searchInput)
}

function generateSimpleKeywordsInput(conditionsClassInstance: any, name: string, dirName?: string) {
  const bestName = dirName || name

  const simpleKeywordsOptions = `
  @Field({ nullable: true })
  boost?: number

  @Field(type => [String], { nullable: true })
  fields?: string[]

  @Field(type => Boolean, { nullable: true })
  allFields?: boolean

  @Field(type => String, { nullable: true })
  analyzer?: string

  @Field(type => Boolean, { nullable: true })
  autoGenerateSynonymsPhraseQuery?: boolean

  @Field(type => String, { nullable: true })
  flags?: string

  @Field(type => Number, { nullable: true })
  fuzzyMaxExpansions?: number

  @Field(type => Number, { nullable: true })
  fuzzyPrefixLength?: number

  @Field(type => Boolean, { nullable: true })
  fuzzyTranspositions?: boolean

  @Field(type => Boolean, { nullable: true })
  lenient?: boolean

  @Field(type => String, { nullable: true })
  minimumShouldMatch?: string

  @Field(type => String, { nullable: true })
  quoteFieldSuffix?: string

  // alias
  @Field(type => String, { nullable: true })
  combinator?: string

  @Field(type => String, { nullable: true })
  defaultOperator?: string
  `

  const content = `
import { Field, InputType } from 'type-graphql'
import { ${bestName}SimpleKeywordsOrInput } from './simple-keywords-or'
import { ${bestName}SimpleKeywordsAndInput } from './simple-keywords-and'

@InputType()
export class ${bestName}SimpleKeywordsNotInput {
  @Field(type => [String], { nullable: true })
  eq?: string[]
  ${simpleKeywordsOptions}
}

@InputType()
export class ${bestName}SimpleKeywordsInput {
  @Field()
  eq?: string

  @Field({ nullable: true })
  not?: ${bestName}SimpleKeywordsNotInput

  @Field({ nullable: true })
  or?: ${bestName}SimpleKeywordsOrInput

  @Field({ nullable: true })
  and?: ${bestName}SimpleKeywordsAndInput
  ${simpleKeywordsOptions}
}
  `
  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/simple-keywords.ts`, content)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/simple-keywords.ts`, content)
  }

  let simpleKeywordsOrContent = `
import { Field, InputType } from 'type-graphql'
import { ${bestName}KeywordConditionInput } from './keyword'
import { ${bestName}TextConditionInput } from './text'
import { ${bestName}NumericConditionInput } from './numeric'
import { ${bestName}DateConditionInput } from './date'
import { ${bestName}SimpleKeywordsInput } from './simple-keywords'
  `

  eachCondition(conditionsClassInstance, (conditionName: string, type: string, condition: any) => {
    if (condition.isConditions) {
      const capName = conditionName.charAt(0).toUpperCase() + conditionName.slice(1)
      simpleKeywordsOrContent = simpleKeywordsOrContent.concat(`
import { ${capName}Input } from '../nested/${capName}'
      `)
    }
  })

  simpleKeywordsOrContent = simpleKeywordsOrContent.concat(`
@InputType()
export class ${bestName}SimpleKeywordsOrInput {
  @Field({ nullable: true })
  eq?: string

  @Field({ nullable: true })
  or?: ${bestName}SimpleKeywordsOrInput
  ${simpleKeywordsOptions}

  ${generateConditionInputs(bestName, conditionsClassInstance)}
}
  `)

  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/simple-keywords-or.ts`, simpleKeywordsOrContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/simple-keywords-or.ts`, simpleKeywordsOrContent)
  }

  let simpleKeywordsAndContent = `
import { Field, InputType } from 'type-graphql'
import { ${bestName}KeywordConditionInput } from './keyword'
import { ${bestName}TextConditionInput } from './text'
import { ${bestName}NumericConditionInput } from './numeric'
import { ${bestName}DateConditionInput } from './date'
import { ${bestName}SimpleKeywordsInput } from './simple-keywords'
  `

  eachCondition(conditionsClassInstance, (conditionName: string, type: string, condition: any) => {
    if (condition.isConditions) {
      const capName = conditionName.charAt(0).toUpperCase() + conditionName.slice(1)
      simpleKeywordsAndContent = simpleKeywordsAndContent.concat(`
import { ${capName}Input } from '../nested/${capName}'
      `)
    }
  })

  simpleKeywordsAndContent = simpleKeywordsAndContent.concat(`
@InputType()
export class ${bestName}SimpleKeywordsAndInput {
  @Field({ nullable: true })
  eq?: string
  ${simpleKeywordsOptions}

  ${generateConditionInputs(bestName, conditionsClassInstance)}
}
  `)

  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/simple-keywords-and.ts`, simpleKeywordsAndContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/simple-keywords-and.ts`, simpleKeywordsAndContent)
  }
}

function generateKeywordInput(conditionsClassInstance: any, name: string, dirName?: string) {
  const bestName = dirName || name

  const keywordOptions = `
  @Field({ nullable: true })
  boost?: number

  @Field(type => Boolean, { nullable: true })
  caseInsensitive?: boolean

  @Field(type => String, { nullable: true })
  rewrite?: string
  `

  const keywordContent = `
import { Field, InputType } from 'type-graphql'
import { ${bestName}KeywordOrInput } from './keyword-or'
import { ${bestName}KeywordAndInput } from './keyword-and'

@InputType()
export class ${bestName}KeywordNotInput {
  @Field(type => [String], { nullable: true })
  eq?: string[]

  @Field(type => [String], { nullable: true })
  prefix?: string[]
  ${keywordOptions}
}

@InputType()
export class ${bestName}KeywordConditionInput {
  @Field(type => [String], { nullable: true })
  eq?: string[]

  @Field(type => [String], { nullable: true })
  prefix?: string[]

  @Field({ nullable: true })
  and?: ${bestName}KeywordAndInput

  @Field({ nullable: true })
  or?: ${bestName}KeywordOrInput

  @Field({ nullable: true })
  not?: ${bestName}KeywordNotInput
  ${keywordOptions}
}
  `
  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/keyword.ts`, keywordContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/keyword.ts`, keywordContent)
  }

  let keywordOrContent = `
import { Field, InputType } from 'type-graphql'
import { ${bestName}KeywordConditionInput } from './keyword'
import { ${bestName}TextConditionInput } from './text'
import { ${bestName}NumericConditionInput } from './numeric'
import { ${bestName}DateConditionInput } from './date'
import { ${bestName}SimpleKeywordsInput } from './simple-keywords'
  `

  eachCondition(conditionsClassInstance, (conditionName: string, type: string, condition: any) => {
    if (condition.isConditions) {
      const capName = conditionName.charAt(0).toUpperCase() + conditionName.slice(1)
      keywordOrContent = keywordOrContent.concat(`
import { ${capName}Input } from '../nested/${capName}'
      `)
    }
  })

  keywordOrContent = keywordOrContent.concat(`
@InputType()
export class ${bestName}KeywordOrInput {
  @Field(type => [String], { nullable: true })
  eq?: string[]

  @Field(type => [String], { nullable: true })
  prefix?: string[]

  @Field({ nullable: true })
  or?: ${bestName}KeywordOrInput
  ${keywordOptions}

  ${generateConditionInputs(bestName, conditionsClassInstance)}
}
  `)

  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/keyword-or.ts`, keywordOrContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/keyword-or.ts`, keywordOrContent)
  }

  let keywordAndContent = `
import { Field, InputType } from 'type-graphql'
import { ${bestName}KeywordConditionInput } from './keyword'
import { ${bestName}TextConditionInput } from './text'
import { ${bestName}NumericConditionInput } from './numeric'
import { ${bestName}DateConditionInput } from './date'
import { ${bestName}SimpleKeywordsInput } from './simple-keywords'
  `

  eachCondition(conditionsClassInstance, (conditionName: string, type: string, condition: any) => {
    if (condition.isConditions) {
      const capName = conditionName.charAt(0).toUpperCase() + conditionName.slice(1)
      keywordAndContent = keywordAndContent.concat(`
import { ${capName}Input } from '../nested/${capName}'
      `)
    }
  })

  keywordAndContent = keywordAndContent.concat(`
@InputType()
export class ${bestName}KeywordAndInput {
  ${generateConditionInputs(bestName, conditionsClassInstance)}
}
  `)

  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/keyword-and.ts`, keywordAndContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/keyword-and.ts`, keywordAndContent)
  }
}

function generateTextInput(conditionsClassInstance: any, name: string, dirName?: string) {
  const bestName = dirName || name

  const textOptions = `
  @Field(type => String, { nullable: true })
  analyzer?: string

  @Field(type => Boolean, { nullable: true })
  autoGenerateSynonymsPhraseQuery?: boolean

  @Field(type => String, { nullable: true })
  fuzziness?: string

  @Field(type => Float, { nullable: true })
  maxExpansions?: number

  @Field(type => Float, { nullable: true })
  prefixLength?: number

  @Field(type => Boolean, { nullable: true })
  fuzzyTranspositions?: boolean

  @Field(type => String, { nullable: true })
  fuzzyRewrite?: string

  @Field(type => Boolean, { nullable: true })
  lenient?: boolean

  @Field(type => String, { nullable: true })
  operator?: string

  @Field(type => String, { nullable: true })
  zeroTermsQuery?: string

  @Field(type => String, { nullable: true })
  minimumShouldMatch?: string

  @Field({ nullable: true })
  boost?: number

  @Field({ nullable: true })
  slop?: number
  `

  const textContent = `
import { Field, InputType, Float } from 'type-graphql'
import { ${bestName}TextOrInput } from './text-or'
import { ${bestName}TextAndInput } from './text-and'

@InputType()
export class ${bestName}TextNotInput {
  @Field(type => [String], { nullable: true })
  match?: string[]

  @Field(type => [String], { nullable: true })
  matchPhrase?: string[]
  ${textOptions}
}

@InputType()
export class ${bestName}TextConditionInput {
  @Field(type => [String], { nullable: true })
  match?: string[]

  @Field(type => [String], { nullable: true })
  matchPhrase?: string[]

  @Field({ nullable: true })
  and?: ${bestName}TextAndInput

  @Field({ nullable: true })
  or?: ${bestName}TextOrInput

  @Field({ nullable: true })
  not?: ${bestName}TextNotInput
  ${textOptions}
}
    `
  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/text.ts`, textContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/text.ts`, textContent)
  }

  let textOrContent = `
import { Field, InputType } from 'type-graphql'
import { ${bestName}KeywordConditionInput } from './keyword'
import { ${bestName}TextConditionInput } from './text'
import { ${bestName}NumericConditionInput } from './numeric'
import { ${bestName}DateConditionInput } from './date'
import { ${bestName}SimpleKeywordsInput } from './simple-keywords'
  `

  eachCondition(conditionsClassInstance, (conditionName: string, type: string, condition: any) => {
    if (condition.isConditions) {
      const capName = conditionName.charAt(0).toUpperCase() + conditionName.slice(1)
      textOrContent = textOrContent.concat(`
import { ${capName}Input } from '../nested/${capName}'
      `)
    }
  })

  textOrContent = textOrContent.concat(`
@InputType()
export class ${bestName}TextOrInput {
  @Field(type => [String], { nullable: true })
  match?: string[]

  @Field(type => [String], { nullable: true })
  matchPhrase?: string[]
  ${textOptions}

  ${generateConditionInputs(bestName, conditionsClassInstance)}
}
  `)

  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/text-or.ts`, textOrContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/text-or.ts`, textOrContent)
  }

  let textAndContent = `
import { Field, InputType } from 'type-graphql'
import { ${bestName}KeywordConditionInput } from './keyword'
import { ${bestName}TextConditionInput } from './text'
import { ${bestName}NumericConditionInput } from './numeric'
import { ${bestName}DateConditionInput } from './date'
import { ${bestName}SimpleKeywordsInput } from './simple-keywords'
  `

  eachCondition(conditionsClassInstance, (conditionName: string, type: string, condition: any) => {
    if (condition.isConditions) {
      const capName = conditionName.charAt(0).toUpperCase() + conditionName.slice(1)
      textAndContent = textAndContent.concat(`
import { ${capName}Input } from '../nested/${capName}'
      `)
    }
  })

  textAndContent = textAndContent.concat(`
@InputType()
export class ${bestName}TextAndInput {
  @Field(type => [String], { nullable: true })
  match?: string[]

  @Field(type => [String], { nullable: true })
  matchPhrase?: string[]
  ${textOptions}

  ${generateConditionInputs(bestName, conditionsClassInstance)}
}
  `)

  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/text-and.ts`, textAndContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/text-and.ts`, textAndContent)
  }
}

function generateNumericInput(conditionsClassInstance: any, name: string, dirName?: string) {
  const bestName = dirName || name

  const numericOptions = `
  @Field({ nullable: true })
  boost?: number

  @Field({ nullable: true })
  relation?: string
  `

  const numericContent = `
import { Field, InputType, Float } from 'type-graphql'
import { ${bestName}NumericOrInput } from './numeric-or'
import { ${bestName}NumericAndInput } from './numeric-and'

@InputType()
export class ${bestName}NumericNotInput {
  @Field(type => [Float], { nullable: true })
  eq?: number[]
  ${numericOptions}
}

@InputType()
export class ${bestName}NumericConditionInput {
  @Field(type => [Float], { nullable: true })
  eq?: number[]

  @Field({ nullable: true })
  gt?: number

  @Field({ nullable: true })
  gte?: number

  @Field({ nullable: true })
  lt?: number

  @Field({ nullable: true })
  lte?: number

  @Field({ nullable: true })
  and?: ${bestName}NumericAndInput

  @Field({ nullable: true })
  or?: ${bestName}NumericOrInput

  @Field({ nullable: true })
  not?: ${bestName}NumericNotInput
  ${numericOptions}
}
  `
  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/numeric.ts`, numericContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/numeric.ts`, numericContent)
  }

  let numericOrContent = `
import { Field, InputType, Float } from 'type-graphql'
import { ${bestName}KeywordConditionInput } from './keyword'
import { ${bestName}TextConditionInput } from './text'
import { ${bestName}NumericConditionInput } from './numeric'
import { ${bestName}DateConditionInput } from './date'
import { ${bestName}SimpleKeywordsInput } from './simple-keywords'
  `

  eachCondition(conditionsClassInstance, (conditionName: string, type: string, condition: any) => {
    if (condition.isConditions) {
      const capName = conditionName.charAt(0).toUpperCase() + conditionName.slice(1)
      numericOrContent = numericOrContent.concat(`
import { ${capName}Input } from '../nested/${capName}'
      `)
    }
  })

  numericOrContent = numericOrContent.concat(`
@InputType()
export class ${bestName}NumericOrInput {
  @Field(type => [Float] as const, { nullable: true })
  eq?: number[]

  @Field({ nullable: true })
  or?: ${bestName}NumericOrInput
  ${numericOptions}

  ${generateConditionInputs(bestName, conditionsClassInstance)}
}
  `)

  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/numeric-or.ts`, numericOrContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/numeric-or.ts`, numericOrContent)
  }


  let numericAndContent = `
import { Field, InputType, Float } from 'type-graphql'
import { ${bestName}KeywordConditionInput } from './keyword'
import { ${bestName}TextConditionInput } from './text'
import { ${bestName}NumericConditionInput } from './numeric'
import { ${bestName}DateConditionInput } from './date'
import { ${bestName}SimpleKeywordsInput } from './simple-keywords'
  `

  eachCondition(conditionsClassInstance, (conditionName: string, type: string, condition: any) => {
    if (condition.isConditions) {
      const capName = conditionName.charAt(0).toUpperCase() + conditionName.slice(1)
      numericAndContent = numericAndContent.concat(`
import { ${capName}Input } from '../nested/${capName}'
      `)
    }
  })

  numericAndContent = numericAndContent.concat(`
@InputType()
export class ${bestName}NumericAndInput {
  ${generateConditionInputs(bestName, conditionsClassInstance)}
}
    `)

  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/numeric-and.ts`, numericAndContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/numeric-and.ts`, numericAndContent)
  }
}

function generateDateInput(conditionsClassInstance: any, name: string, dirName?: string) {
  const bestName = dirName || name

  const dateOptions = `
  @Field({ nullable: true })
  boost?: number

  @Field({ nullable: true })
  format?: string

  @Field({ nullable: true })
  relation?: string

  @Field({ nullable: true })
  timeZone?: string
  `

  const dateContent = `
import { Field, InputType } from 'type-graphql'
import { ${bestName}DateOrInput } from './date-or'
import { ${bestName}DateAndInput } from './date-and'

@InputType()
export class ${bestName}DateNotInput {
  @Field(type => [String] as const, { nullable: true })
  eq?: string[]
  ${dateOptions}
}

@InputType()
export class ${bestName}DateConditionInput {
  @Field(type => [String], { nullable: true })
  eq?: string[]

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
  and?: ${bestName}DateAndInput

  @Field({ nullable: true })
  or?: ${bestName}DateOrInput

  @Field({ nullable: true })
  not?: ${bestName}DateNotInput
  ${dateOptions}
}
  `
  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/date.ts`, dateContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/date.ts`, dateContent)
  }

  let dateOrContent = `
import { Field, InputType } from 'type-graphql'
import { ${bestName}KeywordConditionInput } from './keyword'
import { ${bestName}TextConditionInput } from './text'
import { ${bestName}NumericConditionInput } from './numeric'
import { ${bestName}DateConditionInput } from './date'
import { ${bestName}SimpleKeywordsInput } from './simple-keywords'
  `

  eachCondition(conditionsClassInstance, (conditionName: string, type: string, condition: any) => {
    if (condition.isConditions) {
      const capName = conditionName.charAt(0).toUpperCase() + conditionName.slice(1)
      dateOrContent = dateOrContent.concat(`
import { ${capName}Input } from '../nested/${capName}'
      `)
    }
  })

  dateOrContent = dateOrContent.concat(`
@InputType()
export class ${bestName}DateOrInput {
  @Field(type => [String] as const, { nullable: true })
  eq?: string[]

  @Field({ nullable: true })
  or?: ${bestName}DateOrInput
  ${dateOptions}

  ${generateConditionInputs(bestName, conditionsClassInstance)}
}
  `)

  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/date-or.ts`, dateOrContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/date-or.ts`, dateOrContent)
  }

  let dateAndContent = `
import { Field, InputType } from 'type-graphql'
import { ${bestName}KeywordConditionInput } from './keyword'
import { ${bestName}TextConditionInput } from './text'
import { ${bestName}NumericConditionInput } from './numeric'
import { ${bestName}DateConditionInput } from './date'
import { ${bestName}SimpleKeywordsInput } from './simple-keywords'
  `

  eachCondition(conditionsClassInstance, (conditionName: string, type: string, condition: any) => {
    if (condition.isConditions) {
      const capName = conditionName.charAt(0).toUpperCase() + conditionName.slice(1)
      dateAndContent = dateAndContent.concat(`
import { ${capName}Input } from '../nested/${capName}'
      `)
    }
  })

  dateAndContent = dateAndContent.concat(`
@InputType()
export class ${bestName}DateAndInput {
  ${generateConditionInputs(bestName, conditionsClassInstance)}
}
  `)

  if (dirName) {
    fs.writeFileSync(`src/search-inputs/${name}/nested/${dirName}/conditions/date-and.ts`, dateAndContent)
  } else {
    fs.writeFileSync(`src/search-inputs/${name}/conditions/date-and.ts`, dateAndContent)
  }
}

function generateDateHistogramInput(klass: typeof Search | typeof MultiSearch, name: string) {
  const dateHistogramContent = `
import { ${name}AggregationsInput } from '../index'
import { Field, InputType } from 'type-graphql'

@InputType()
export class ${name}DateHistogramInput {
  @Field()
  name!: string

  @Field(type => [String], { nullable: true })
  sum!: string[]

  @Field(type => [String], { nullable: true })
  avg!: string[]

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

  @Field(type => [String], { nullable: true })
  sum!: string[]

  @Field(type => [String], { nullable: true })
  avg!: string[]

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

  @Field(type => [String], { nullable: true })
  sum!: string[]

  @Field(type => [String], { nullable: true })
  avg!: string[]

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
    const conditionsClassInstance = new klass.conditionsClass() as any
    generateSearchInput(klass, name)
    generateSimpleKeywordsInput(conditionsClassInstance, name)
    generateKeywordInput(conditionsClassInstance, name)
    generateTextInput(conditionsClassInstance, name)
    generateNumericInput(conditionsClassInstance, name)
    generateDateInput(conditionsClassInstance, name)
    generateTermsInput(klass, name)
    generateDateHistogramInput(klass, name)
    generateRangeInput(klass, name)

    ;Object.keys(conditionsClassInstance).forEach((key) => {
      if (conditionsClassInstance[key].isConditions) {
        const dirName = key.charAt(0).toUpperCase() + key.slice(1)
        const dir = `src/search-inputs/${name}/nested`
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir)
          fs.mkdirSync(`${dir}/${dirName}`)
          fs.mkdirSync(`${dir}/${dirName}/conditions`)
        }

        const nestedConditionsClassInstance = conditionsClassInstance[key]
        generateNestedSearchInput(nestedConditionsClassInstance, name, key)
        generateSimpleKeywordsInput(nestedConditionsClassInstance, name, dirName)
        generateKeywordInput(nestedConditionsClassInstance, name, dirName)
        generateTextInput(nestedConditionsClassInstance, name, dirName)
        generateNumericInput(nestedConditionsClassInstance, name, dirName)
        generateDateInput(nestedConditionsClassInstance, name, dirName)
      }
    })
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
