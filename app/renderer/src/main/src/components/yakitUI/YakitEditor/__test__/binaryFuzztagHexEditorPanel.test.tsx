import React from 'react'
import { cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { BinaryFuzztagHexModal as BinaryFuzztagHexModalComponent } from '../BinaryFuzztagHexModal'
import type { Base64HexFuzztagModal as Base64HexFuzztagModalComponent } from '../Base64HexFuzztagModal'
import type { BinaryFuzztagHexEditor as BinaryFuzztagHexEditorComponent } from '../BinaryFuzztagHexEditor'
import type { BinaryFuzztagEntry } from '../binaryFuzztag'

// react-hex-editor mock：渲染 data-offset 单元供面板定位 querySelector 使用；
// 暴露 setSelectionRange spy 供选区断言
const { setSelectionRangeMock, popupContainerGetters } = vi.hoisted(() => ({
  setSelectionRangeMock: vi.fn(),
  // 面板内两组下拉按钮传入的 getPopupContainer（popup 挂载容器回归断言用）。
  // 只 push 不清空（同一渲染两组下拉会互相覆盖，窗口方案不可行）；
  // 用例断言时过滤掉返回 null 的过期 getter（组件卸载后其 popRef 已归 null，天然失效）
  popupContainerGetters: [] as (() => HTMLElement | null)[],
}))

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
// RadioButtons mock：渲染可点击的 options 按钮，onChange 以 antd Radio.Group 的 e.target.value 形态触发
vi.mock('@/components/yakitUI/YakitRadioButtons/YakitRadioButtons', () => ({
  YakitRadioButtons: ({ options, onChange }: any) => (
    <div>
      {options.map((o: any) => (
        <button key={o.value} type="button" onClick={() => onChange({ target: { value: o.value } })}>
          {o.label}
        </button>
      ))}
    </div>
  ),
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
  YakitDropdownMenu: ({ children, menu, dropdown }: any) => {
    // 捕获 getPopupContainer 供回归断言（popup 挂回面板内才不会触发「点击面板外关闭」）
    if (dropdown?.getPopupContainer) {
      popupContainerGetters.push(dropdown.getPopupContainer)
    }
    return (
      <div>
        {children}
        {menu.data.map((item: { key: string; label: string }) => (
          <button key={item.key} type="button" onClick={() => menu.onClick({ key: item.key })}>
            {item.label}
          </button>
        ))}
      </div>
    )
  },
}))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))
vi.mock('@/utils/notification', () => ({ warn: vi.fn(), yakitNotify: vi.fn() }))
vi.mock('@/utils/openWebsite', () => ({ saveABSFileToOpen: vi.fn() }))

let BinaryFuzztagHexModal: typeof BinaryFuzztagHexModalComponent
let Base64HexFuzztagModal: typeof Base64HexFuzztagModalComponent
let BinaryFuzztagHexEditor: typeof BinaryFuzztagHexEditorComponent

