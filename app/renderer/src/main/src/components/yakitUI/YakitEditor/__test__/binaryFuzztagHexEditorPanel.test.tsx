import React from 'react'
import { cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { BinaryFuzztagHexModal as BinaryFuzztagHexModalComponent } from '../BinaryFuzztagHexModal'
import type { BinaryFuzztagHexEditor as BinaryFuzztagHexEditorComponent } from '../BinaryFuzztagHexEditor'
import type { BinaryFuzztagEntry } from '../binaryFuzztag'

// react-hex-editor mock：渲染 data-offset 单元供面板定位 querySelector 使用；
// 暴露 setSelectionRange spy 供选区断言
const { setSelectionRangeMock } = vi.hoisted(() => ({ setSelectionRangeMock: vi.fn() }))

vi.mock('react-hex-editor', async () => {
  const React = await import('react')
  return {
    default: React.forwardRef(function HexEditor({ data }: { data: Uint8Array }, ref: any) {
      React.useImperativeHandle(ref, () => ({ setSelectionRange: setSelectionRangeMock }), [])
      return (
        <div data-testid="hex-mock">
          {Array.from({ length: data.length }, (_, i) => (
            <span key={i} data-offset={i} />
          ))}
        </div>
      )
    }),
  }
})

vi.mock('react-hex-editor/themes/oneDarkPro', () => ({ default: {} }))
vi.mock('@/hook/useTheme', () => ({ useTheme: () => ({ theme: 'light' }) }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, icon, type: _type, size: _size, ...props }: any) => (
    <button type="button" {...props}>
      {icon}
      {children}
    </button>
  ),
}))
// TextArea mock 需暴露 resizableTextArea.textArea（组件经它读原生选区），
// 并模拟 antd 行为：Enter keydown 转发 onPressEnter、不替调用方 preventDefault
vi.mock('@/components/yakitUI/YakitInput/YakitInput', async () => {
  const React = await import('react')
  const TextArea = React.forwardRef(function TextArea(props: any, ref: any) {
    const taRef = React.useRef<HTMLTextAreaElement>(null)
    React.useImperativeHandle(ref, () => ({ resizableTextArea: { textArea: taRef.current } }), [])
    const { onPressEnter, ...rest } = props
    return (
      <textarea
        {...rest}
        ref={taRef}
        onKeyDown={(e: any) => {
          if (e.key === 'Enter') onPressEnter?.(e)
        }}
      />
    )
  })
  return {
    YakitInput: Object.assign((props: any) => <input {...props} />, { TextArea }),
  }
})
vi.mock('@/components/yakitUI/YakitRadioButtons/YakitRadioButtons', () => ({
  YakitRadioButtons: () => <div />,
}))
vi.mock('@/components/yakitUI/YakitSegmented/YakitSegmented', () => ({
  YakitSegmented: ({ value, options, onChange }: any) => (
    <div>
      {options.map((o: any) => (
        <button key={o.value} type="button" disabled={o.disabled} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
      <span data-active={value} />
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: vi.fn(() => ({ destroy: () => {} })),
}))
vi.mock('../../YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))
vi.mock('@/utils/notification', () => ({ warn: vi.fn(), yakitNotify: vi.fn() }))
vi.mock('@/utils/openWebsite', () => ({ saveABSFileToOpen: vi.fn() }))

let BinaryFuzztagHexModal: typeof BinaryFuzztagHexModalComponent
let BinaryFuzztagHexEditor: typeof BinaryFuzztagHexEditorComponent

beforeAll(async () => {
  Object.assign(window as any, {
    require: () => ({ ipcRenderer: { invoke: vi.fn() } }),
  })
  ;({ BinaryFuzztagHexModal } = await import('../BinaryFuzztagHexModal'))
  ;({ BinaryFuzztagHexEditor } = await import('../BinaryFuzztagHexEditor'))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const testEntry: BinaryFuzztagEntry = {
  id: 'test-unquote',
  tagName: 'unquote',
  kind: 'unquote',
  editable: true,
  originalTagText: '{{unquote("AB")}}',
  innerContent: '"AB"',
  byteLength: 2,
  previewHex: '4142',
}

describe('BinaryFuzztagHexEditor 编辑面板交互', () => {
  const makeDataRef = (bytes: number[]) => ({ current: new Uint8Array(bytes) })
  const byteAt = (offset: number) => screen.getByTestId('hex-mock').querySelector(`[data-offset="${offset}"]`)!

  it('右键无选区时锚定命中字节并弹出编辑面板', async () => {
    const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
    render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
    fireEvent.contextMenu(byteAt(2))
    expect(await screen.findByRole('button', { name: '替换' })).toBeTruthy()
    expect(screen.getByText(/选区: 0x2 - 0x2/)).toBeTruthy()
    await waitFor(() => expect(setSelectionRangeMock).toHaveBeenCalledWith(2, 3, null, false))
  })

  it('面板输入 hex 替换选中字节后关闭面板并通知宿主', async () => {
    const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
    const onChange = vi.fn()
    render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={onChange} />)
    fireEvent.contextMenu(byteAt(1))
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'ff' } })
    fireEvent.click(screen.getByRole('button', { name: '替换' }))
    await waitFor(() => expect(Array.from(dataRef.current)).toEqual([0x41, 0xff, 0x43, 0x44]))
    expect(onChange).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('button', { name: '替换' })).toBeNull())
  })

  it('面板内按 Enter 触发替换且拦截默认换行', async () => {
    const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
    render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
    fireEvent.contextMenu(byteAt(1))
    const ta = await screen.findByRole('textbox')
    fireEvent.change(ta, { target: { value: 'ff' } })
    const evt = createEvent.keyDown(ta, { key: 'Enter', keyCode: 13 })
    const preventDefault = vi.spyOn(evt, 'preventDefault')
    ta.dispatchEvent(evt)
    await waitFor(() => expect(Array.from(dataRef.current)).toEqual([0x41, 0xff, 0x43, 0x44]))
    expect(preventDefault).toHaveBeenCalled()
  })

  it('空缓冲右键弹出面板并可插入首个字节', async () => {
    const dataRef = makeDataRef([])
    render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
    fireEvent.contextMenu(screen.getByTestId('hex-mock'))
    const ta = await screen.findByRole('textbox')
    expect(screen.getByText('空数据：插入将添加为首个字节')).toBeTruthy()
    fireEvent.change(ta, { target: { value: 'ff' } })
    fireEvent.click(screen.getByRole('button', { name: '插入' }))
    await waitFor(() => expect(Array.from(dataRef.current)).toEqual([0xff]))
  })

  it('面板插入模式在选区字节前插入输入', async () => {
    const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
    render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
    fireEvent.contextMenu(byteAt(2))
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'aabb' } })
    fireEvent.click(screen.getByRole('button', { name: '插入' }))
    await waitFor(() => expect(Array.from(dataRef.current)).toEqual([0x41, 0x42, 0xaa, 0xbb, 0x43, 0x44]))
  })
})

