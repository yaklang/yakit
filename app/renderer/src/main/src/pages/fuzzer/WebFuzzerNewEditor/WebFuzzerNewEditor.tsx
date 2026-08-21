import React, { useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { type IMonacoEditor, NewHTTPPacketEditor } from '@/utils/editors'
import { insertFileFuzzTag, insertTemporaryFileFuzzTag } from '../InsertFileFuzzTag'
import { monacoEditorWrite } from '../fuzzerTemplates'
import type { OtherMenuListProps } from '@/components/yakitUI/YakitEditor/YakitEditorType'
import { copyAsUrl, ByteCountTag, showDictsAndSelect } from '../HTTPFuzzerPage'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { setRemoteValue } from '@/utils/kv'
import { useMemoizedFn } from 'ahooks'
import { yakitNotify } from '@/utils/notification'
import { openExternalWebsite, openPacketNewWindow } from '@/utils/openWebsite'
import { FuzzerRemoteGV } from '@/enums/fuzzer'
import { useSelectionByteCount } from '@/components/yakitUI/YakitEditor/useSelectionByteCount'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  getLargeRequestReplacementKey,
  matchLargeRequestReplacementLine,
  withLargeRequestReplacementLineNumber,
  sanitizeChipInjectedText,
  type LargeRequestReplacementMarker,
} from '@/pages/mitm/MITMManual/largeMultipartReplacement'
import { LargeRequestFileReplaceModal } from '@/pages/mitm/MITMManual/LargeMultipartFileReplaceModal'
import styles from './WebFuzzerNewEditor.module.scss'
const { ipcRenderer } = window.require('electron')

const HTTPFuzzerHotPatch = React.lazy(() =>
  import('../HTTPFuzzerHotPatch').then(({ HTTPFuzzerHotPatch }) => ({
    default: HTTPFuzzerHotPatch,
  })),
)

