# search-resource

Node client for easy elasticsearch with typescript and GraphQL bindings.

This library is currently in 🔥**ALPHA**🔥

![](https://user-images.githubusercontent.com/55264/77768780-57567a80-7019-11ea-8101-876a823152ad.gif)

![](https://user-images.githubusercontent.com/55264/77767897-1a3db880-7018-11ea-8daa-bba16b19b92d.png)

* [Usage](#usage)
  * [Queries](#queries)
    * [Filters](#filters)
    * [Pagination](#pagination)
    * [Sorting](#sorting)
    * [Total](#total)
    * [Results](#results)
    * [Scripting](#scripting)
  * [Aggregations](#aggregations)
    * [sourceFields](#source-fields)
    * [ensureQuality](#ensurequality)
  * [Logging](#logging)
  * [GraphQL Integration](#graphql-integration)
* [Testing](#testing)
* [Why not expose the elasticsearch payload directly?](#why-not-expose-the-elasticsearch-payload-directly)

## Usage

### Queries

First, define your search and conditions class:

```ts
import {
  Search,
  ClassHook,
  Conditions,
  SearchClass,
  KeywordCondition,
  TextCondition,
  NumericCondition,
  DateCondition
} from "search-resource"

@ClassHook()
class ThronesSearchConditions extends Conditions {
  name      = new KeywordCondition<this>("name", this)
  quote     = new TextCondition<this>("quote", this)
  rating    = new NumericCondition<this>("rating", this)
  createdAt = new DateCondition<this>("created_at", this)
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

Fire a query and get results:

```ts
const search = new ThronesSearch()
await search.execute()
search.results // => [{name: "Ned Stark"}, {name: "Jon Snow"}]
```

#### Filters

Assign filters:

```ts
const search = new ThronesSearch()
search.filters.name.eq("Ned Stark")
search.filters.quote.match("winter")
search.filters.rating.gt(100).lt(500)
search.filters.createdAt.gt("1960-12-26")
await search.execute()
```

All conditions get AND'd together, but we also support OR and NOT at the top-level:

```ts
const search = new ThronesSearch()
search.filters.name.eq("Ned Stark")
search.filters.or.title.eq("Queen of Dragons")
search.filters.not.rating.lt(500)
```

You can also AND, OR and NOT within a condition:

```ts
const search = new ThronesSearch()
search.filters.quote.match("winter")
  .or.match("is coming").and.not.match("summer")
  .and.name.eq("Ned Stark")
```

AND trumps OR similar to how `*` trumps `+` in mathmatical order of operations. That means the above query executes as "Find all records where the quote matches 'winter', or it matches 'is coming' while also not matching 'summer'. Another way to state this:

```ts
quote:'winter' OR (quote:'is coming' AND NOT quote:'summer' AND name:'Ned Stark')
```

Finally, you can AND/OR/NOT *across* conditions. Each time you reference a new condition, you're opening up a new parenthesis:

```ts
const search = new ThronesSearch()
search.filters.name.eq("Ned Stark")
  .and.quote.match("burn").or.match("alive")
```

Because we're jumping from `name` to `quote`, this evaluates to:

```ts
name:'Ned Stark' AND (quote:'burn' OR quote:'alive')
```

All examples here are using direct assignment, but you can do the same in the constructor:

```ts
const search = new ThronesSearch({
  filters: {
    name: {
      eq: "Ned Stark",
      and: {
        quote: {
          match: "burn",
          or: {
            match: "alive"
          }
        }
      }
    }
  }
})
```

##### Condition Types

* `KeywordCondition`: `eq`
* `TextCondition`: `match`, `matchPhrase`
* `NumericCondition`: `eq`, `gt`, `lt`, `gte`, `lte`
* `DateCondition`: `eq`, `gt`, `lt`, `gte`, `lte`, `pastFiscalYears`


The `keywords` condition, a [simple string query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-simple-query-string-query.html), comes by default:

```ts
search.filters.keywords.eq("something")
```

#### Pagination

```ts
const search = new ThronesSearch()
search.page.size = 10
search.page.number = 2
```

#### Sorting

```ts
const search = new ThronesSearch()
search.sort = [{ att: "someField", dir: "desc" }]
```

#### Total

```ts
const search = new ThronesSearch()
await search.execute()
search.total // => 500
```

#### Results

TODO

### Scripting

Elasticsearch supports [script queries](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-script-score-query.html) (where the query itself comes from a script) and [script scoring](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-script-score-query.html). We support both of these, and you can even combine them with the rest of your query.

```ts
const search = new ThronesSearch()
search.scriptQuery({
  source: "doc['rating'] > params.ratingGt",
  params: { ratingGt: 100 }
})

// search.scriptScore(... args ...)

// add other clauses if you like

await search.query()
```

We support persisting these scripts as well:

```ts
await search.saveScript('foo', `doc['rating'] * 2`)
```

You can now query by the script name:

```ts
const search = new ThronesSearch()
search.scriptQuery({
  id: "foo",
  params: { ratingGt: 100 }
})
```

And delete if no longer needed:

```ts
await search.deleteScript('foo')
```

### Aggregations

Let's say we wanted the count of all titles:

```ts
const search = new Search()
search.aggs.terms("title")
await search.execute()
search.aggResults.title // =>

// [
//   { key: "Queen", count: 2 },
//   { key: "Servant", count: 400 }
// ]
```

Or if you want to name the aggregation differently than the field:

```
search.aggs.terms("topTitles", { field: "title" })
search.aggResults.topTitles
```

You can add other calculations as well. Currently we support `sum` and `avg`:

```ts
search.aggs.terms("title").sum("rating").avg("age")
await search.results()
search.aggResults.title // =>

// [
//   { key: "Queen", count: 2, sum_rating: 500, avg_age: 50 },
//   { key: "Servant", count: 200, sum_rating: 300, avg_age: 20 }
// ]
```

We also support nested child aggregations. Let's say for each title we wanted a breakdown of their favorite beverage, as Queens prefer wine and servants prefer ale and cider:

```ts
search.aggs.terms("title")
  .child().terms("beverage").avg("age")
search.aggResults // =>

// [
//   {
//     key: "Queen",
//     count: 2,
//     children: {
//       beverage: [
//         { key: "Wine", count: 2, avg_age: 50 },
//       ]
//     },
//   {
//     key: "Servant",
//     count: 200,
//     children: [
//       { key: "Ale", count: 100, avg_age: 20 },
//       { key: "Cider", count: 60, avg_age: 30 },
//       { key: "Meade", count: 40, avg_age: 40 }
//     ]
//   }
// ]
//
```

Right now we only support the `terms` aggregation, but future bucket and metrics aggregations can be added pretty easily.

You can order aggregations. Let's say we wanted top 10 titles ordered by rating:

```ts
const search = new ThronesSearch()
search.aggs.terms("title", { size: 10 }).order("avg", "rating", "desc")
```

Finally, you can do top-level aggregations without a bucket as well. To see the total rating and average age of all results:

```ts
const search = new ThronesSearch()
search.aggs.sum("rating").avg("avg")
await search.execute()
search.aggResults // => { sum_rating: 10000, avg_age: 30 }
```

*Note: when you only want aggregation data and no search results, remember to set `search.meta.perPage` to `0` for best performance.*

#### Source Fields

When aggregating, you're often referencing an underlying "id"-type field but want to return a corresponding "label"-type field in the response. You can do this via the `sourceFields` option, which applies a [top hits aggregation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-top-hits-aggregation.html) under-the-hood:

```ts
const search = new ThronesSearch()
search.aggs.terms("category_id").sourceFields(["category_name"])
await search.execute()
search.aggResults // =>

// [
//   { key: 123, count: 500, sourceFields: { name: "Characters" } },
//   { key: 456, count: 200, sourceFields: { name: "Weapons" } },
//   ...
// ]
```

#### ensureQuality

Elastic has a super fun issue where the [aggregation numbers are not always accurate](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html#search-aggregations-bucket-terms-aggregation-approximate-counts) when querying across shards. We get around this by firing a separate query. If you wanted to find "top 5 titles by rating" we'll first fire a query for the top **thirty** titles, put all 30 in a filter and make a second query, then chop off the last 25 from the response. This is what the CIT does.

You can do this by adding `.ensureQuality`:

```ts
const search = new ThronesSearch()
search.terms("title").order("sum", "rating", "desc").ensureQuality()
```

Everything else works the same, but a second query fires under-the-hood.

### Logging

Courtesy of @kwebb:

![](https://user-images.githubusercontent.com/55264/76792734-0da89d00-679a-11ea-9632-95a90ff6b3ed.png)

You can copy this statement and paste on command-line as cURL.

This one-liner is nice for brevity, but if you want a more-readable multi-line log:

```ts
class MySearch extends Search {
  // ...
  static logFormat = "pretty"
}
```

### GraphQL Integration

You can define a search resolver and get all same behavior exposed over GraphQL. We integrate with `type-graphql` so you can define a resolver like so:

```ts
import { Resolver, Query, Arg, Ctx, FieldResolver, Root, Mutation } from 'type-graphql'
import { ThronesSearch } from '@/search/thrones'
import { SearchResponse } from './entity'
import { ThronesSearchInput } from '@/search-inputs/ThronesSearch'

@Resolver(of => SearchResponse)
export class ThronesSearchResolver {
  @Query(() => SearchResponse)
  async thronesSearch(
    @Arg("data", { nullable: true }) searchInput?: ThronesSearchInput,
  ) {
    const search = new ThronesSearch(searchInput)
    await search.execute()
    return search
  }
}
```

Let's take this line by line:

```ts
import { ThronesSearch } from '@/search/thrones'
```

Your search class.

```ts
import { SearchResponse } from './entity'
```

Your corresponding Model/DTO/Entity object. You probably don't want to expose the raw index directly but instead return some normalized object (perhaps from the database!). So define this one yourself. For example:

```ts
import { ObjectType, Field, ID, Arg, InputType } from 'type-graphql'
import { GraphQLJSONObject } from 'graphql-type-json'

@ObjectType()
export class ThronesSearchResult  {
  @Field()
  name!: string

  @Field()
  title!: string

  @Field()
  age!: number
}

@ObjectType()
export class ThronesSearchResponse  {
  @Field(type => [ThronesSearchResult], { nullable: true })
  results!: ThronesSearchResult[]

  @Field()
  total: number

  @Field(type => GraphQLJSONObject, { nullable: true })
  aggregations!: any
}
```

Now we're at:

```ts
import { ThronesSearchInput } from '@/search-inputs/ThronesSearch'
```

It would be extremely tedious to define these inputs (with and/or/not, aggregations, etc) every time. But we also can't define this once for all searches and move on (since each search has a unique conditions payload). So, there is a task to autogenerate the `@/search-inputs` directory.

To get this task, write some script file that leverages `generateGraphQLInputs`, for .e.g.:

```ts
import { ThronesSearch } from './../search/transaction'
import { generateGqlInputs } from 'search-resource'

generateGqlInputs([
  ThronesSearch,
])
```

Make it runnable from command-line:

```ts
// package.json

{
  name: "my-api",
  ...
  scripts: {
    ...,
    generate-search-inputs: "node lib/generate-search-inputs.js"
  },
```

You can now run `yarn generate-search-inputs` and all the `type-graphql` input objects will be autogenerated for you.

### Testing

TODO: inserts/cleanup

### Why not expose the Elasticsearch payload directly?

TODO
