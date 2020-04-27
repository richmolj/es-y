export interface Pagination {
  size: number
  number: number
}

export interface Sort {
  att: string
  dir: 'desc' | 'asc'
}

export interface ClauseOptions {
  boost?: number
}

export interface SimpleQueryClauseOptions<T> {
  fields: string[]
}