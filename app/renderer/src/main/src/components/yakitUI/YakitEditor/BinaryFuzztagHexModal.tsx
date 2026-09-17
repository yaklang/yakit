import { FigmaIcon2017756Outlined, DocumentDuplicateOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import type React from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import {
  type BinaryFuzztagEntry,
  bytesToHex,
  bytesToText,
  charsToBytes,
  encodeBytesToTag,
  isUtf8Bytes,
  textToByteMap,
  textToBytes,
} from './binaryFuzztag'
import { BinaryFuzztagHexEditor } from './BinaryFuzztagHexEditor'
import styles from './BinaryFuzztagModal.module.scss'
import { YakitDropdownMenu } from '../YakitDropdownMenu/YakitDropdownMenu'

import { setClipboardText } from '@/utils/clipboard'
import { yakitNotify } from '@/utils/notification'
import { Uint8ArrayToString } from '@/utils/str'
import { saveABSFileToOpen } from '@/utils/openWebsite'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { TextAreaRef } from 'antd/lib/input/TextArea'

const { ipcRenderer } = window.require('electron')

// 提交结果：只记录是否被修改（不再携带增删改细节）
export interface BinaryFuzztagSubmitResult {
  changed: boolean
}

export interface BinaryFuzztagHexModalProps {
  entry: BinaryFuzztagEntry
  initialData: Uint8Array
  readOnly?: boolean
  onSubmit: (bytes: Uint8Array, result: BinaryFuzztagSubmitResult) => void
  onCancel: () => void
}

// 二进制 Fuzztag HEX 编辑弹窗：用于 Binary(unquote) 标签的字节级编辑
// 关键词: binary fuzztag, hex editor, unquote 编辑
// 编辑主体复用 BinaryFuzztagHexEditor（与 base64/hex 的 HEX 模式共用）
export const BinaryFuzztagHexModal: React.FC<BinaryFuzztagHexModalProps> = (props) => {
  const { entry, initialData, readOnly = false, onSubmit, onCancel } = props
  const { t } = useI18nNamespaces(['yakitUi'])

  // 共享字节缓冲（交给可复用编辑器原地修改）
  const dataRef = useRef<Uint8Array>(initialData)
  // 是否发生过修改：编辑器任一编辑动作即置为 true
  const changedRef = useRef<boolean>(false)
  // 数据变更后用它刷新头部预览
  const [hostVersion, setHostVersion] = useState<number>(0)

  const [showText, setShowText] = useState<boolean>(false)
  const textOk = useMemo(() => isUtf8Bytes(dataRef.current), [hostVersion])
  const curText = useMemo(() => bytesToText(dataRef.current), [hostVersion])
  const [mountKey, setMountKey] = useState<number>(0)
  // 切换到 HEX 时带入的字节选区（文字选区换算而来；仅文字→HEX 单方向）
  const [hexInitialSel, setHexInitialSel] = useState<[number, number] | undefined>(undefined)
  // antd TextArea ref：经 resizableTextArea.textArea 取原生 textarea
  const textRef = useRef<TextAreaRef>(null)

  const handleTextChange = useCallback((value: string) => {
    dataRef.current = textToBytes(value)
    changedRef.current = true
    setHostVersion((v) => v + 1)
  }, [])

  // 切 tab：文字→HEX 时读 textarea 当前选区换算成字节区间带入；HEX→文字不做选区恢复
  const switchView = (next: boolean) => {
    if (next === showText) return
    if (next && !textOk) return
    if (!next) {
      // 文字 -> HEX：读 textarea 当前光标/选区换算成字节区间带入（光标=单字节定位，选中=区间）
      const el = textRef.current?.resizableTextArea?.textArea ?? null
      if (el) {
        const map = textToByteMap(curText)
        const cs = el.selectionStart
        const ce = el.selectionEnd
        if (cs === ce && cs < map.length) {
          // 光标定位：指向光标所在字符的起始字节（单字节选区，HEX 高亮该字节）
          setHexInitialSel([map[cs], map[cs]])
        } else {
          setHexInitialSel(charsToBytes(map, cs, ce) ?? undefined)
        }
      } else {
        setHexInitialSel(undefined)
      }
    }
    setMountKey((k) => k + 1)
    setShowText(next)
  }

  const previewHex = useMemo(() => bytesToHex(dataRef.current.slice(0, 8)), [hostVersion])
  const byteLen = useMemo(() => dataRef.current.length, [hostVersion])
  const handleCopyMenuClick = useCallback(async ({ key }: { key: string }) => {
    try {
      switch (key) {
        case 'copy-raw': {
          setClipboardText(Uint8ArrayToString(dataRef.current, 'latin1'))
          return
        }
        case 'copy-base64': {
          const res = await ipcRenderer.invoke('BytesToBase64', { Bytes: dataRef.current })
          const base64 = res?.Base64 || ''
          if (!base64) {
            yakitNotify('error', 'Base64 编码失败')
            return
          }
          setClipboardText(base64)
          return
        }
        case 'copy-hex': {
          const hex = bytesToHex(dataRef.current)
          if (!hex) {
            yakitNotify('error', 'HEX 编码失败')
            return
          }
          setClipboardText(hex)
          return
        }
        default:
          return
      }
    } catch (error) {
      yakitNotify('error', `${error}`)
    }
  }, [])
  const copyMenu = useMemo(
    () => ({
      data: [
        { key: 'copy-raw', label: '复制原始数据' },
        { key: 'copy-base64', label: '复制 Base64 编码后的内容' },
        { key: 'copy-hex', label: '复制HEX编码后内容' },
      ],
      onClick: handleCopyMenuClick,
    }),
    [handleCopyMenuClick],
  )
  const handleExportMenuClick = useCallback(
    async ({ key }: { key: string }) => {
      try {
        const timestamp = Date.now()
        switch (key) {
          case 'export-raw': {
            saveABSFileToOpen(`binary-${entry.tagName}-${timestamp}.bin`, dataRef.current)
            return
          }
          case 'export-fuzztag': {
            const tagText = await encodeBytesToTag(entry.kind, entry.tagName, dataRef.current)
            saveABSFileToOpen(`fuzztag-${entry.tagName}-${timestamp}.txt`, tagText)
            return
          }
          default:
            return
        }
      } catch (error) {
        yakitNotify('error', `${error}`)
      }
    },
    [entry.kind, entry.tagName],
  )
  const exportMenu = useMemo(
    () => ({
      data: [
        { key: 'export-raw', label: '导出原始数据' },
        { key: 'export-fuzztag', label: '导出带FuzzTag的数据' },
      ],
      onClick: handleExportMenuClick,
    }),
    [handleExportMenuClick],
  )

  return (
    <div className={styles['modal-root']}>
      <div className={styles['modal-header']}>
        <YakitSegmented
          value={showText ? 'text' : 'hex'}
          onChange={(v) => switchView(v === 'text')}
          options={[
            { label: t('YakitEditor.textView'), value: 'text', disabled: !textOk },
            { label: 'HEX', value: 'hex' },
          ]}
        />
        <div className={styles['header-actions']}>
          <YakitDropdownMenu menu={copyMenu}>
            <YakitButton type="outline2" icon={<DocumentDuplicateOutlined size={16} />}>
              复制
            </YakitButton>
          </YakitDropdownMenu>
          <YakitDropdownMenu menu={exportMenu}>
            <YakitButton type="outline2" icon={<FigmaIcon2017756Outlined />}>
              导出
            </YakitButton>
          </YakitDropdownMenu>
        </div>
      </div>
      <div className={styles['modal-body']}>
        {showText ? (
          <div className={styles['text-pane']}>
            <YakitInput.TextArea
              key={mountKey}
              ref={textRef}
              wrapperStyle={{ height: '100%' }}
              style={{ height: '100%', resize: 'none' }}
              className={styles['text-area']}
              value={curText}
              readOnly={readOnly}
              isShowResize={false}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          </div>
        ) : (
          <BinaryFuzztagHexEditor
            key={mountKey}
            dataRef={dataRef}
            readOnly={readOnly}
            initialSelection={hexInitialSel}
            onChange={() => {
              changedRef.current = true
              setHostVersion((v) => v + 1)
            }}
          />
        )}
      </div>
      <div className={styles['modal-footer']}>
        <div className={styles['modal-footer-tag']}>
          <span>{`Tag: {{${entry.tagName}(...)}}`}</span>
          <span>{`Bytes: ${byteLen}`}</span>
          <span>{`Head: 0x${previewHex}`}</span>
          {readOnly && <span className={styles['read-only']}>read-only</span>}
        </div>
        <YakitButton type="outline2" onClick={onCancel}>
          取消
        </YakitButton>
        {!readOnly && (
          <YakitButton
            type="primary"
            onClick={() => {
              onSubmit(dataRef.current, { changed: changedRef.current })
            }}
          >
            提交
          </YakitButton>
        )}
      </div>
    </div>
  )
}
