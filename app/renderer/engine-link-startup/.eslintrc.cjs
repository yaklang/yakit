/** ESLint 8 + TS/TSX（偏宽松，与历史代码共存；类型安全以 tsc 为准） */
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
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: { version: '18.2' },
  },
  rules: {
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'no-unused-vars': 'off',
    'prefer-const': 'warn',
    'no-var': 'warn',
    'no-extra-boolean-cast': 'warn',
    'no-fallthrough': 'warn',
    'no-async-promise-executor': 'warn',
    'no-extra-semi': 'warn',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'react/no-unknown-property': ['error', { ignore: ['css', 'p-id'] }],
    'react-hooks/rules-of-hooks': 'error', // 强制执行 React Hooks 的规则。
    'react-hooks/exhaustive-deps': 'warn', // 依赖数组是否完整

    // 关闭 v7 新增的 React Compiler lint 规则
    'react-hooks/set-state-in-effect': 'off', // 检查在 useEffect 中直接调用 setState 是否会导致不必要的重新渲染或无限循环
    'react-hooks/immutability': 'off', //  检查 Hook 是否以不可变方式更新状态
    'react-hooks/refs': 'off', // 检查 useRef 的使用规范。
    'react-hooks/use-memo': 'off', // useMemo 的使用是否合理
    'react-hooks/purity': 'off',
    'react-hooks/set-state-in-render': 'off',
    'react-hooks/static-components': 'off',
    'react-hooks/void-use-memo': 'off',
    'react-hooks/effect-deps': 'off',
    'react-hooks/memo-dependencies': 'off',
    'react-hooks/config': 'off',
    'react-hooks/suppression': 'off',
    'react-hooks/preserve-manual-memoization': 'off', // 保留现有手动 memoization
    'react-hooks/error-boundaries': 'off', // 要求组件实现错误边界

    'no-useless-escape': 'warn',
    'no-control-regex': 'warn',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports',
      },
    ],
  },
  ignorePatterns: ['dist', 'node_modules', 'scripts'],
}
