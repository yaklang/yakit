import { createContext } from 'react'

export type ChatContentWidthMode = 'narrow' | 'standard' | 'wide'

export const ChatContentWidthContext = createContext<ChatContentWidthMode>('standard')
