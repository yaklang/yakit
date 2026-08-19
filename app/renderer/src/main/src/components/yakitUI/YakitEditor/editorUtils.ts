import type { YakitSystem } from '@/yakitGVDefine'
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api'
import type { EditorMenuItemDividerProps, EditorMenuItemProps, EditorMenuItemType } from './EditorMenu'
import type { YakitIMonacoEditor } from './YakitEditorType'
import { throttle } from 'lodash'
import { expandBinaryFuzztagByModelKey } from './binaryFuzztag'

// 纯常量/函数提取到独立模块，避免 layout 链路通过 editorUtils 间接拉入 monaco-editor
export { KeyboardToValue, MacKeyborad, WinKeyborad, keySortHandle, convertKeyboard } from './keyboardConstants'
import { keySortHandle } from './keyboardConstants'

/**
 * @name 获取编辑器光标选中坐标范围值
 * @param editor 编辑器对象实例
 * @param isGetRow 未选中内容时是否获取整行内容,有选中内容时该字段无效
 * @returns monaco.Range实例 | null
 */
export const fetchSelectionRange = (editor: YakitIMonacoEditor, isGetRow?: boolean) => {
  const selection = editor?.getSelection()
  if (!selection) return null
  const model = editor?.getModel()
  if (!model) return null

  const startColumn = selection.startColumn
  const startLineNumber = selection.startLineNumber
  const endColumn = selection.endColumn
  const endLineNumber = selection.endLineNumber
  let noSelected: boolean = startColumn === endColumn && startLineNumber === endLineNumber
  noSelected = !!isGetRow && noSelected

  return new monacoEditor.Range(
    startLineNumber,
    noSelected ? 1 : startColumn,
    endLineNumber,
    noSelected ? model.getLineMaxColumn(startLineNumber) : endColumn,
  )
}

/**
 * @name 获取编辑器光标选中内容
 * @param editor 编辑器对象实例
 * @param isGetRow 未选中内容时是否获取整行内容,有选中内容时该字段无效
 */
export const fetchCursorContent = (editor: YakitIMonacoEditor, isGetRow?: boolean) => {
  const model = editor?.getModel()
  if (!model) return ''
  const range = fetchSelectionRange(editor, isGetRow)
  if (!range) return ''

  // 还原二进制 Fuzztag 折叠占位(#YBIN_)为真实内容，保证右键复制等路径复制出去的是真实标签而非内部占位
  return expandBinaryFuzztagByModelKey(model, model.getValueInRange(range))
}

/** 获取编辑器全文，并还原二进制 Fuzztag 折叠占位(#YBIN_)为真实内容 */
export const fetchEditorFullContent = (editor: YakitIMonacoEditor): string => {
  const model = editor?.getModel()
  if (!model) return ''
  return expandBinaryFuzztagByModelKey(model, model.getValue())
}

/**
 * @name 获取编辑器光标选中内容字节数
 * @param editor 编辑器对象实例
 */
export const getSelectionEditorByteCount = (
  editor: YakitIMonacoEditor,
  updateCallback: (byteCount: number) => void,
): void => {
  let prevByteCount = -1

  const throttledCallback = throttle((byteCount: number) => {
    updateCallback(byteCount)
  }, 400)

  editor.onDidChangeCursorSelection(() => {
    const selection = editor.getSelection()
    let byteCount = 0

    if (selection && !selection.isEmpty()) {
      const model = editor.getModel()
      if (model) {
        const selectedText = model.getValueInRange(selection)
        const encoder = new TextEncoder()
        byteCount = encoder.encode(selectedText).length
      }
    }

    if (byteCount !== prevByteCount) {
      prevByteCount = byteCount
      throttledCallback(byteCount)
    }
  })
}

/**
 * @name 获取自定义菜单所有项的key值，并整合成一个一维数组
 * @description 注意！！！ 本方法使用了ES10中数据对象新方法 flat 使用时请确定是否存在该方法
 * @description 全局暂未使用该方法，如后续有使用，请修改该条注释内容
 */
export const flatContextMenu = (menus: EditorMenuItemType[]) => {
  const filterDividerMenus = menus
    .filter((item) => {
      if (typeof (item as any as EditorMenuItemDividerProps)['type'] !== 'undefined') {
        return false
      }
      return true
    })
    .map((item) => {
      const info = item as any as EditorMenuItemProps
      return info
    })

  const flatMenus = filterDividerMenus.flat(Infinity).map((item) => item.key)

  return flatMenus
}
