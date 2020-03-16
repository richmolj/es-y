export class Meta {
  page = 1
  perPage = 20
  total?: number
  sort: Record<string, "asc" | "desc">[]

  constructor() {
    this.sort = []
  }

  toElastic(): Record<string, any> {
    return {
      size: this.perPage,
      from: this.perPage * (this.page - 1),
      sort: this.sort,
    }
  }
}
