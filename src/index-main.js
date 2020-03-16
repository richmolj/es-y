require("ts-node").register({
  typeCheck: true,
  compilerOptions: {
    module: "commonjs",
  },
})

module.exports = require("./index.ts")
