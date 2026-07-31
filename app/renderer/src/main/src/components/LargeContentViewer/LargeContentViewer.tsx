import React, { useMemo } from 'react'
import { Controlled as CodeMirror } from 'react-codemirror2'
import type { LargeContentViewerItem } from '@/utils/openWebsite'

// CodeMirror5 样式与搜索 addon（已随 codemirror 包安装，无需补依赖）
import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/dialog/dialog.css'
import 'codemirror/addon/dialog/dialog'
import 'codemirror/addon/search/searchcursor'
import 'codemirror/addon/search/search'
import 'codemirror/addon/search/jump-to-line'

export interface LargeContentViewerProps {
  data?: LargeContentViewerItem
}

/**
 * 大内容轻量查看器
 *
 * 用 CodeMirror5（plaintext + 虚拟滚动 + 自带搜索 addon）替代 Monaco 查看超大内容（如数 MB 的 .map 响应）。
 * 比 Monaco 轻：CM5 的 viewportMargin 限制只渲染可视区行，4.9MB 渲染开销可控。
 * 自带搜索：Ctrl-F 唤出搜索框（上一个/下一个/正则/大小写全自带），无需自写。
 */
export const LargeContentViewer: React.FC<LargeContentViewerProps> = (props) => {
  const content = props.data?.content || ''
  const title = props.data?.title || 'Large Content'

  const contentSize = useMemo(() => {
    const bytes = content.length
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${bytes} B`
  }, [content])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#fff' }}>
      {/* 顶部信息条 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 12px',
          background: '#fafafa',
          borderBottom: '1px solid #e8e8e8',
          flexShrink: 0,
          color: '#333',
          fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 500 }}>{title}</span>
        <span style={{ color: '#666', fontSize: 12 }}>{contentSize}</span>
        <span style={{ color: '#999', fontSize: 12, marginLeft: 'auto' }}>按 Ctrl+F 搜索</span>
      </div>
      {/* CodeMirror 主体 */}
      <div style={{ flex: 1, overflow: 'hidden', background: '#fff' }}>
        <CodeMirror
          value={content}
          options={{
            mode: 'text/plain',
            theme: 'default',
            readOnly: true,
            lineNumbers: true,
            lineWrapping: false,
            // 关键：限制视口渲染行数，启用 CM5 虚拟滚动，4.9MB 只渲染可视区，不卡
            viewportMargin: 20,
            // 隐藏光标闪烁，只读查看器无需光标
            cursorBlinkRate: -1,
            extraKeys: {
              // 启用 CM5 自带搜索（持久搜索框，含上一个/下一个/正则/大小写）
              'Ctrl-F': 'findPersistent',
              'Cmd-F': 'findPersistent',
            },
          }}
          onBeforeChange={() => {}}
        />
      </div>
    </div>
  )
}
