// import React, { memo } from 'react';
// import { useChatUIStore, useChatContent } from './ChatContext';

// // ======================== 原子业务外观组件 (纯粹无状态) ========================
// const UserMessage = ({ content }: { content: string }) => (
//   <div style={{ background: '#e3f2fd', padding: '8px', borderRadius: '4px', margin: '2px 0' }}>👤 用户: {content}</div>
// );

// const AssistantMessage = ({ content, version }: { content: string; version: number }) => (
//   <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', margin: '2px 0' }}>
//     🤖 AI: {content} <small style={{ color: '#aaa' }}>(v{version})</small>
//   </div>
// );

// const ToolCallBox = ({ content }: { content: string }) => (
//   <div style={{ border: '1px solid #9c27b0', color: '#9c27b0', padding: '6px', fontSize: '13px', borderRadius: '4px' }}>🛠️ 工具调用: {content}</div>
// );

// const ThoughtBox = ({ content }: { content: string }) => (
//   <div style={{ color: '#666', fontStyle: 'italic', background: '#fffde7', padding: '6px', borderRadius: '4px' }}>💡 思考链: {content}</div>
// );

// // ======================== 核心分发渲染树 ========================

// // --- 5.1 最小项分发器 (Item) ---
// export const ChatItem = memo(({ token }: { token: string }) => {
//   const node = useChatUIStore(state => {
//     const item = state.items[token];
//     return item ? { renderNum: item.renderNum, type: item.type } : null;
//   });

//   const contentManager = useChatContent();
//   if (!node) return null;

//   const textContent = contentManager.get(token)?.content || '';

//   // 第二层分发：根据业务 type 渲染具体样式
//   switch (node.type) {
//     case 'user':       return <UserMessage content={textContent} />;
//     case 'assistant':  return <AssistantMessage content={textContent} version={node.renderNum} />;
//     case 'tool-call':  return <ToolCallBox content={textContent} />;
//     case 'thought':    return <ThoughtBox content={textContent} />;
//     default:           return <div>{textContent}</div>;
//   }
// });

// // --- 5.2 容器组组件 (Group) ---
// export const ChatGroup = memo(({ token }: { token: string }) => {
//   const childrenTokens = useChatUIStore(state => state.groups[token]?.childrenTokens);
//   if (!childrenTokens) return null;

//   return (
//     <div style={{ borderLeft: '3px solid #007acc', paddingLeft: '12px', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
//       <div style={{ fontSize: '11px', color: '#007acc', marginBottom: '2px' }}>[思考与工具调用折叠组]</div>
//       {childrenTokens.map(childToken => (
//         <ChatItem key={childToken} token={childToken} />
//       ))}
//     </div>
//   );
// });

// // --- 5.3 树形大任务组件 (Task) ---
// export const ChatTask = memo(({ token }: { token: string }) => {
//   const childrenTokens = useChatUIStore(state => state.tasks[token]?.childrenTokens);
//   if (!childrenTokens) return null;

//   return (
//     <div style={{ border: '2px solid #ff9900', padding: '14px', margin: '12px 0', borderRadius: '6px', background: '#fffaf0' }}>
//       <h4 style={{ margin: '0 0 10px 0', color: '#ff9900' }}>📋 编排大任务卡片 [{token}]</h4>
//       <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
//         {/* 核心升级：任务内部使用通用节点分发器，解耦层级 */}
//         {childrenTokens.map(childToken => (
//           <NodeDispatcher key={childToken} token={childToken} />
//         ))}
//       </div>
//     </div>
//   );
// });

// // --- 5.4 通用节点大骨架分发器 (核心解耦路由) ---
// export const NodeDispatcher = memo(({ token }: { token: string }) => {
//   const nodeKind = useChatUIStore((state) => {
//     if (state.items[token]) return 'item';
//     if (state.groups[token]) return 'group';
//     if (state.tasks[token]) return 'task';
//     return null;
//   });

//   // 第一层分发：根据底层大框架 kind 分发基本容器
//   switch (nodeKind) {
//     case 'task':  return <ChatTask token={token} />;
//     case 'group': return <ChatGroup token={token} />;
//     case 'item':  return <ChatItem token={token} />;
//     default:      return null;
//   }
// });

// // --- 5.5 最外层总看板 ---
// export const ChatList = () => {
//   const rootOrder = useChatUIStore(state => state.rootOrder);

//   return (
//     <div style={{ maxWidth: '600px', margin: '20px auto', fontFamily: 'sans-serif' }}>
//       <h3>💬 泛型流式编排面板</h3>
//       {rootOrder.map(token => (
//         <NodeDispatcher key={token} token={token} />
//       ))}
//     </div>
//   );
// };
