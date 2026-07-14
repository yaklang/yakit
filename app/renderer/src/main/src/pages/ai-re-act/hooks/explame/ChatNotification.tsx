// // GlobalNotification.tsx
// import React, { useContext, useEffect } from 'react'
// import { useStore } from 'zustand'
// import { message } from 'antd'
// import { SessionIdContext } from './SessionRuntime'
// import { globalSessionEngine } from './ChatMultiSessionController'

// export const GlobalNotification = () => {
//   const sessionId = useContext(SessionIdContext)
//   const { store } = globalSessionEngine.ensureSession(sessionId)

//   const notification = useStore(store, (state) => state.globalNotification)

//   useEffect(() => {
//     if (notification) {
//       if (notification.type === 'warning') message.warning(notification.message)
//       if (notification.type === 'error') message.error(notification.message)
//       if (notification.type === 'info') message.info(notification.message)

//       // 显示完毕后立即清除状态，防止重复触发
//       store.getState().setGlobalNotification(null)
//     }
//   }, [notification, store])

//   return null
// }
