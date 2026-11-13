export interface MentionResourceRowProps {
  id?: string
  kind: 'forge' | 'tool' | 'knowledgeBase' | 'file' | 'folder' | 'focusMode'
  name: string
  description?: string
  knowledgeIndex?: number
  current?: boolean
  active?: boolean
  onSelect: () => void
}
