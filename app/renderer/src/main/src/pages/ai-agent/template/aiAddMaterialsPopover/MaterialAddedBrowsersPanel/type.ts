import type { AIMentionCommandParams } from '../../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'

export interface MaterialAddedBrowsersPanelProps {
  browsers: AIMentionCommandParams[]
  onRemove: (material: AIMentionCommandParams) => void
}
