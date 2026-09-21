import type { AISession } from '../../type/aiChat'

export interface HistoryChatListItemProps {
  item: AISession
  handleSetActiveChat: (session: AISession) => void
  getPopupContainer?: () => HTMLElement
  handleOpenEditName: (session: AISession) => void
  handleDeleteChat: (session: AISession) => Promise<void>
  overlayClassName?: string
}
