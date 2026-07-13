import { useRef } from 'react'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { v4 as uuidv4 } from 'uuid'
import { monaco } from 'react-monaco-editor'
import { ConvertYakStaticAnalyzeErrorToMarker, YakStaticAnalyzeErrorResult } from '@/utils/editorMarkers'
import { StringToUint8Array } from '@/utils/str'
import { YaklangMonacoSpec } from '@/utils/monacoSpec/yakEditor'
import { SyntaxFlowMonacoSpec } from '@/utils/monacoSpec/syntaxflowEditor'
import { YakitIMonacoEditor, YakitITextModel } from '../YakitEditorType'

const { ipcRenderer } = window.require('electron')

export interface UseYakFormatParams {
  language?: string
  type?: string
}

export interface UseYakFormatResult {
  yakCompileAndFormat: {
    run: (editor: YakitIMonacoEditor, model: YakitITextModel) => void
  }
  yakStaticAnalyze: {
    run: (editor: YakitIMonacoEditor, model: YakitITextModel) => void
  }
  AnalyzeSessionIDRef: React.MutableRefObject<string>
}

/**
 * Yak 代码格式化 + 静态分析
 */
export const useYakFormat = (params: UseYakFormatParams): UseYakFormatResult => {
  const { language, type } = params

  const AnalyzeSessionIDRef = useRef<string>(uuidv4())

  /** Yak 代码格式化功能实现 */
  const yakCompileAndFormat = useDebounceFn(
    useMemoizedFn((editor: YakitIMonacoEditor, model: YakitITextModel) => {
      const allContent = model.getValue()
      ipcRenderer
        .invoke('YaklangCompileAndFormat', { Code: allContent })
        .then((e: { Errors: YakStaticAnalyzeErrorResult[]; Code: string }) => {
          if (e.Code !== '') {
            model.setValue(e.Code)
          }

          /** 编辑器中错误提示的标记 */
          if (e && e.Errors.length > 0) {
            const markers = e.Errors.map(ConvertYakStaticAnalyzeErrorToMarker)
            monaco.editor.setModelMarkers(model, 'owner', markers)
          } else {
            monaco.editor.setModelMarkers(model, 'owner', [])
          }
        })
        .catch((e) => {
          console.info(e)
        })
    }),
    { wait: 500, leading: true, trailing: false },
  )

  /** Yak语言 代码错误检查并显示提示标记 */
  const yakStaticAnalyze = useDebounceFn(
    useMemoizedFn((editor: YakitIMonacoEditor, model: YakitITextModel) => {
      if (language === YaklangMonacoSpec || language === SyntaxFlowMonacoSpec) {
        const allContent = model.getValue()
        ipcRenderer
          .invoke('StaticAnalyzeError', {
            Code: StringToUint8Array(allContent),
            PluginType: type,
            SessionID: AnalyzeSessionIDRef.current,
          })
          .then((e: { Result: YakStaticAnalyzeErrorResult[] }) => {
            if (e && e.Result.length > 0) {
              const markers = e.Result.map(ConvertYakStaticAnalyzeErrorToMarker)
              monaco.editor.setModelMarkers(model, 'owner', markers)
            } else {
              monaco.editor.setModelMarkers(model, 'owner', [])
            }
          })
      } else {
        monaco.editor.setModelMarkers(model, 'owner', [])
      }
    }),
    { wait: 300 },
  )

  return {
    yakCompileAndFormat,
    yakStaticAnalyze,
    AnalyzeSessionIDRef,
  }
}
