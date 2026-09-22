import type { IconComponent } from '@yakit-libs/yakit-ui-icons/outline'
import {
  AnnotationOutlined,
  AtomOutlined,
  BookOpenTextOutlined,
  ClipboardCheckOutlined,
  CompilationOutlined,
  Compilation2Outlined,
  FolderArchiveOutlined,
  GitMergeOutlined,
  IntentionOutlined,
  LightBulbOutlined,
  LoaderPinwheelOutlined,
  MCPOutlined,
  ScrollTextOutlined,
  SearchOutlined,
  Sparkles2Outlined,
  StethoscopeOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'

// 按输出过程类型匹配设计图中的图标，未配置的节点使用默认星光图标。
const streamIcons = new Map<string, IconComponent>([
  ['loading_skills_names', LoaderPinwheelOutlined],
  ['load_skill_resources_path', LoaderPinwheelOutlined],
  ['load_capability', LoaderPinwheelOutlined],
  ['dispatch_sub_react_agents', GitMergeOutlined],
  ['load_tool', LoaderPinwheelOutlined],
  ['loading_skills_name', LoaderPinwheelOutlined],
  ['perception', LightBulbOutlined],
  ['intent', IntentionOutlined],
  ['semantic_search_yaklang_samples', SearchOutlined],
  ['code_sample_title', CompilationOutlined],
  ['mcp-loader', MCPOutlined],
  ['grep_yaklang_samples', SearchOutlined],
  ['batch-compress', FolderArchiveOutlined],
  ['write_yaklang_code', Compilation2Outlined],
  ['re-act-loop', AtomOutlined],
  ['review', StethoscopeOutlined],
  ['directly_answer', AnnotationOutlined],
  ['memory-timeline', FolderArchiveOutlined],
  ['summary', ScrollTextOutlined],
  ['re-act-verify', ClipboardCheckOutlined],
  ['enhance-query', BookOpenTextOutlined],
])

export const getAIStreamIcon = (nodeId?: string): IconComponent => streamIcons.get(nodeId || '') ?? Sparkles2Outlined
