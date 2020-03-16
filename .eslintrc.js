
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    "plugin:prettier/recommended",
  ],
  rules: {
    semi: "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/member-delimiter-style": ["error", {
      "multiline": {
          "delimiter": "none",
          "requireLast": true
      },
      "singleline": {
          "delimiter": "semi",
          "requireLast": false
      }
    }],
    "@typescript-eslint/type-annotation-spacing": ["error", {
      before: false,
      after: true,
      overrides: {
        arrow: {
          before: true,
          after: true
        }
      }
    }]
  }
};