export interface WebFuzzerNewEditorProps {
  ref?: any
  refreshTrigger: boolean
  /** casual 审阅分段写回时递增，与 refreshTrigger 组合以强制请求编辑器同步 `requestRef`（避免仅 ref 更新子组件未吃到新 props） */
  casualEditorApplyNonce?: number
  request: string
  hex: boolean
  isHttps: boolean
  hotPatchCode: string
  hotPatchCodeWithParamGetter: string
  setRequest: (s: string) => void
  setHotPatchCode: (s: string) => void
  setHotPatchCodeWithParamGetter: (s: string) => void
  firstNodeExtra?: () => JSX.Element
  pageId: string
  oneResponseValue?: {
    [key: string]: any
  }
  privacy?: boolean
  foldBinaryFuzztag?: boolean
  onFoldBinaryFuzztagChange?: (enabled: boolean) => void
}
export const WebFuzzerNewEditor: React.FC<WebFuzzerNewEditorProps> = React.memo(
  React.forwardRef((props, ref) => {
    const {
      refreshTrigger,
      casualEditorApplyNonce = 0,
      request,
      setRequest,
      isHttps,
      hotPatchCode,
      hotPatchCodeWithParamGetter,
      setHotPatchCode,
      setHotPatchCodeWithParamGetter,
      firstNodeExtra,
      pageId,
      oneResponseValue,
      hex,
      privacy,
      foldBinaryFuzztag = true,
      onFoldBinaryFuzztagChange,
    } = props
    const { t, i18nRefresh } = useI18nNamespaces(['webFuzzer', 'mitm'])
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    const selectionByteCount = useSelectionByteCount(reqEditor, 500)

    const [newRequest, setNewRequest] = useState<string>(request) // 由于传过来的request是ref 值变化并不会导致重渲染 这里拿到的request还是旧值

    // 超大请求占位标记的替换状态（key -> 替换结果）
    const [largeRequestReplacements, setLargeRequestReplacements] = useState<
      Record<string, { Filename: string; Size: number }>
    >({})

    const replaceMarkerWithFileTag = useMemoizedFn(
      (marker: LargeRequestReplacementMarker, filePath: string, filename: string) => {
        if (!reqEditor) return
        const model = reqEditor.getModel()
        if (!model) return
        const lineContent = model.getLineContent(marker.lineNumber)
        const fileTag = `{{file(${filePath})}}`
        // 在 multipart 场景下，占位标记行后面可能紧跟着 boundary；把整个标记行替换为 fuzztag 并保留换行。
        const replacementText = marker.kind === 'multipart' ? `${fileTag}\n` : fileTag
        const range = {
          startLineNumber: marker.lineNumber,
          startColumn: 1,
          endLineNumber: marker.lineNumber,
          endColumn: lineContent.length + 1,
        }
        reqEditor.executeEdits('large-request-replace', [
          {
            range,
            text: replacementText,
            forceMoveMarkers: false,
          },
        ])
        setLargeRequestReplacements((previous) => ({
          ...previous,
          [getLargeRequestReplacementKey(marker)]: { Filename: filename, Size: 0 },
        }))
        yakitNotify('success', t('WebFuzzerNewEditor.replacedWithFileFuzztag', { filename }))
      },
    )

    const openLargeRequestFileReplace = useMemoizedFn((marker: LargeRequestReplacementMarker) => {
      const modal = showYakitModal({
        title:
          marker.kind === 'body'
            ? t('MITMManual.replace_large_body_title', { size: marker.sizeVerbose })
            : t('MITMManual.replace_large_file_title', { filename: marker.filename }),
        width: 660,
        footer: null,
        content: (
          <LargeRequestFileReplaceModal
            marker={marker}
            mode="fuzzer"
            onCancel={() => modal.destroy()}
            onComplete={(result) => {
              replaceMarkerWithFileTag(marker, result.Filename, result.Filename)
              modal.destroy()
            }}
          />
        ),
        onCancel: () => modal.destroy(),
      })
    })

    useEffect(() => {
      if (!reqEditor) return
      const model = reqEditor.getModel()
      if (!model) return

      let decorationIDs: string[] = []
      let mouseDisposable: { dispose: () => void } | undefined
      let modelMarkers: LargeRequestReplacementMarker[] = []

      const applyDecorations = () => {
        mouseDisposable?.dispose()
        mouseDisposable = undefined
        modelMarkers = []
        for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
          const matched = matchLargeRequestReplacementLine(model.getLineContent(lineNumber))
          if (!matched) continue
          modelMarkers.push(withLargeRequestReplacementLineNumber(matched, lineNumber))
        }
        decorationIDs = reqEditor.deltaDecorations(
          decorationIDs,
          modelMarkers.map((marker) => {
            const replacement = largeRequestReplacements[getLargeRequestReplacementKey(marker)]
            const markerText = model.getLineContent(marker.lineNumber).slice(0, marker.lineLength)
            const hint = replacement
              ? t('WebFuzzerNewEditor.replacedChipHint', { filename: replacement.Filename })
              : t('WebFuzzerNewEditor.clickToReplaceChipHint')
            const chipClass = replacement
              ? `${styles['large-request-replace-chip']} ${styles['large-request-replace-chip-replaced']}`
              : styles['large-request-replace-chip']
            return {
              range: {
                startLineNumber: marker.lineNumber,
                startColumn: 1,
                endLineNumber: marker.lineNumber,
                endColumn: marker.lineLength + 1,
              },
              options: {
                inlineClassName: chipClass,
                inlineClassNameAffectsLetterSpacing: true,
                after: {
                  content: sanitizeChipInjectedText(` ${hint}`),
                  inlineClassName: chipClass,
                  inlineClassNameAffectsLetterSpacing: true,
                },
                hoverMessage: { value: t('WebFuzzerNewEditor.clickToReplaceFileFuzztag') },
                glyphMarginClassName: styles['large-request-replace-glyph'],
              },
            }
          }),
        )
        if (modelMarkers.length === 0) return
        mouseDisposable = reqEditor.onMouseDown((event) => {
          if (!event.event.leftButton) return
          const domTarget = (event.event.browserEvent?.target ?? null) as HTMLElement | null
          const chipEl =
            domTarget && typeof domTarget.closest === 'function'
              ? domTarget.closest(`.${styles['large-request-replace-chip']}`)
              : null
          if (!chipEl) return
          const position = event.target.position
          let marker: LargeRequestReplacementMarker | undefined
          if (position) {
            const sameLine = modelMarkers.filter((item) => item.lineNumber === position.lineNumber)
            if (sameLine.length >= 1) marker = sameLine[0]
          }
          if (!marker && modelMarkers.length === 1) marker = modelMarkers[0]
          if (marker) openLargeRequestFileReplace(marker)
        })
      }

      applyDecorations()
      const contentDisposable = reqEditor.onDidChangeModelContent(() => applyDecorations())
      return () => {
        contentDisposable.dispose()
        mouseDisposable?.dispose()
        reqEditor.deltaDecorations(decorationIDs, [])
      }
    }, [largeRequestReplacements, reqEditor, i18nRefresh, t])

    useImperativeHandle(
      ref,
      () => ({
        reqEditor,
      }),
      [reqEditor],
    )
    const hotPatchTrigger = useMemoizedFn(() => {
      const m = showYakitModal({
        title: null,
        width: '80%',
        footer: null,
        maskClosable: false,
        closable: false,
        hiddenHeader: true,
        keyboard: false,
        content: (
          <React.Suspense fallback={null}>
            <HTTPFuzzerHotPatch
              pageId={pageId}
              initialHotPatchCode={hotPatchCode}
              initialHotPatchCodeWithParamGetter={hotPatchCodeWithParamGetter}
              onInsert={(tag) => {
                if (reqEditor) monacoEditorWrite(reqEditor, tag)
                m.destroy()
              }}
              onSaveCode={(code) => {
                setHotPatchCode(code)
              }}
              onSaveHotPatchCodeWithParamGetterCode={(code) => {
                setHotPatchCodeWithParamGetter(code)
                setRemoteValue(FuzzerRemoteGV.WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE, code)
              }}
              onCancel={() => m.destroy()}
            />
          </React.Suspense>
        ),
      })
    })
    const editorRightMenu: OtherMenuListProps = useMemo(() => {
      return {
        insertLabelTag: {
          menu: [
            { type: 'divider' },
            {
              key: 'insert-label-tag',
              label: t('WebFuzzerNewEditor.insertTagOrDictionary'),
              children: [
                { key: 'insert-nullbyte', label: t('WebFuzzerNewEditor.insertEmptyByteTag') },
                { key: 'insert-temporary-file-tag', label: t('WebFuzzerNewEditor.insertTempDictionary') },
                { key: 'insert-intruder-tag', label: t('WebFuzzerNewEditor.insertFuzzDictionaryTag') },
                { key: 'insert-hotpatch-tag', label: t('WebFuzzerNewEditor.insertHotReloadTag') },
                { key: 'insert-fuzzfile-tag', label: t('WebFuzzerNewEditor.insertFileTag') },
              ],
            },
          ],
          onRun: (editor, key) => {
            switch (key) {
              case 'insert-nullbyte':
                editor.trigger('keyboard', 'type', { text: '{{hexd(00)}}' })
                return
              case 'insert-temporary-file-tag':
                insertTemporaryFileFuzzTag((i) => monacoEditorWrite(editor, i))
                return
              case 'insert-intruder-tag':
                showDictsAndSelect((i) => {
                  monacoEditorWrite(editor, i, editor.getSelection())
                })
                return
              case 'insert-hotpatch-tag':
                hotPatchTrigger()
                return
              case 'insert-fuzzfile-tag':
                insertFileFuzzTag((i) => monacoEditorWrite(editor, i))
                return

              default:
                break
            }
          },
        },
      }
    }, [i18nRefresh])

    const copyUrl = useMemoizedFn(() => {
      copyAsUrl({ Request: newRequest, IsHTTPS: isHttps }, 'withQuery')
    })
    const copyUrlWithoutQuery = useMemoizedFn(() => {
      copyAsUrl({ Request: newRequest, IsHTTPS: isHttps }, 'withoutQuery')
    })
    const onClickOpenBrowserMenu = useMemoizedFn(() => {
      ipcRenderer
        .invoke('ExtractUrl', { Request: newRequest, IsHTTPS: isHttps })
        .then((data: { Url: string }) => {
          openExternalWebsite(data.Url)
        })
        .catch((e) => {
          yakitNotify('error', t('WebFuzzerNewEditor.copyUrlFailed'))
        })
    })

    return (
      <NewHTTPPacketEditor
        defaultHttps={isHttps}
        isShowBeautifyRender={false}
        showDefaultExtra={false}
        refreshTrigger={`${refreshTrigger}_${casualEditorApplyNonce}`}
        noMinimap={true}
        utf8={true}
        originValue={request}
        contextMenu={editorRightMenu}
        onEditor={setReqEditor}
        onChange={(i) => {
          setNewRequest(i)
          setRequest(i)
        }}
        editorOperationRecord="HTTP_FUZZER_PAGE_EDITOR_RECORF"
        extraEditorProps={{
          isShowSelectRangeMenu: true,
          pageId,
          privacy,
          showHostHint: true,
          foldBinaryFuzztag,
          onFoldBinaryFuzztagChange,
          glyphMargin: true,
        }}
        title={
          <span style={{ fontSize: 12 }}>
            Request&nbsp;&nbsp;
            <ByteCountTag selectionByteCount={selectionByteCount} itemKey="httpfuzzerRes" />
          </span>
        }
        extraEnd={firstNodeExtra && firstNodeExtra()}
        onClickUrlMenu={copyUrl}
        onClickUrlWithoutQueryMenu={copyUrlWithoutQuery}
        onClickOpenBrowserMenu={onClickOpenBrowserMenu}
        onClickOpenPacketNewWindowMenu={useMemoizedFn(() => {
          openPacketNewWindow({
            request: {
              originValue: newRequest,
            },
            response: oneResponseValue ? { ...oneResponseValue } : undefined,
          })
        })}
        noShowHex={!hex}
      />
    )
  }),
)
