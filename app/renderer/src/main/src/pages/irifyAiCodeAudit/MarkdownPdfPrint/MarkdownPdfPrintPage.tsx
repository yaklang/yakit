import React, { useEffect, useRef, useState } from 'react'
import { StreamMarkdown } from '@/pages/assetViewer/reportRenders/markdownRender'
import { useTheme } from '@/hook/useTheme'
import styles from './MarkdownPdfPrintPage.module.scss'

const { ipcRenderer } = window.require('electron')

const getPrintId = () => new URLSearchParams(window.location.search).get('printId') || ''

const ROOT_CLASS = 'markdown-pdf-print-page-root'

/** 隐藏打印窗口：用 StreamMarkdown 渲染，与 Yakit 预览一致*/
const MarkdownPdfPrintPage: React.FC = () => {
  const { theme } = useTheme()
  const [content, setContent] = useState<string | null>(null)
  const signaledRef = useRef(false)

  useEffect(() => {
    document.documentElement.classList.add(ROOT_CLASS)
    document.body.classList.add(ROOT_CLASS)
    document.getElementById('root')?.classList.add(ROOT_CLASS)
    return () => {
      document.documentElement.classList.remove(ROOT_CLASS)
      document.body.classList.remove(ROOT_CLASS)
      document.getElementById('root')?.classList.remove(ROOT_CLASS)
    }
  }, [])

  useEffect(() => {
    const printId = getPrintId()
    if (!printId) return
    ipcRenderer
      .invoke('GetMarkdownPdfPrintPayload', printId)
      .then((payload: { code?: string; theme?: string } | null) => {
        if (payload?.theme) {
          document.documentElement.setAttribute('data-theme', payload.theme)
        }
        setContent(payload?.code ?? '')
      })
  }, [])

  useEffect(() => {
    if (content === null) return
    const printId = getPrintId()
    if (!printId) return

    const signalReady = () => {
      if (signaledRef.current) return
      signaledRef.current = true
      ipcRenderer.invoke('MarkdownPdfPrintReady', printId).catch(() => {})
    }

    let cancelled = false
    const run = async () => {
      try {
        if (document.fonts?.ready) {
          await document.fonts.ready.catch(() => {})
        }
        await new Promise((r) => setTimeout(r, 300))
        const imgs = Array.from(document.images || [])
        await Promise.all(
          imgs.map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete) resolve()
                else {
                  img.addEventListener('load', () => resolve(), { once: true })
                  img.addEventListener('error', () => resolve(), { once: true })
                }
              }),
          ),
        )
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        await new Promise((r) => setTimeout(r, 800))
      } finally {
        if (!cancelled) signalReady()
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [content, theme])

  return (
    <div className={styles['markdown-pdf-print']}>
      <StreamMarkdown
        content={content ?? ''}
        controls={{
          mermaid: {
            fullscreen: false,
            download: false,
            copy: false,
            panZoom: false,
          },
          table: false,
          code: false,
        }}
      />
    </div>
  )
}

export default MarkdownPdfPrintPage
