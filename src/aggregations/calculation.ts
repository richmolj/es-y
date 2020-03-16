export class Calculation {
  kind: string
  field: string

  constructor(kind: string, field: string) {
    this.kind = kind
    this.field = field
  }

  get comboName(): string {
    return `calc_${this.kind}_${this.field}`
  }

  toElastic() {
    return {
      [this.comboName]: {
        [this.kind]: {
          field: this.field,
        },
      },
    }
  }
}
