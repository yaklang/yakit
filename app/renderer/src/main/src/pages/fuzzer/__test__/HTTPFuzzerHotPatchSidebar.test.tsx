import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HotPatchTempDefault } from '@/defaultConstants/HTTPFuzzerPage'

vi.hoisted(() => {
  const ipcRenderer = {
    on: () => undefined,
    off: () => undefined,
    once: () => undefined,
    removeListener: () => undefined,
    removeAllListeners: () => undefined,
    send: () => undefined,
    invoke: () => Promise.resolve({ Data: [] }),
  }
  ;(window as unknown as { require: (id: string) => unknown }).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer }
    return {}
  }
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(window as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = ResizeObserverStub
})

vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({
  YakitEditor: ({ type, value, setValue }: { type?: string; value: string; setValue?: (next: string) => void }) => (
    <textarea
      data-testid={type === 'yak' ? 'hotpatch-code' : 'hotpatch-template'}
      value={value}
      onChange={(event) => setValue?.(event.target.value)}
    />
  ),
}))

import { HTTPFuzzerHotPatchSidebar } from '../HTTPFuzzerHotPatch'

const selectedTemplate = HotPatchTempDefault[0]
const editedCode = `${selectedTemplate.temp}\n// user edit`

const renderSidebar = (options: {
  visible: boolean
  hotPatchCode: string
  selectedTemplateName?: string
  onChangeCode: (code: string) => void
}) =>
  render(
    <HTTPFuzzerHotPatchSidebar
      pageId="page-1"
      visible={options.visible}
      inViewport={true}
      hotPatchCode={options.hotPatchCode}
      hotPatchCodeWithParamGetter=""
      selectedTemplateName={options.selectedTemplateName}
      onChangeCode={options.onChangeCode}
      onChangeHotPatchCodeWithParamGetterCode={() => undefined}
      onSaveCode={() => undefined}
      onSaveHotPatchCodeWithParamGetterCode={() => undefined}
      hotPatchEnabled={false}
      onHotPatchEnabledChange={() => undefined}
    />,
  )

afterEach(() => {
  cleanup()
})

describe('HTTPFuzzerHotPatchSidebar 热加载编辑器', () => {
  it('未选择模板时，收起再展开仍保留编辑内容', () => {
    let hotPatchCode = 'default hot patch'
    const onChangeCode = (code: string) => {
      hotPatchCode = code
    }
    const view = renderSidebar({ visible: true, hotPatchCode, selectedTemplateName: '', onChangeCode })

    fireEvent.change(screen.getByTestId('hotpatch-code'), { target: { value: 'default hot patch edited' } })
    view.rerender(
      <HTTPFuzzerHotPatchSidebar
        pageId="page-1"
        visible={false}
        inViewport={true}
        hotPatchCode={hotPatchCode}
        hotPatchCodeWithParamGetter=""
        selectedTemplateName=""
        onChangeCode={onChangeCode}
        onChangeHotPatchCodeWithParamGetterCode={() => undefined}
        onSaveCode={() => undefined}
        onSaveHotPatchCodeWithParamGetterCode={() => undefined}
        hotPatchEnabled={false}
        onHotPatchEnabledChange={() => undefined}
      />,
    )
    view.rerender(
      <HTTPFuzzerHotPatchSidebar
        pageId="page-1"
        visible={true}
        inViewport={true}
        hotPatchCode={hotPatchCode}
        hotPatchCodeWithParamGetter=""
        selectedTemplateName=""
        onChangeCode={onChangeCode}
        onChangeHotPatchCodeWithParamGetterCode={() => undefined}
        onSaveCode={() => undefined}
        onSaveHotPatchCodeWithParamGetterCode={() => undefined}
        hotPatchEnabled={false}
        onHotPatchEnabledChange={() => undefined}
      />,
    )

    expect(screen.getByTestId('hotpatch-code')).toHaveValue('default hot patch edited')
  })

  it('选中模板并编辑后，收起再展开不应回退到模板原文', () => {
    let hotPatchCode = selectedTemplate.temp
    const onChangeCode = (code: string) => {
      hotPatchCode = code
    }
    const view = renderSidebar({
      visible: true,
      hotPatchCode,
      selectedTemplateName: selectedTemplate.name,
      onChangeCode,
    })

    fireEvent.change(screen.getByTestId('hotpatch-code'), { target: { value: editedCode } })
    view.rerender(
      <HTTPFuzzerHotPatchSidebar
        pageId="page-1"
        visible={false}
        inViewport={true}
        hotPatchCode={hotPatchCode}
        hotPatchCodeWithParamGetter=""
        selectedTemplateName={selectedTemplate.name}
        onChangeCode={onChangeCode}
        onChangeHotPatchCodeWithParamGetterCode={() => undefined}
        onSaveCode={() => undefined}
        onSaveHotPatchCodeWithParamGetterCode={() => undefined}
        hotPatchEnabled={false}
        onHotPatchEnabledChange={() => undefined}
      />,
    )
    view.rerender(
      <HTTPFuzzerHotPatchSidebar
        pageId="page-1"
        visible={true}
        inViewport={true}
        hotPatchCode={hotPatchCode}
        hotPatchCodeWithParamGetter=""
        selectedTemplateName={selectedTemplate.name}
        onChangeCode={onChangeCode}
        onChangeHotPatchCodeWithParamGetterCode={() => undefined}
        onSaveCode={() => undefined}
        onSaveHotPatchCodeWithParamGetterCode={() => undefined}
        hotPatchEnabled={false}
        onHotPatchEnabledChange={() => undefined}
      />,
    )

    expect(screen.getByTestId('hotpatch-code')).toHaveValue(editedCode)
  })

  it('切换模板名时仍载入新模板原文', () => {
    const nextTemplate = HotPatchTempDefault[1]
    let hotPatchCode = selectedTemplate.temp
    const onChangeCode = (code: string) => {
      hotPatchCode = code
    }
    const view = renderSidebar({
      visible: true,
      hotPatchCode,
      selectedTemplateName: selectedTemplate.name,
      onChangeCode,
    })

    view.rerender(
      <HTTPFuzzerHotPatchSidebar
        pageId="page-1"
        visible={true}
        inViewport={true}
        hotPatchCode={hotPatchCode}
        hotPatchCodeWithParamGetter=""
        selectedTemplateName={nextTemplate.name}
        onChangeCode={onChangeCode}
        onChangeHotPatchCodeWithParamGetterCode={() => undefined}
        onSaveCode={() => undefined}
        onSaveHotPatchCodeWithParamGetterCode={() => undefined}
        hotPatchEnabled={false}
        onHotPatchEnabledChange={() => undefined}
      />,
    )

    expect(screen.getByTestId('hotpatch-code')).toHaveValue(nextTemplate.temp)
  })
})
