// SessionRuntime.tsx
import React, { createContext } from 'react'

// 初始值给空字符串，实际由外层 Tabs 组件注入
export const SessionIdContext = createContext<string>('')
