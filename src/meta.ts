export class Meta {
  page = 1
  perPage = 20
  total?: number
  sort: Record<string, "asc" | "desc">[]

  constructor(input: any) {
    this.sort = []

    if (input) {
      if (input.page) {
        this.page = input.page
      }

      if (input.perPage || input.perPage === 0) {
        this.perPage = input.perPage
      }

      if (input.sort) {
        this.sort = input.sort.map((s: any) => {
          return { [s.att]: s.dir }
        })
      }
    }
  }

  toElastic(): Record<string, any> {
    return {
      size: this.perPage,
      from: this.perPage * (this.page - 1),
      sort: this.sort,
    }
  }
}
