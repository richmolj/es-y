import { expect } from "chai"
import { logger } from "../../src/util/logger"
import { Search, SearchClass, Conditions, ClassHook, KeywordCondition } from "../../src/index"

@ClassHook()
class AConditions extends Conditions {
  name = new KeywordCondition<this>("name", this)
}

@SearchClass()
class ApplicationSearch extends Search {
  static host = "http://application.com"
  static logger = logger
  static conditionsClass = AConditions
  conditions!: AConditions
}

@SearchClass()
class A extends ApplicationSearch {}

@SearchClass()
class B extends A {
  static host = "http://b.com"
}

@SearchClass()
class C extends B {
  static host = "http://c.com"
}

describe("inheritance", () => {
  it("sets parentClass correctly", () => {
    expect(ApplicationSearch.parentClass).to.eq(Search)
    expect(A.parentClass).to.eq(ApplicationSearch)
    expect(B.parentClass).to.eq(A)
    expect(C.parentClass).to.eq(B)
  })

  it("sets currentClass correctly", () => {
    expect(ApplicationSearch.currentClass).to.eq(ApplicationSearch)
    expect(A.currentClass).to.eq(A)
    expect(B.currentClass).to.eq(B)
    expect(C.currentClass).to.eq(C)
  })

  it("sets klass correctly", () => {
    const a = new A()
    const b = new B()
    const c = new C()
    expect(a.klass).to.eq(A)
    expect(b.klass).to.eq(B)
    expect(c.klass).to.eq(C)
  })

  it("sets client correctly", () => {
    expect(A.client).to.not.eq(ApplicationSearch.client)
    expect(B.client).to.not.eq(A.client)
    expect(C.client).to.not.eq(B.client)
  })

  it("sets the logger", () => {
    expect(A.logger).to.eq(ApplicationSearch.logger)
  })

  describe("host", () => {
    it("works", () => {
      expect(Search.host).to.eq(undefined)
      expect(ApplicationSearch.host).to.eq("http://application.com")
      expect(A.host).to.eq("http://application.com")
      expect(B.host).to.eq("http://b.com")
      expect(C.host).to.eq("http://c.com")
    })
  })
})
