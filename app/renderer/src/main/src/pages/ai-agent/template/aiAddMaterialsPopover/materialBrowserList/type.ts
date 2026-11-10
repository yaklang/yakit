import type { AIMentionCommandParams } from '../../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'

export interface MaterialBrowserListProps {
  browsers: AIMentionCommandParams[]
  onRemove: (material: AIMentionCommandParams) => void
}
