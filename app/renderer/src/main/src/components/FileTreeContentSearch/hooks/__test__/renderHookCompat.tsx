import React from 'react'
import { render } from '@testing-library/react'
export function renderHook<T, P = undefined>(callback: (props: P) => T, options?: { initialProps: P }) {
  const result = { current: undefined as unknown as T }
  let props = options?.initialProps as P
  const Harness = ({ value }: { value: P }) => {
    result.current = callback(value)
    return null
  }
  const view = render(<Harness value={props} />)
  return {
    result,
    unmount: view.unmount,
    rerender: (next: P = props) => {
      props = next
      view.rerender(<Harness value={props} />)
    },
  }
}