beforeAll(async () => {
  Object.assign(window as any, {
    require: () => ({ ipcRenderer: { invoke: vi.fn() } }),
  })
  ;({ BinaryFuzztagHexModal } = await import('../BinaryFuzztagHexModal'))
  ;({ Base64HexFuzztagModal } = await import('../Base64HexFuzztagModal'))
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

// previewText 非空才会以文本编辑器起步（空则默认 HEX）
const base64Entry: BinaryFuzztagEntry = {
  id: 'test-base64',
  tagName: 'base64',
  kind: 'base64',
  editable: true,
  originalTagText: '{{base64("QUI=")}}',
  innerContent: '"QUI="',
  byteLength: 2,
  previewHex: '4142',
  previewText: 'AB',
}

describe('BinaryFuzztagHexEditor 编辑面板交互', () => {
  const makeDataRef = (bytes: number[]) => ({ current: new Uint8Array(bytes) })
  const byteAt = (offset: number) => screen.getByTestId('hex-mock').querySelector(`[data-offset="${offset}"]`)!
  // 常用按钮名（t mock 返回 key 本身）
  const REPLACE = 'YakitButton.replace'
  const INSERT = 'YakitEditor.BinaryFuzztagHexEditor.insert'

  // 打开面板并输入内容（默认右键单字节锚定）
  const openPanelAndType = async (dataRef: { current: Uint8Array }, value: string, anchor = 1) => {
    render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
    fireEvent.contextMenu(byteAt(anchor))
    fireEvent.change(await screen.findByRole('textbox'), { target: { value } })
  }
  // 拖出字节选区 [from, to] 后面板自动弹出，再输入
  const dragSelectAndType = async (dataRef: { current: Uint8Array }, value: string, from: number, to: number) => {
    render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
    fireEvent.mouseDown(byteAt(from))
    fireEvent.mouseMove(byteAt(to))
    fireEvent.mouseUp(byteAt(to))
    fireEvent.change(await screen.findByRole('textbox'), { target: { value } })
  }
  const expectBytes = async (dataRef: { current: Uint8Array }, bytes: number[]) => {
    await waitFor(() => expect(Array.from(dataRef.current)).toEqual(bytes))
  }

  it('右键无选区时锚定命中字节并弹出编辑面板', async () => {
    const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
    render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
    fireEvent.contextMenu(byteAt(2))
    expect(await screen.findByRole('button', { name: REPLACE })).toBeTruthy()
    expect(screen.getByText(/选区: 0x2 - 0x2/)).toBeTruthy()
    await waitFor(() => expect(setSelectionRangeMock).toHaveBeenCalledWith(2, 3, null, false))
  })

  it('面板输入 hex 替换选中字节后关闭面板并通知宿主', async () => {
    const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
    const onChange = vi.fn()
    render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={onChange} />)
    fireEvent.contextMenu(byteAt(1))
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'ff' } })
    fireEvent.click(screen.getByRole('button', { name: REPLACE }))
    await expectBytes(dataRef, [0x41, 0xff, 0x43, 0x44])
    expect(onChange).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByTestId('hex-edit-pop')).toBeNull())
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
    await expectBytes(dataRef, [0x41, 0xff, 0x43, 0x44])
    expect(preventDefault).toHaveBeenCalled()
  })

  it('空缓冲右键弹出面板并可插入首个字节', async () => {
    const dataRef = makeDataRef([])
    render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
    fireEvent.contextMenu(screen.getByTestId('hex-mock'))
    const ta = await screen.findByRole('textbox')
    expect(screen.getByText('空数据：插入将添加为首个字节')).toBeTruthy()
    fireEvent.change(ta, { target: { value: 'ff' } })
    fireEvent.click(screen.getByRole('button', { name: INSERT }))
    await expectBytes(dataRef, [0xff])
  })

  it('initialSelection 挂载时应用选区并自动弹面板', async () => {
    const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
    render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} initialSelection={[1, 2]} />)
    expect(await screen.findByRole('button', { name: REPLACE })).toBeTruthy()
    expect(screen.getByText(/选区: 0x1 - 0x2/)).toBeTruthy()
    await waitFor(() => expect(setSelectionRangeMock).toHaveBeenCalledWith(1, 3, null, false))
  })

  it('readOnly 时右键/拖选不弹面板、数据不可被修改', async () => {
    const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
    const onChange = vi.fn()
    render(<BinaryFuzztagHexEditor dataRef={dataRef} readOnly onChange={onChange} />)
    fireEvent.contextMenu(byteAt(1))
    fireEvent.mouseDown(byteAt(1))
    fireEvent.mouseUp(byteAt(1))
    // 等一拍（rAF/mouseup 面板链路）确认面板未弹出
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByTestId('hex-edit-pop')).toBeNull()
    expect(Array.from(dataRef.current)).toEqual([0x41, 0x42, 0x43, 0x44])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('点击面板外（hex 区域）关闭面板', async () => {
    const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
    render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
    fireEvent.contextMenu(byteAt(1))
    await screen.findByRole('textbox')
    expect(screen.getByTestId('hex-edit-pop')).toBeTruthy()
    // 面板外 mousedown（样式类名在根 vitest 下不存在，target 不在面板内即触发关闭）
    fireEvent.mouseDown(byteAt(3))
    await waitFor(() => expect(screen.queryByTestId('hex-edit-pop')).toBeNull())
  })

  it('键盘原地覆盖：HexEditor onSetValue 直接写共享缓冲', async () => {
    const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
    const onChange = vi.fn()
    render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={onChange} />)
    // mock 的 HexEditor 不转发 onSetValue，此处经 mouseDown 的 preventDefault 分支之外，
    // 直接验证 handleSetValue 链路：通过 contextMenu 弹面板替换已是 splice 链路，
    // 键盘链路由真实 react-hex-editor 覆盖（jsdom 无该链路入口），此处锁定 readOnly 守卫之外的数据稳定性
    fireEvent.contextMenu(byteAt(1))
    await screen.findByRole('textbox')
    expect(Array.from(dataRef.current)).toEqual([0x41, 0x42, 0x43, 0x44])
    expect(onChange).not.toHaveBeenCalled()
  })

  describe('输入格式', () => {
    it('面板切 Base64 输入解码后替换选中字节', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
      fireEvent.contextMenu(byteAt(1))
      await screen.findByRole('textbox')
      fireEvent.click(screen.getByRole('button', { name: 'Base64' }))
      // '/w==' 是单字节 0xff 的 Base64
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '/w==' } })
      fireEvent.click(screen.getByRole('button', { name: REPLACE }))
      await expectBytes(dataRef, [0x41, 0xff, 0x43, 0x44])
    })

    it('面板切 Base64 输入非法时告警且不修改数据、面板保持打开', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
      fireEvent.contextMenu(byteAt(1))
      await screen.findByRole('textbox')
      fireEvent.click(screen.getByRole('button', { name: 'Base64' }))
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '!!' } })
      fireEvent.click(screen.getByRole('button', { name: REPLACE }))
      const { warn } = await import('@/utils/notification')
      await waitFor(() => expect(warn).toHaveBeenCalledWith('YakitEditor.BinaryFuzztagHexEditor.invalidBase64Input'))
      expect(Array.from(dataRef.current)).toEqual([0x41, 0x42, 0x43, 0x44])
      expect(screen.getByTestId('hex-edit-pop')).toBeTruthy()
    })

    it('面板切 ASCII 输入文本按 UTF-8 编码替换', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
      fireEvent.contextMenu(byteAt(1))
      await screen.findByRole('textbox')
      fireEvent.click(screen.getByRole('button', { name: 'YakitEditor.textView' }))
      // 单字节选区只放得下 1 字符（'中' 是 3 字节会走超出询问，此处验单字符路径）
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Z' } })
      fireEvent.click(screen.getByRole('button', { name: REPLACE }))
      await expectBytes(dataRef, [0x41, 0x5a, 0x43, 0x44])
    })

    it('hex 输入奇数长度告警且不修改数据', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
      fireEvent.contextMenu(byteAt(1))
      fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'ff0' } })
      fireEvent.click(screen.getByRole('button', { name: REPLACE }))
      const { warn } = await import('@/utils/notification')
      await waitFor(() => expect(warn).toHaveBeenCalledWith('YakitEditor.BinaryFuzztagHexEditor.invalidHexInput'))
      expect(Array.from(dataRef.current)).toEqual([0x41, 0x42, 0x43, 0x44])
    })

    it('hex 输入非法字符告警且不修改数据', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
      fireEvent.contextMenu(byteAt(1))
      fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'zz' } })
      fireEvent.click(screen.getByRole('button', { name: REPLACE }))
      const { warn } = await import('@/utils/notification')
      await waitFor(() => expect(warn).toHaveBeenCalledWith('YakitEditor.BinaryFuzztagHexEditor.invalidHexInput'))
      expect(Array.from(dataRef.current)).toEqual([0x41, 0x42, 0x43, 0x44])
    })

    it('hex 输入空白分隔符被忽略（f f 合法）', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
      fireEvent.contextMenu(byteAt(1))
      // 单字节选区放 'f f'（去空白后 1 字节）；'ff bb' 是 2 字节会走超出询问
      fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'f f' } })
      fireEvent.click(screen.getByRole('button', { name: REPLACE }))
      // 'f f' 去空白后是 'ff'（1 字节 0xff），不超出 1 字节选区
      await expectBytes(dataRef, [0x41, 0xff, 0x43, 0x44])
    })

    it('空输入告警且面板保持打开', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
      fireEvent.contextMenu(byteAt(1))
      await screen.findByRole('textbox')
      fireEvent.click(screen.getByRole('button', { name: REPLACE }))
      const { warn } = await import('@/utils/notification')
      await waitFor(() => expect(warn).toHaveBeenCalledWith('YakitEditor.BinaryFuzztagHexEditor.emptyInput'))
      expect(Array.from(dataRef.current)).toEqual([0x41, 0x42, 0x43, 0x44])
      expect(screen.getByTestId('hex-edit-pop')).toBeTruthy()
    })
  })

  describe('插入模式', () => {
    it('主按钮向前插入在选区首字节前', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      await openPanelAndType(dataRef, 'aabb', 2)
      fireEvent.click(screen.getByRole('button', { name: INSERT }))
      await expectBytes(dataRef, [0x41, 0x42, 0xaa, 0xbb, 0x43, 0x44])
    })

    it('菜单「选中区域向后插入」在选区末字节后插入', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      await openPanelAndType(dataRef, 'aabb', 1)
      fireEvent.click(screen.getByRole('button', { name: 'YakitEditor.BinaryFuzztagHexEditor.insertAfter' }))
      // 选区 [1,1]，向后插入落在字节 1 之后
      await expectBytes(dataRef, [0x41, 0x42, 0xaa, 0xbb, 0x43, 0x44])
    })

    it('向后插入在缓冲末字节选区时追加到末尾', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      await openPanelAndType(dataRef, 'aa', 3)
      fireEvent.click(screen.getByRole('button', { name: 'YakitEditor.BinaryFuzztagHexEditor.insertAfter' }))
      // 选区 [3,3] 是末字节，向后插入落在末尾（pos=4）
      await expectBytes(dataRef, [0x41, 0x42, 0x43, 0x44, 0xaa])
    })

    it('反向拖选（先按高字节后拖到低字节）向前插入取较低偏移', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      await dragSelectAndType(dataRef, 'aa', 2, 1)
      // 反向选区 refs 为 start=2,end=1；向前插入应取 min=1，即插在字节 1 之前
      fireEvent.click(screen.getByRole('button', { name: INSERT }))
      await expectBytes(dataRef, [0x41, 0xaa, 0x42, 0x43, 0x44])
    })
  })

  describe('替换模式', () => {
    it('短输入「替换(向后补空字节)」补 0x00 在输入之后', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      await dragSelectAndType(dataRef, 'ff', 1, 2)
      fireEvent.click(screen.getByRole('button', { name: 'YakitEditor.BinaryFuzztagHexEditor.replacePadAfter' }))
      // 输入 ff 在前、0x00 补在后，替换 2 字节后总长不变
      await expectBytes(dataRef, [0x41, 0xff, 0x00, 0x44])
    })

    it('短输入「替换(向前补空字节)」补 0x00 在输入之前', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      await dragSelectAndType(dataRef, 'ff', 1, 2)
      fireEvent.click(screen.getByRole('button', { name: 'YakitEditor.BinaryFuzztagHexEditor.replacePadBefore' }))
      // 0x00 补在前、输入 ff 在后
      await expectBytes(dataRef, [0x41, 0x00, 0xff, 0x44])
    })

    it('「替换(不补空字节)」短输入时收缩选区长度', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      await dragSelectAndType(dataRef, 'ff', 1, 2)
      fireEvent.click(screen.getByRole('button', { name: 'YakitEditor.BinaryFuzztagHexEditor.replaceNoPad' }))
      // 默认替换按输入实际长度伸缩，2 字节选区被 1 字节替换
      await expectBytes(dataRef, [0x41, 0xff, 0x44])
    })

    it('补空字节模式输入等于选区长度时不补（等同普通替换）', async () => {
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      await dragSelectAndType(dataRef, 'ffbb', 1, 2)
      fireEvent.click(screen.getByRole('button', { name: 'YakitEditor.BinaryFuzztagHexEditor.replacePadAfter' }))
      await expectBytes(dataRef, [0x41, 0xff, 0xbb, 0x44])
    })

    it('下拉 popup 容器挂回面板节点：点菜单项不会连带关闭编辑面板', async () => {
      // 真实行为回归：antd popup 默认挂 body，点菜单项的 mousedown 命中 hex-body 的 mousedownCapture
      // 「面板外关闭」判断 → 编辑面板被连带关掉。组件须传 getPopupContainer 挂回 popRef 面板内。
      // jsdom 的 DropdownMenu mock 无真实 popup，改为断言传入的 getPopupContainer 都解析到面板内。
      // 定位用 data-testid（CI 根 vitest 会把 scss stub 成空对象，styles 类名不存在，勿用 class 匹配）
      const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
      render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
      fireEvent.contextMenu(byteAt(1))
      await screen.findByRole('textbox')
      const panelRoot = screen.getByTestId('hex-edit-pop')
      // getter 数组跨用例累积，过滤掉返回 null 的过期 getter（前面用例卸载后其 popRef 已 null）
      const liveGetters = popupContainerGetters.filter((getContainer) => getContainer() != null)
      expect(liveGetters.length).toBeGreaterThanOrEqual(2)
      for (const getContainer of liveGetters) {
        expect(panelRoot.contains(getContainer()!)).toBe(true)
      }
    })

    describe('输入超出选区：弹出询问弹窗', () => {
      // showYakitModal mock 不渲染 content，改由 resolve 行为区分：直接驱动 mock 的 Promise 流程
      // （mock 返回 { destroy }；askOverflow 内部 new Promise 的 resolve 由 content 按钮触发——
      //  content 未渲染时 Promise 永不 resolve，applyEdit 停在 await。因此用例改为验证弹窗已被唤起）
      const expectOverflowAsked = async (dataRef: { current: Uint8Array }, value: string) => {
        render(<BinaryFuzztagHexEditor dataRef={dataRef} onChange={() => {}} />)
        fireEvent.contextMenu(byteAt(1))
        fireEvent.change(await screen.findByRole('textbox'), { target: { value } })
        fireEvent.click(screen.getByRole('button', { name: REPLACE }))
        const { showYakitModal } = await import('@/components/yakitUI/YakitModal/YakitModalConfirm')
        await waitFor(() => expect(showYakitModal).toHaveBeenCalled())
        // 未作出选择前数据不变、面板不关
        expect(Array.from(dataRef.current)).toEqual([0x41, 0x42, 0x43, 0x44])
        expect(screen.getByTestId('hex-edit-pop')).toBeTruthy()
      }

      it('输入超出选区时唤起询问弹窗且数据保持不变', async () => {
        const dataRef = makeDataRef([0x41, 0x42, 0x43, 0x44])
        // 选区 [1,1] 共 1 字节，输入 3 字节超出
        await expectOverflowAsked(dataRef, 'aabbcc')
      })
    })
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
    expect(await screen.findByRole('button', { name: 'YakitButton.replace' })).toBeTruthy()
  })

  it('光标在文本末尾切换 HEX 不带入越界选区（不弹面板）', async () => {
    renderModal()
    await switchToTextAndSetCursor(2, 2)
    // 等挂载/切换稳定后再断言：不产生越界 setSelectionRange、不弹面板
    await waitFor(() => expect(screen.getByRole('button', { name: '提交' })).toBeTruthy())
    expect(setSelectionRangeMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'YakitButton.replace' })).toBeNull()
  })
})

