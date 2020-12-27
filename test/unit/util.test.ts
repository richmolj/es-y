import { expect } from "chai"
import colorize, { supportsColor } from "../../src/util/colorize"

describe("utility", () => {
  describe("colorize", () => {
    const OLD_ENV_TERM = process.env.TERM
    after(() => (process.env.TERM = OLD_ENV_TERM))

    describe("default export", () => {
      context("when colors is supported", () => {
        before(() => (process.env.TERM = "linux"))

        it("returns correct ANSI codes", () => {
          expect(colorize("green", "foo")).to.eq("\u001b[32mfoo\u001b[39m")
        })
      })

      context("when colors is not supported", () => {
        before(() => (process.env.TERM = "whtvr"))

        it("returns raw text string", () => {
          expect(colorize("cyan", "foo bar")).to.eq("foo bar")
        })
      })
    })

    describe("supportsColor", () => {
      context("when os/gui is supported", () => {
        before(() => (process.env.TERM = "xterm-256color"))

        it("returns true", () => {
          expect(supportsColor()).to.eq(true)
        })
      })

      context("when os/gui is not supported", () => {
        before(() => (process.env.TERM = "foo"))

        it("returns false", () => {
          expect(supportsColor()).to.eq(false)
        })
      })
    })
  })
})
