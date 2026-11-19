import type { MentionPointerModifiers } from '../hooks/mentionMultiSelect'

export interface MentionResourceRowProps {
  id?: string
  kind: 'forge' | 'tool' | 'knowledgeBase' | 'file' | 'folder' | 'focusMode'
  name: string
  description?: string
  knowledgeIndex?: number
  current?: boolean
  active?: boolean
  checked?: boolean
  onSelect: (event?: MentionPointerModifiers) => void
}
