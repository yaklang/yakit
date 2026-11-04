import React from 'react'
import '../../../pages/ai-re-act/hooks/__test__/setupElectron'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Form, type FormInstance } from 'antd'
import { YakScriptModelFields } from '../YakScriptModelFields'
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({
  YakitEditor: ({ value, setValue, readOnly }: any) => (
    <textarea
      aria-label="script"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      readOnly={readOnly}
    />
  ),
}))
vi.mock('@/components/yakitUI/YakitSwitch/YakitSwitch', () => ({
  YakitSwitch: ({ value, checked, onChange, disabled }: any) => (
    <button
      role="switch"
      aria-checked={checked ?? value ?? false}
      disabled={disabled}
      onClick={() => onChange(!(checked ?? value))}
    >
      native
    </button>
  ),
}))
let form: FormInstance
const Harness = ({ disabled = false }: { disabled?: boolean }) => {
  const [instance] = Form.useForm()
  form = instance
  return (
    <Form form={instance} initialValues={{ script: 'old', enable_native_tool_calling: false }}>
      <YakScriptModelFields disabled={disabled} />
    </Form>
  )
}
beforeEach(async () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
describe('script editor form contract', () => {
  it('submits the current editor text and native-tool toggle', async () => {
    await act(async () => {
      render(<Harness />)
    })
    await waitFor(() => expect(screen.getByLabelText('script')).toBeInTheDocument(), { timeout: 5000 })
    fireEvent.change(screen.getByLabelText('script'), { target: { value: 'func(){ return "new" }' } })
    fireEvent.click(screen.getByRole('switch'))
    expect(await form.validateFields()).toMatchObject({
      script: 'func(){ return "new" }',
      enable_native_tool_calling: true,
    })
  })
  it('rejects an empty script and respects read-only state', async () => {
    await act(async () => {
      render(<Harness disabled />)
    })
    await waitFor(() => expect(screen.getByLabelText('script')).toHaveAttribute('readonly'))
    expect(screen.getByRole('switch')).toBeDisabled()
    act(() => form.setFieldsValue({ script: '   ' }))
    await expect(form.validateFields()).rejects.toBeTruthy()
  })
})
