import type { AIMentionCommandParams } from '../../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'

export interface MaterialAttachmentListProps {
  attachments: AIMentionCommandParams[]
  onAdd: (type: 'file' | 'folder') => void
  onRemove: (attachment: AIMentionCommandParams) => void
}
