import React, { useRef } from 'react'
import { Select } from 'antd'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InputToolbar } from '../InputToolbar'
afterEach(cleanup)
describe('message editor toolbar focus boundary', () => {
  it('keeps a real AntD dropdown open and permits choosing an effort without refocusing the editor', async () => {
    const refocus = vi.fn()
    const change = vi.fn()
    const Harness = () => {
      const editor = useRef<HTMLInputElement>(null)
      return (
        <div
          onClick={() => {
            refocus()
            editor.current?.focus()
          }}
        >
          <input ref={editor} aria-label="message" />
          <InputToolbar>
            <Select
              aria-label="effort"
              options={[
                { value: 'low', label: 'Low' },
                { value: 'high', label: 'High' },
              ]}
              onChange={change}
            />
          </InputToolbar>
        </div>
      )
    }
    render(<Harness />)
    const combo = screen.getByRole('combobox')
    fireEvent.mouseDown(combo.closest('.ant-select-selector')!)
    fireEvent.click(combo)
    await waitFor(() => expect(combo).toHaveAttribute('aria-expanded', 'true'))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 180))
    })
    expect(combo).toHaveAttribute('aria-expanded', 'true')
    expect(refocus).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('High'))
    expect(change).toHaveBeenCalledWith('high', expect.anything())
    expect(refocus).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('message'))
    expect(refocus).toHaveBeenCalledTimes(1)
  })
  it('preserves toolbar actions while stopping click propagation', () => {
    const outer = vi.fn(),
      action = vi.fn()
    render(
      <div onClick={outer}>
        <InputToolbar>
          <button onClick={action}>probe</button>
        </InputToolbar>
      </div>,
    )
    fireEvent.click(screen.getByText('probe'))
    expect(action).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
  })
})
