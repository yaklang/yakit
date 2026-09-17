import Icon from '@ant-design/icons'
import type { IconBaseProps } from '@ant-design/icons/lib/components/Icon'
import {
  AnnotationOutlined,
  AtomOutlined,
  BookOpenTextOutlined,
  ClipboardCheckOutlined,
  FigmaIcon34227111184Outlined,
  FigmaIcon34227111185Outlined,
  FolderArchiveOutlined,
  GitMergeOutlined,
  LightBulbOutlined,
  LoaderPinwheelOutlined,
  MCPOutlined,
  ScrollTextOutlined,
  SearchOutlined,
  Sparkles2Outlined,
  StethoscopeOutlined,
  type IconComponent,
} from '@yakit-libs/yakit-ui-icons/outline'

// Figma: QWct5XE0Bg0bNDQ93eYgEw / 47199:15022 (Outline/Intention)
const OutlineIntention = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M9 9L12 11M12 11L15 9M12 11V15M9 23H15M5.63604 16.364C2.12132 12.8493 2.12132 7.15077 5.63604 3.63604C9.15076 0.121318 14.8492 0.121318 18.364 3.63604C21.8787 7.15077 21.8787 12.8493 18.364 16.364L17.3792 17.3488C17.1465 17.5814 16.4999 18.5465 16.2057 19H7.79435C7.66983 18.424 6.96011 17.6592 6.62082 17.3488L5.63604 16.364Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const IntentionOutlined = (props: IconBaseProps) => {
  return <Icon component={OutlineIntention} {...props} />
}

type AIStreamIcon = IconComponent | typeof IntentionOutlined

// 按输出过程类型匹配设计图中的图标，未配置的节点使用默认星光图标。
const streamIcons = new Map<string, AIStreamIcon>([
  ['loading_skills_names', LoaderPinwheelOutlined],
  ['load_skill_resources_path', LoaderPinwheelOutlined],
  ['load_capability', LoaderPinwheelOutlined],
  ['dispatch_sub_react_agents', GitMergeOutlined],
  ['load_tool', LoaderPinwheelOutlined],
  ['loading_skills_name', LoaderPinwheelOutlined],
  ['perception', LightBulbOutlined],
  ['intent', IntentionOutlined],
  ['semantic_search_yaklang_samples', SearchOutlined],
  ['code_sample_title', FigmaIcon34227111184Outlined],
  ['mcp-loader', MCPOutlined],
  ['grep_yaklang_samples', SearchOutlined],
  ['batch-compress', FolderArchiveOutlined],
  ['write_yaklang_code', FigmaIcon34227111185Outlined],
  ['re-act-loop', AtomOutlined],
  ['review', StethoscopeOutlined],
  ['directly_answer', AnnotationOutlined],
  ['memory-timeline', FolderArchiveOutlined],
  ['summary', ScrollTextOutlined],
  ['re-act-verify', ClipboardCheckOutlined],
  ['enhance-query', BookOpenTextOutlined],
])

export const getAIStreamIcon = (nodeId?: string): AIStreamIcon => streamIcons.get(nodeId || '') ?? Sparkles2Outlined
