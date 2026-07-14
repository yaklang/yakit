// ChatTabsLayout.tsx
// import React, { useState, useEffect, useCallback } from 'react'
// import { Tabs } from 'antd'
// import { globalSessionEngine } from './ChatMultiSessionController'
// import { SessionIdContext } from './SessionRuntime'
// import { ChatWindow } from './ChatWindow'
// import { GlobalNotification } from './GlobalNotification'

// export const ChatTabsLayout = () => {
//   const [activeTabId, setActiveTabId] = useState<string>('session-1')

//   // 模拟你的多会话列表
//   const [sessions, setSessions] = useState([
//     { id: 'session-1', title: '分析会话 A' },
//     { id: 'session-2', title: '分析会话 B' },
//   ])

//   // 💥 焦点同步：只要 Tab 切换，立刻告诉大管家，用于拦截后台弹窗
//   useEffect(() => {
//     globalSessionEngine.setActiveSession(activeTabId)

//     // 切回 Tab 时，顺手清空该会话的未读小红点状态
//     const { store } = globalSessionEngine.ensureSession(activeTabId)
//     store.getState().setHasUnreadAttention(false)
//   }, [activeTabId])

//   const onChange = useCallback((newActiveKey: string) => {
//     setActiveTabId(newActiveKey)
//   }, [])

//   return (
//     <div className="chat-layout-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
//       <Tabs
//         activeKey={activeTabId}
//         onChange={onChange}
//         items={sessions.map((session) => ({
//           key: session.id,
//           label: session.title,
//           children: (
//             // 注入上下文，包裹具体的聊天界面
//             <SessionIdContext.Provider value={session.id}>
//               <GlobalNotification />
//               <ChatWindow />
//             </SessionIdContext.Provider>
//           ),
//         }))}
//       />
//     </div>
//   )
// }
