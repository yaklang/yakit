import type React from 'react'
import type { monaco } from 'react-monaco-editor'
import { fontSizeOptions } from '@/store/editorFontSize'
import type { YakParamProps } from '@/pages/plugins/pluginsType'
import type { TFunction } from '@/i18n/useI18nNamespaces'
import type { EditorMenuItemType } from '../EditorMenu'
import type { YakitIMonacoEditor } from '../YakitEditorType'

export { MAX_BINARY_FOLD_ENTRIES } from '../binaryFoldLimits'

export interface CodecTypeProps {
  key?: string
  verbose: string
  subTypes?: CodecTypeProps[]
  params?: YakParamProps[]
  help?: React.ReactNode
  isYakScript?: boolean
}

export interface contextMenuProps {
  key: string
  value: string
  isAiPlugin: boolean
  params: YakParamProps[]
}

interface IFindReplaceState {
  isRevealed: boolean
  searchString: string
  change(update: { searchString: string }, moveCursor: boolean): void
  onFindReplaceStateChange: monaco.IEvent<() => void>
}

interface IFindController extends monaco.editor.IStandaloneCodeEditor {
  getState(): IFindReplaceState
  start(opts?: {
    forceRevealReplace?: boolean
    seedSearchStringFromSelection?: boolean
    shouldFocus?: boolean
    seedSearchStringFromGlobalClipboard?: boolean
  }): void
}

/** 插件扩展前缀 */
export const PLUGIN_PREFIX = 'pluginExtension_'

/** @name 字体key值对应字体大小 */
export const keyToFontSize: Record<string, number> = {
  'font-size-small': 12,
  'font-size-middle': 16,
  'font-size-large': 20,
}

/** 编辑器右键默认菜单 - 顶部 */
export const DefaultMenuTop: (t: TFunction, nowFontsize: number) => EditorMenuItemType[] = (t, nowFontsize) => {
  return [
    {
      key: 'font-size',
      label: t('YakitEditor.fontSize'),
      children: fontSizeOptions.map((val) => ({
        key: val + '',
        label: `${val}${nowFontsize === val ? '\u00A0\u00A0\u00A0✓' : ''}`,
      })),
    },
  ]
}

/** 编辑器右键默认菜单 - 底部 */
export const DefaultMenuBottom: (t: TFunction) => EditorMenuItemType[] = (t) => {
  return [
    { key: 'cut', label: t('YakitEditor.cut') },
    { key: 'copy', label: t('YakitEditor.copy') },
    { key: 'paste', label: t('YakitEditor.paste') },
  ]
}

export function openFind(editor: YakitIMonacoEditor, keyword: string) {
  // editor.focus()
  const findController = editor.getContribution<IFindController>('editor.contrib.findController')
  const state = findController?.getState()
  if (!state?.isRevealed) {
    findController?.start({
      seedSearchStringFromSelection: false,
      shouldFocus: true,
    })
  }

  if (state?.searchString !== keyword) {
    state?.change({ searchString: keyword }, false)
  }
}

export type { IFindReplaceState, IFindController }
