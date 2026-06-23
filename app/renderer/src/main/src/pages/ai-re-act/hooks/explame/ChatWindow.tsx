// ChatWindow.tsx
import React, { useContext, useState } from 'react'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { SessionIdContext } from './SessionRuntime'
import { globalSessionEngine } from './ChatMultiSessionController'
import { useChatIPC } from './useChatIPC'
import { ChatGroup, ChatTask, ChatItem } from './ChatNodes'
import { ChatReviewModal } from './ChatReviewModal'

export const ChatWindow = () => {
  const sessionId = useContext(SessionIdContext)
  const { onStart, onSend } = useChatIPC()

  // 订阅当前专属 Store
  const { store } = globalSessionEngine.ensureSession(sessionId)

  // 🎯 按需精准订阅
  const casualElements = useStore(
    store,
    useShallow((state) => state.casualElements),
  )
  const taskElements = useStore(
    store,
    useShallow((state) => state.taskElements),
  )
  const casualTitle = useStore(store, (state) => state.casualTitle)
  const taskStatus = useStore(store, (state) => state.taskStatus)

  const [inputValue, setInputValue] = useState('')

  const handleSendMessage = () => {
    if (!inputValue.trim()) return
    onSend({ text: inputValue })
    setInputValue('')
  }

  // 辅助渲染函数：递归解析根节点并路由给对应的组件
  const renderNode = (node: any) => {
    const key = node.token || node.id
    if (node.type === 'group') return <ChatGroup key={key} groupData={node} />
    if (node.type === 'task') return <ChatTask key={key} taskData={node} />
    return <ChatItem key={key} element={node} />
  }

  return (
    <div
      className="chat-window"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
    >
      {/* 人工审批拦截弹窗 */}
      <ChatReviewModal />

      {/* 头部状态栏 */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #eee', background: '#fff' }}>
        <h3 style={{ margin: 0 }}>{casualTitle || '安全分析终端'}</h3>
        {taskStatus.loading && (
          <div style={{ color: '#1890ff', fontSize: 12, marginTop: 4 }}>
            ⏳ 正在执行: {taskStatus.task} {taskStatus.plan ? `-> ${taskStatus.plan}` : ''}
          </div>
        )}
      </div>

      {/* 核心双轨渲染区 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#fff' }}>
        {/* 第一轨：自由对话流 */}
        <div className="track-casual">{casualElements.map(renderNode)}</div>

        {/* 第二轨：任务规划流 (带有视觉隔离) */}
        {taskElements.length > 0 && (
          <div className="track-task" style={{ marginTop: 40, borderTop: '2px dashed #e8e8e8', paddingTop: 24 }}>
            <h4 style={{ color: '#888', marginBottom: 16 }}>📡 任务执行审计日志</h4>
            {taskElements.map(renderNode)}
          </div>
        )}
      </div>

      {/* 底部输入区 */}
      <div style={{ padding: 16, borderTop: '1px solid #eee', display: 'flex', gap: 12, background: '#fafafa' }}>
        <button onClick={() => onStart({ mode: 'analysis' })}>⚡ 初始化</button>
        <input
          style={{ flex: 1, padding: '0 12px', borderRadius: 4, border: '1px solid #d9d9d9' }}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="输入分析指令..."
        />
        <button
          onClick={handleSendMessage}
          style={{ background: '#1890ff', color: '#fff', border: 'none', borderRadius: 4, padding: '0 16px' }}
        >
          发送
        </button>
      </div>
    </div>
  )
}
