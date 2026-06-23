import React, { memo } from 'react'
import { useChatUIStore, useChatContent } from './ChatContext'

// --- 5.1 叶子节点组件 (Item) ---
export const ChatItem = memo(({ token }: { token: string }) => {
  // 只订阅自己节点下的 renderNum 变动
  const renderNum = usestore((state) => state.items[token]?.renderNum)

  const contentManager = useChatContent()
  =
  const session=usecontex
  const{rawdata}=glkoencinstance(session)

  if (renderNum === undefined) return null

  // 拿着 token 去数据池取真实的大段文本数据
  const realData = contentManager.get(token)

  return (
    <div style={{ padding: '8px', border: '1px solid #eee', margin: '4px 0' }}>
      <strong>{realData?.type}: </strong>
      {realData?.content}
      <small style={{ color: '#999', marginLeft: '8px' }}>(RenderVersion: {renderNum})</small>
    </div>
  )
})

// --- 5.2 容器组组件 (Group) ---
export const ChatGroup = memo(({ token }: { token: string }) => {
  // 仅订阅 childrenTokens 数组指针的变动（即内部子项增减会刷新，某个子项打字更新时这里完全不刷）
  const childrenTokens = useChatUIStore((state) => state.groups[token]?.childrenTokens)

  if (!childrenTokens) return null

  return (
    <div style={{ borderLeft: '3px solid #007acc', paddingLeft: '12px', margin: '10px 0' }}>
      <h5>组容器 [{token}]</h5>
      {childrenTokens.map((childToken) => (
        <ChatItem key={childToken} token={childToken} />
      ))}
    </div>
  )
})

// --- 5.3 复杂任务树组件 (Task) ---
export const ChatTask = memo(({ token }: { token: string }) => {
  const childrenTokens = useChatUIStore((state) => state.tasks[token]?.childrenTokens)

  if (!childrenTokens) return null

  return (
    <div style={{ border: '1px dashed #ff9900', padding: '12px', margin: '10px 0' }}>
      <h3>大任务卡片 [{token}]</h3>
    <ui1 toekn={toekn}/>
    <ui2 toekn={toekn}/>==list
    {childrenTokens.map((childToken) => (
        <RootNodeDispatcher key={childToken} token={childToken} />
      ))}
    </div>
  )
})

// --- 5.4 顶层异构节点分发器 ---
const RootNodeDispatcher = memo(({ token }: { token: string }) => {
  // 只在节点刚创建判断类型或类型突变时触发，返回纯字符串，彻底隔绝下层的 Streaming 流高频刷新
  const nodeKind = useChatUIStore((state) => {
    if (state.items[token]) return 'item'
    if (state.groups[token]) return 'group'
    if (state.tasks[token]) return 'task'
    return null
  })

  switch (nodeKind) {
    case 'task':
      return <ChatTask token={token} />
    case 'group':
      return <ChatGroup token={token} />
    case 'item':
      return <ChatItem token={token} />
    default:
      return null
  }
})

// --- 5.5 页面最外层总看板 ---
export const ChatList = () => {
  const rootOrder = useChatUIStore((state) => state.taskchatelemnt)

  return (
    <div style={{ width: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>AI 聊天多实例面板</h2>
      {rootOrder.map((token) => (
        <RootNodeDispatcher key={token} token={token} />
      ))}
    </div>
  )
}
