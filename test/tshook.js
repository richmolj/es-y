/* eslint-disable no-undef */
require("ts-node").register({
  typeCheck: true,
  compilerOptions: {
    module: "commonjs",
  },
})

process.on("unhandledRejection", reason => {
  console.log(`UNHANDLED PROMISE REJECTION: ${reason.stack}`)
})