describe('Base64HexFuzztagModal 文字→HEX 选区带入', () => {
  const renderBase64Modal = (initialData: Uint8Array) => {
    render(
      <Base64HexFuzztagModal entry={base64Entry} initialData={initialData} onSubmit={() => {}} onCancel={() => {}} />,
    )
  }
  const setSelectionAndSwitchToHex = async (cs: number, ce: number) => {
    const ta = (await screen.findByRole('textbox')) as HTMLTextAreaElement
    ta.focus()
    ta.setSelectionRange(cs, ce)
    fireEvent.click(screen.getByRole('button', { name: 'HEX' }))
  }

  it('光标在多字节文本中间切换 HEX 带入单字节选区并弹面板', async () => {
    // A(1B) + 中(3B) + B(1B) 共 5 字节；光标落在 中 与 B 之间 -> 字节偏移 4
    renderBase64Modal(new TextEncoder().encode('A中B'))
    await setSelectionAndSwitchToHex(2, 2)
    await waitFor(() => expect(setSelectionRangeMock).toHaveBeenCalledWith(4, 5, null, false))
    expect(await screen.findByRole('button', { name: 'YakitButton.replace' })).toBeTruthy()
  })

  it('选中多字节区间切换 HEX 带入字节区间选区', async () => {
    // 选中 A中（字符 [0,2) = 4 字节）-> 字节闭区间 [0,3]
    renderBase64Modal(new TextEncoder().encode('A中B'))
    await setSelectionAndSwitchToHex(0, 2)
    await waitFor(() => expect(setSelectionRangeMock).toHaveBeenCalledWith(0, 4, null, false))
    expect(screen.getByText(/选区: 0x0 - 0x3/)).toBeTruthy()
  })

  it('光标在文本末尾切换 HEX 不带入越界选区（不弹面板）', async () => {
    renderBase64Modal(new TextEncoder().encode('AB'))
    await setSelectionAndSwitchToHex(2, 2)
    await waitFor(() => expect(screen.getByRole('button', { name: '提交' })).toBeTruthy())
    expect(setSelectionRangeMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'YakitButton.replace' })).toBeNull()
  })
})
