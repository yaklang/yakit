import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { yakitClipboard, yakitTraffic } from '@/services/electronBridge'
import type { PCAPByteSource } from './pcapTypes'
import { decodeBytes, type FieldSelection } from './pcapUtils'
import styles from './PCAPPacketViewer.module.scss'

const readWindowSize = 64 << 10
const emptyRanges: FieldSelection['ranges'] = []

export const PacketByteViewer = ({
  datasetID,
  source,
  selection,
}: {
  datasetID: string
  source: PCAPByteSource
  selection?: FieldSelection
}) => {
  const list = useRef<VirtuosoHandle>(null)
  const request = useRef(0)
  const totalLength = Number(source.Length)
  const initialOffset = Number(source.InitialOffset || 0)
  const [loaded, setLoaded] = useState(() => ({
    offset: initialOffset,
    bytes: decodeBytes(source.InitialData),
  }))
  const [mode, setMode] = useState<'hex' | 'text'>('hex')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [readError, setReadError] = useState('')
  const ranges = selection?.sourceID === source.ID ? selection.ranges : emptyRanges
  const text = useMemo(() => (mode === 'text' ? new TextDecoder().decode(loaded.bytes) : ''), [loaded.bytes, mode])
  const loadedEnd = loaded.offset + loaded.bytes.length

  const readWindow = useCallback(
    async (offset: number, length: number, append = false) => {
      const current = ++request.current
      const boundedLength = Math.min(readWindowSize, Math.max(0, totalLength - offset), length)
      if (boundedLength <= 0) return
      setLoading(true)
      setReadError('')
      try {
        const response = await yakitTraffic.readBytes({
          DatasetID: datasetID,
          SourceID: source.ID,
          Offset: String(offset),
          Length: String(boundedLength),
        })
        if (current !== request.current) return
        const bytes = decodeBytes(response.Data)
        setLoaded((currentWindow) => {
          if (!append || currentWindow.offset + currentWindow.bytes.length !== Number(response.Offset))
            return { offset: Number(response.Offset), bytes }
          const merged = new Uint8Array(currentWindow.bytes.length + bytes.length)
          merged.set(currentWindow.bytes)
          merged.set(bytes, currentWindow.bytes.length)
          return { offset: currentWindow.offset, bytes: merged }
        })
      } catch (e) {
        if (current === request.current) setReadError(e instanceof Error ? e.message : String(e))
      } finally {
        if (current === request.current) setLoading(false)
      }
    },
    [datasetID, source.ID, totalLength],
  )

  useEffect(() => {
    const firstRange = ranges[0]
    if (!firstRange) return
    const inside = firstRange[0] >= loaded.offset && firstRange[1] <= loadedEnd
    if (!inside) {
      const offset = Math.max(0, firstRange[0] - 4096)
      void Promise.resolve().then(() => readWindow(offset, readWindowSize))
    }
    const start = Math.max(firstRange[0], loaded.offset)
    const end = Math.min(firstRange[1], loadedEnd)
    if (start < end) {
      list.current?.scrollToIndex({ index: Math.floor((start - loaded.offset) / 16), align: 'center' })
    }
  }, [loaded.offset, loadedEnd, ranges, readWindow])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    setCopyError('')
    try {
      const selected = ranges.length
        ? ranges.flatMap(([start, end]) => {
            const from = Math.max(start, loaded.offset)
            const to = Math.min(end, loadedEnd)
            return from < to ? Array.from(loaded.bytes.subarray(from - loaded.offset, to - loaded.offset)) : []
          })
        : Array.from(loaded.bytes)
      await yakitClipboard.setText(selected.map((byte) => byte.toString(16).padStart(2, '0')).join(' '))
      setCopied(true)
    } catch {
      setCopyError('复制失败，请重试')
    }
  }

  const loadMore = () => {
    if (loadedEnd < totalLength) void readWindow(loadedEnd, readWindowSize, true)
  }

  return (
    <section className={styles.bytes} aria-label="数据字节">
      {mode === 'text' ? (
        <pre className={styles['text-bytes']}>{text}</pre>
      ) : (
        <div className={styles['hex-body']}>
          <div className={styles['hex-heading']}>
            <span>OFFSET</span>
            <span>00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F</span>
            <span>ASCII</span>
          </div>
          <Virtuoso
            ref={list}
            style={{ flex: 1 }}
            totalCount={Math.ceil(loaded.bytes.length / 16)}
            fixedItemHeight={25}
            itemContent={(index) => {
              const relativeOffset = index * 16
              const offset = loaded.offset + relativeOffset
              const row = Array.from(loaded.bytes.subarray(relativeOffset, relativeOffset + 16))
              const highlighted = (absolute: number) =>
                ranges.some(([start, end]) => absolute >= start && absolute < end)
              return (
                <div className={styles['hex-row']}>
                  <span className={styles.offset}>{offset.toString(16).padStart(6, '0')}</span>
                  <span className={styles['hex-values']}>
                    {row.map((byte, i) => (
                      <span key={i} className={highlighted(offset + i) ? styles.highlight : ''}>
                        {byte.toString(16).padStart(2, '0')}
                      </span>
                    ))}
                  </span>
                  <span className={styles.ascii}>
                    {row.map((byte, i) => (
                      <span key={i} className={highlighted(offset + i) ? styles.highlight : ''}>
                        {byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '·'}
                      </span>
                    ))}
                  </span>
                </div>
              )
            }}
          />
        </div>
      )}
      <div className={`${styles['byte-status']} ${styles['byte-footer']}`}>
        <span>
          {readError ||
            copyError ||
            (ranges.length
              ? `已选中 ${ranges.map(([start, end]) => `${start}–${end - 1}`).join(', ')}`
              : `已加载 ${loaded.offset}–${Math.max(loaded.offset, loadedEnd - 1)} / ${totalLength} bytes`)}
        </span>
        <div className={styles['byte-actions']}>
          <YakitButton type={mode === 'hex' ? 'outline1' : 'text2'} size="small" onClick={() => setMode('hex')}>
            HEX
          </YakitButton>
          <YakitButton type={mode === 'text' ? 'outline1' : 'text2'} size="small" onClick={() => setMode('text')}>
            UTF-8
          </YakitButton>
          {loadedEnd < totalLength && (
            <YakitButton type="text2" size="small" loading={loading} onClick={loadMore}>
              加载后续
            </YakitButton>
          )}
          <YakitButton type="text2" size="small" onClick={copy}>
            {copied ? '已复制' : ranges.length ? '复制选中 HEX' : '复制已加载 HEX'}
          </YakitButton>
        </div>
      </div>
    </section>
  )
}
