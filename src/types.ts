export interface Pagination {
  size: number
  number: number
}

export interface Sort {
  att: string
  dir: 'desc' | 'asc'
}