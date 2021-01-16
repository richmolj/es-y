# Esy

Node client for elasticsearch with typescript and GraphQL bindings. Making **E**lastic**S**earch **easy**.

This library is currently in 🔥**ALPHA**🔥

### Overview

Start by defining a `Search` class. Each `Search` has `Conditions`, which can be of type `Keyword`, `Text`, `Numeric` or `Date`:

```ts
import {
  ClassHook,
  Conditions,
  Search,
  KeywordCondition,
  TextCondition,
  NumericCondition,
  DateCondition
} from "esy"

// Left side (e.g. goldAmount) is what we refer to in code
// Right side (.e.g. gold) is the underlying elastic field
@ClassHook()
export class ThronesSearchConditions extends Conditions {
  name       = new KeywordCondition<this>("name", this)
  quote      = new TextCondition<this>("quote", this)
  goldAmount = new NumericCondition<this>("gold", this)
  createdAt  = new DateCondition<this>("created_at", this)
}

@SearchClass()
export class ThronesSearch extends Search {
  static host = "http://localhost:9200"
  static index = "game-of-thrones"
  static conditionsClass = ThronesSearchConditions
  filters!: ThronesSearchConditions
  queries!: ThronesSearchConditions
}
```

Now we're ready to start querying!

```ts
// Basic
const search = new ThronesSearch()
await search.execute()
search.results // => [{ name: "Ned Stark", ...}, { ... }]

// Sort
const search = new ThronesSearch()
search.sort = [{ att: "name", dir: "desc" }]
await search.execute()

// Paginate
const search = new ThronesSearch()
search.page.number = 2
search.page.size = 5
await search.execute()

// Total count
search.total // 1,200,875
```

Elasticsearch [has the concepts](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-filter-context.html) of `filters` and `queries`. The main difference? `queries` affect the relevancy score, `filters` do not. You typically want `queries` for a keyword search bar, `filters` for everything else. In this guide, we'll be referring to both `queries` and `filters` as a type of "condition".

```ts
const search = new ThronesSearch()

// 'keywords' comes out-of-the-box in all searches
search.queries.keywords.eq("winter")

// Everything else is defined in your Conditions class
search.filters.name.eq("Ned Stark")
search.filters.quote.match("winter")
search.filters.goldAmount.gt(100).lte(500)
search.filters.createdAt.gt("2020-01-01")
```

Learn more about each type of condition [here](https://bbgithub.dev.bloomberg.com/bgov/esy/wiki/Querying#condition-types).

Conditions can all be negated:

```ts
search.filters.name.not.eq("Ned Stark")
```

They can also be AND/OR'd together, at any level of nesting. So we can do something simple like this:

```ts
search.filters.name.eq("Ned Stark").or.title.eq("Warden of the North")
```

Or something complex like this:

```ts
search.filters.kingdom.eq("North")
  .and.bio.match("winterfell")
  .or.quote.match("winter is coming").and.not.match("but who cares")
search.filters.kingdom.eq("Rock")
  .and.bio.match("pays his debts").or.goldAmount.gt(100000)
search.filters.or.skills.type.eq("Comedic Relief")
search.filters.not.rating.lt(10)
```

Learn more about complex/nested AND/OR/NOT queries [here](https://bbgithub.dev.bloomberg.com/bgov/esy/wiki/Querying#andornot).

We can even alter these values. Maybe when querying `goldAmount` we need to convert dollars to cents:

```ts
// in the Conditions class
goldAmount = new NumericCondition<this>("gold", this, {
  transforms: [
    (amount: number) => amount * 100
  ]
})
```

Learn more about condition transforms [here](https://bbgithub.dev.bloomberg.com/bgov/esy/wiki/Querying#transforms).

When looking at results, we'll probably want to [highlight](https://bbgithub.dev.bloomberg.com/bgov/esy/wiki/Results#highlighting) our matches:

```ts
search.queries.keywords.eq("winter")
search.highlight("quote")
search.results[0]._highlights // { bio: ["<em>winter</em> is coming"] }
```

Or [transform](https://bbgithub.dev.bloomberg.com/bgov/esy/wiki/Results#transforms) the results altogether.

```ts
class ThronesSearch extends Search {
  // ... code ...
  async transformResults(results: any[]) {
    return await ThronesORM.queryById(results.map((r) => r.id))
  }
}
```

Searches can be combined with `Multisearch` (docs [here](https://bbgithub.dev.bloomberg.com/BGOV/esy/wiki/Multisearch)) to perform cross-index queries that re-use all the logic you see above:

```ts
class GlobalTVSearch extends MultiSearch {
  static searches = {
    thrones: ThronesSearch,
    justified: JustifiedSearch,
  }
}

const search = new GlobalTVSearch({
  thrones: {
    filters: { name: { eq: "Ned Stark" } }
  },
  justified: {
    filters: { name: { eq: "Boyd Crowder" } }
  }
})
await search.execute()
search.results // =>
// [
//   { name: "Ned Stark", _type: "thrones", ... },
//   { name: "Boyd Crowder", _type: "justified", ... }
// ]
```

Finally, we can perform [sophisticated aggregations](https://bbgithub.dev.bloomberg.com/BGOV/esy/wiki/Aggregations), like showing the top kingdoms by `goldAmount` broken down by year, but only for the Merchant class:

```ts
const search = new ThroneTaxReportSearch()
search.filters.occupation.eq("Merchant")
search.aggs
  .terms("kingdom").order("sum", "gold", "desc")
    .child()
    .dateHistogram("taxDate", { interval: "year " }).sum("gold")
await search.execute()
search.aggResults // =>
// [
//   {
//     key: "Rock",
//     sum_gold: 99999,
//     children: [{
//       taxDate: [
//         { key: "2020", sum_gold: 150 },
//         { key: "2019", sum_gold: 200 },
//         ... etc ...
//       ]
//     }]
//   },
//   {
//     ... etc ...
//   }
// ]
//
//
```

### Bonus: API/GraphQL Usage

All of the above can be accomplished by passing a POJO to the constructor:

```ts
const search = new ThronesSearch({
  filters: {
    name: {
      eq: "Ned Stark"
    }
  }
})
```

Which means you can write flexible API endpoints like

```json
// POST
{
  "search": {
    "filters": {
      "name": {
        "eq": "Ned Stark"
      }
    }
  }
}
```

```ts
// Express endpoint example
app.use(express.bodyParser())
app.post('/thrones', async (request, response) => {
  const search = new ThronesSearch(request.body.search)
  await search.execute()
  response.json({ results: search.results })
})
```

If you're using GraphQL with [type-graphql](https://github.com/MichalLytek/type-graphql), we have helpers to automatically generate the schema for you, so you can get a fully-typed GraphQL API for free:


![](https://user-images.githubusercontent.com/55264/77768780-57567a80-7019-11ea-8101-876a823152ad.gif)

[Learn more about GraphQL integration here](https://bbgithub.dev.bloomberg.com/BGOV/esy/wiki/GraphQL-Integration).

### That's Not All!

The above gives a basic overview of `esy` functionality - but there's plenty more we haven't covered. Head over to out [Wiki](https://bbgithub.dev.bloomberg.com/BGOV/esy/wiki) to dive deeper.
