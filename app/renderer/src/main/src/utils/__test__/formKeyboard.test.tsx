import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InputNumber, Select } from 'antd'
import { preventImplicitFormSubmit } from '../formKeyboard'

describe('编辑表单回车行为', () => {
  it('数字输入回车提交数值，但不提交表单；按钮回车仍可提交', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onPressEnter = vi.fn()
    render(
      <form
        onKeyDown={preventImplicitFormSubmit}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <InputNumber aria-label="CVSS" min={0} max={10} onPressEnter={onPressEnter} />
        <button type="submit">确定</button>
      </form>,
    )
    await user.type(screen.getByRole('spinbutton', { name: 'CVSS' }), '7{Enter}')
    expect(onPressEnter).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
    act(() => screen.getByRole('button', { name: '确定' }).focus())
    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('回车仍能确认下拉标签，不提交表单', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onChange = vi.fn()
    render(
      <form
        onKeyDown={preventImplicitFormSubmit}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <Select mode="tags" onChange={onChange} options={[]} />
        <button type="submit">确定</button>
      </form>,
    )
    await user.type(screen.getByRole('combobox'), 'pending')
    // rc-select 使用旧版 keyCode 判断回车，user-event 不填充该字段。
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', keyCode: 13, which: 13 })
    expect(onChange).toHaveBeenCalledWith(['pending'], expect.anything())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('文本域回车换行，普通按键与输入法确认不被拦截', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <form
        onKeyDown={preventImplicitFormSubmit}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <textarea aria-label="说明" />
        <input aria-label="输入" />
        <button type="submit">确定</button>
      </form>,
    )
    await user.type(screen.getByLabelText('说明'), 'first{Enter}second')
    expect(screen.getByLabelText('说明')).toHaveValue('first\nsecond')
    expect(onSubmit).not.toHaveBeenCalled()
    const input = screen.getByLabelText('输入')
    expect(fireEvent.keyDown(input, { key: 'Enter', isComposing: true })).toBe(true)
    expect(fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })).toBe(true)
    expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(true)
    expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false)
  })
})
