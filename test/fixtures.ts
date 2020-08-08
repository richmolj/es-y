import {
  Search,
  MultiSearch,
  ClassHook,
  Conditions,
  SearchClass,
  KeywordCondition,
  TextCondition,
  NumericCondition,
  DateCondition,
  DateConditionInput,
  StringEqConditionInput,
  MatchConditionInput,
  NumericConditionInput,
  ConditionsClass,
} from "../src/index"

@ClassHook()
export class ThronesSearchConditions extends Conditions {
  name = new KeywordCondition<this>("name", this)
  title = new KeywordCondition<this>("title", this)
  titleAlias = new KeywordCondition<this>("title", this)
  quote = new TextCondition<this>("quote", this)
  bio = new TextCondition<this>("bio", this)
  bioAlias = new TextCondition<this>("bio", this)
  rating = new NumericCondition<this>("rating", this)
  age = new NumericCondition<this>("age", this)
  createdAt = new DateCondition<this>("created_at", this)
  updatedAt = new DateCondition<this>("updated_at", this)

  skills = new NestedSkillConditions()
}

@ClassHook()
class NestedSkillConditions extends Conditions {
  static nested = "skills"

  name = new KeywordCondition<this>("name", this)
  description = new TextCondition<this>("description", this)
}

@SearchClass()
export class ThronesSearch extends Search {
  static host = "http://localhost:9200"
  static index = "game-of-thrones"
  static conditionsClass = ThronesSearchConditions
  filters!: ThronesSearchConditions
  queries!: ThronesSearchConditions

  // static logFormat = "pretty"
}

@ClassHook()
class JustifiedSearchConditions extends Conditions {
  name = new KeywordCondition<this>("name", this)
  rating = new NumericCondition<this>("rating", this)
  bio = new TextCondition<this>("bio", this)
}

@SearchClass()
export class JustifiedSearch extends Search {
  static host = "http://localhost:9200"
  static index = "justified"
  static conditionsClass = JustifiedSearchConditions
  filters!: JustifiedSearchConditions
  queries!: JustifiedSearchConditions

  // static logFormat = "pretty"
}

@SearchClass()
export class GlobalSearch extends MultiSearch {
  static searches = {
    thrones: ThronesSearch,
    justified: JustifiedSearch
  }
}