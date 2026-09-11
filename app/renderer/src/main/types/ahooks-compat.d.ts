/**
 * ahooks 3.9 的 useMemoizedFn 对 async 函数推断过窄，补回「返回原函数类型」。
 */
import 'ahooks'

declare module 'ahooks' {
  export function useMemoizedFn<T extends (...args: any[]) => any>(fn: T): T
}

export {}