describe('BinaryFuzztagHexModal 文字→HEX 选区带入', () => {
  const renderModal = (initialData: Uint8Array = new TextEncoder().encode('AB')) => {
    render(
      <BinaryFuzztagHexModal entry={testEntry} initialData={initialData} onSubmit={() => {}} onCancel={() => {}} />,
    )
  }
  const switchToTextAndSetCursor = async (cs: number, ce: number) => {
    fireEvent.click(screen.getByRole('button', { name: 'YakitEditor.textView' }))
    const ta = (await screen.findByRole('textbox')) as HTMLTextAreaElement
    ta.focus()
    ta.setSelectionRange(cs, ce)
    fireEvent.click(screen.getByRole('button', { name: 'HEX' }))
  }

  it('内容非合法 UTF-8 时文字 tab 禁用', () => {
    renderModal(new Uint8Array([0xff, 0xfe]))
    expect((screen.getByRole('button', { name: 'YakitEditor.textView' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('光标在文本中间切换 HEX 带入单字节选区并弹面板', async () => {
    renderModal()
    await switchToTextAndSetCursor(1, 1)
    await waitFor(() => expect(setSelectionRangeMock).toHaveBeenCalledWith(1, 2, null, false))
    expect(await screen.findByRole('button', { name: '替换' })).toBeTruthy()
  })

  it('光标在文本末尾切换 HEX 不带入越界选区（不弹面板）', async () => {
    renderModal()
    await switchToTextAndSetCursor(2, 2)
    // 等挂载/切换稳定后再断言：不产生越界 setSelectionRange、不弹面板
    await waitFor(() => expect(screen.getByRole('button', { name: '提交' })).toBeTruthy())
    expect(setSelectionRangeMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: '替换' })).toBeNull()
  })
})
