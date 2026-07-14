// // ChatReviewModal.tsx
// import React, { useContext } from 'react'
// import { useStore } from 'zustand'
// import { Modal, Button, Space } from 'antd'
// import { SessionIdContext } from './SessionRuntime'
// import { globalSessionEngine } from './ChatMultiSessionController'

// export const ChatReviewModal = () => {
//   const sessionId = useContext(SessionIdContext)
//   const { store } = globalSessionEngine.ensureSession(sessionId)

//   const reviewData = useStore(store, (state) => state.reviewModalData)

//   const handleClose = () => store.getState().setReviewModalData(null)

//   const handleConfirm = (decisionValue: string) => {
//     globalSessionEngine.sendMessage(sessionId, {
//       action: 'review_decision',
//       id: reviewData.id,
//       decision: decisionValue,
//     })
//     handleClose()
//   }

//   if (!reviewData) return null

//   return (
//     <Modal title="🚨 等待操作授权" open={true} onCancel={handleClose} footer={null} maskClosable={false}>
//       <p style={{ color: '#666' }}>节点事件 ID: {reviewData.id}</p>
//       <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
//         {reviewData.selectors?.map((sel: any) => (
//           <Button
//             key={sel.value}
//             block
//             type={sel.type === 'danger' ? 'primary' : 'default'}
//             danger={sel.type === 'danger'}
//             onClick={() => handleConfirm(sel.value)}
//           >
//             {sel.label}
//           </Button>
//         ))}
//         <Button block onClick={handleClose}>
//           忽略并继续
//         </Button>
//       </Space>
//     </Modal>
//   )
// }
