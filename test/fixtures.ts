import {
  Search,
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

// interface ThronesSearchConditionsInput {
//   name?: StringEqConditionInput<this>
//   title?: StringEqConditionInput<this>
//   quote?: MatchConditionInput<this>
//   bio?: MatchConditionInput<this>
//   rating?: NumericConditionInput<this>
//   age?: NumericConditionInput<this>
//   createdAt?: DateConditionInput<this>
//   updatedAt?: DateConditionInput<this>
// }

// interface ThronesSearchInput {
//   conditions?: ThronesSearchConditionsInput
// }

@ClassHook()
class ThronesSearchConditions extends Conditions {
  name = new KeywordCondition<this>("name", this)
  title = new KeywordCondition<this>("title", this)
  quote = new TextCondition<this>("quote", this)
  bio = new TextCondition<this>("bio", this)
  rating = new NumericCondition<this>("rating", this)
  age = new NumericCondition<this>("age", this)
  createdAt = new DateCondition<this>("created_at", this)
  updatedAt = new DateCondition<this>("updated_at", this)
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
