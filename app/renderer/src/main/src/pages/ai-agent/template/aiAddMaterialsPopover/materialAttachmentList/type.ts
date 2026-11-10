import type { AIMentionCommandParams } from '../../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'

export interface MaterialAttachmentListProps {
  attachments: AIMentionCommandParams[]
  onAdd: () => void
  onRemove: (attachment: AIMentionCommandParams) => void
}
