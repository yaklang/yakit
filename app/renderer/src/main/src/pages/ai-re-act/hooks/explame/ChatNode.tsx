// ChatNodes.tsx
import React, { useState, useContext, useMemo } from 'react'
import { SessionIdContext } from './SessionRuntime'
import { globalSessionEngine } from './ChatMultiSessionController'

// ==========================================
// 1. 叶子节点 (原子渲染层) - 性能爆发点
// ==========================================
export const ChatItem = ({ element }: { element: any }) => {
  const sessionId = useContext(SessionIdContext)
  const { rawData } = globalSessionEngine.ensureSession(sessionId)

  // 🎯 依赖 element.renderNum 强制去内存池捞取新鲜文本
  const content = useMemo(() => {
    if (element.type === 'stream' || element.type === 'thought') {
      const nodeData = rawData.contents.get(element.token || element.id)
      return nodeData ? nodeData.content : ''
    }
    return element.content || JSON.stringify(element.data || {})
  }, [element.token, element.id, element.type, element.content, element.data, element.renderNum, rawData])

  if (element.type === 'thought') {
    return <div style={{ color: 'gray', fontStyle: 'italic', margin: '4px 0' }}>🤔 {content}</div>
  }
  if (element.type === 'stream') {
    return <div style={{ color: '#333', margin: '4px 0' }}>💬 {content}</div>
  }
  if (element.type === 'yak_risk_count') {
    return (
      <div style={{ background: '#fff0f0', border: '1px solid red', padding: 4 }}>
        🚨 高危流量: {element.data?.riskFlowDataCount || 0}
      </div>
    )
  }
  if (element.type === 'yak_httpflow_count') {
    return (
      <div style={{ background: '#f0f5ff', border: '1px solid blue', padding: 4 }}>
        🌐 HTTP流: {element.data?.httpFlowDataCount || 0}
      </div>
    )
  }

  return <div style={{ padding: 4 }}>{content}</div>
}

// ==========================================
// 2. 任务节点 (Task 包裹层)
// ==========================================
export const ChatTask = ({ taskData }: { taskData: any }) => {
  return (
    <div style={{ borderLeft: '3px solid #1890ff', margin: '8px 0', paddingLeft: 12 }}>
      <div style={{ fontWeight: 'bold', fontSize: 12, color: '#666', marginBottom: 8 }}>
        ⚙️ {taskData.toolName || '工具调用'} (Task ID: {taskData.token || taskData.id})
      </div>

      <div className="task-children">
        {taskData.children?.map((child: any) => (
          <ChatItem key={child.token || child.id} element={child} />
        ))}
      </div>
    </div>
  )
}

// ==========================================
// 3. 编组节点 (Group 顶层折叠层)
// ==========================================
export const ChatGroup = ({ groupData }: { groupData: any }) => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 4, margin: '12px 0', padding: 12, background: '#fafafa' }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{ cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}
      >
        <span>📂 规划编组: {groupData.title || groupData.token || groupData.id}</span>
        <span>{collapsed ? '展开 ▼' : '折叠 ▲'}</span>
      </div>

      {!collapsed && (
        <div style={{ marginTop: 12, borderTop: '1px dashed #ccc', paddingTop: 12 }}>
          {groupData.children?.map((child: any) => {
            if (child.type === 'task') return <ChatTask key={child.token || child.id} taskData={child} />
            if (child.type === 'group') return <ChatGroup key={child.token || child.id} groupData={child} /> // 支持无限嵌套
            return <ChatItem key={child.token || child.id} element={child} />
          })}
        </div>
      )}
    </div>
  )
}
