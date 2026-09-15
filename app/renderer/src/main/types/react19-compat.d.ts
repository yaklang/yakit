import type * as React from 'react'

/**
 * React 19 类型兼容：补回 useRef 无参 / useRef(null) 的 React 18 形态，以及全局 JSX。
 */
declare module 'react' {
  function useRef<T = undefined>(): React.RefObject<T | undefined>
  function useRef<T>(initialValue: T | null): React.RefObject<T>
}

declare global {
  namespace JSX {
    type Element = React.JSX.Element
    type ElementClass = React.JSX.ElementClass
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes
    type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>
    type IntrinsicElements = React.JSX.IntrinsicElements
  }
}

export {}
