/**
 * Vitest 全局 setup：注册 @testing-library/jest-dom matchers。
 * 与主渲染端 app/renderer/src/main/src/setupVitest.ts 保持一致：用 expect.extend(matchers)，
 * 避免 `@testing-library/jest-dom/vitest` 在嵌套 node_modules 下 require 到另一份 vitest
 * 导致 matchers 挂不上当前 expect。
 */
import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)
