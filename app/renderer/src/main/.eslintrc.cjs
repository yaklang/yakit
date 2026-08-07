/** ESLint 8 + TS/TSX（偏宽松；类型以 tsc 为准）。Vite 迁移后不再依赖 react-scripts 自带 eslint。 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/eslint-recommended', 'plugin:react/jsx-runtime'],
  settings: {
    react: { version: '18.2' },
  },
  rules: {
    'no-empty': 'warn',
    'prefer-const': 'warn',
    'no-var': 'warn',
    'no-extra-boolean-cast': 'warn',
    'no-fallthrough': 'warn',
    'no-async-promise-executor': 'warn',
    'no-extra-semi': 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'react/no-unknown-property': ['error', { ignore: ['css'] }],
  },
  ignorePatterns: ['dist', 'node_modules', 'scripts', 'src/alibaba/ali-react-table-dist/**'],
}
