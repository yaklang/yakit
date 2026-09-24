import type { TFunction } from '@/i18n/useI18nNamespaces'

/** Goal 持续时间预设：单一数据源（UI key / 展示文案 / GoalDurationSeconds） */

export const GOAL_DURATION_PRESETS = [
  { key: '1h', label: '1h', seconds: 3600 },
  { key: '3h', label: '3h', seconds: 10800 },
  { key: '5h', label: '5h', seconds: 18000 },
  { key: 'never', label: 'never', seconds: -1 },
] as const

export type GoalDurationPresetKey = (typeof GOAL_DURATION_PRESETS)[number]['key']

export const isGoalDurationPresetKey = (key: string): key is GoalDurationPresetKey =>
  GOAL_DURATION_PRESETS.some((p) => p.key === key)

/** 标签展示用：key → 语言无关回落；never 需走 i18n */
export const DURATION_PRESET_LABELS: Record<string, string> = Object.fromEntries(
  GOAL_DURATION_PRESETS.map((p) => [p.key, p.label]),
)

export const getGoalDurationDisplayLabel = (key: string, t: TFunction): string => {
  if (key === 'never') return t('AIMilkdownModeSlash.durationNever')
  return DURATION_PRESET_LABELS[key] || key
}

/** UI 预设 key → GoalDurationSeconds（与 yaklang 约定一致） */
export const goalDurationKeyToSeconds = (key: string): number => {
  const preset = GOAL_DURATION_PRESETS.find((p) => p.key === key)
  if (preset) return preset.seconds
  const n = Number(key)
  return Number.isFinite(n) ? n : 0
}

/** GoalDurationSeconds → 预设 key；未知秒数时回落为数字字符串以便展示 */
export const goalDurationSecondsToKey = (seconds: number): string | null => {
  if (seconds === 0) return null
  const preset = GOAL_DURATION_PRESETS.find((p) => p.seconds === seconds)
  if (preset) return preset.key
  return String(seconds)
}

/** @/mention 与 ModeSlash 浮层相对主聊天输入的共用定位常量 */

/** 主聊天输入外壳；无外壳时回退到 milkdown 容器 */
export const PANEL_GAP = 8
/** 相对输入框再上移，避免贴边 */
export const PANEL_OFFSET_UP = 0
/** 相对输入框左右各外扩，整体更宽 */
export const PANEL_WIDTH_EXTRA_EACH = 2
