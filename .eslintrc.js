module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
    },
  },
  env: {
    es6: true,
    node: true,
    mocha: true,
  },
  globals: {
    artifacts: true,
    contract: true,
    web3: true,
  },
  plugins: ['prettier', '@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier/@typescript-eslint',
  ],
  rules: {
    'prettier/prettier': 'error',
    'prefer-const': 'error',
    'no-undef': 'warn',
    'no-unused-vars': 'warn',
    '@typescript-eslint/explicit-member-accessibility': 1,
    '@typescript-eslint/member-ordering': 1,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/camelcase': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/no-var-requires': 0,
  },
}
