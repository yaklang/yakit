export type ModelPriceId = 'glm' | 'kimi' | 'deepseek'

export type ModelPrice = {
  id: ModelPriceId
  name: string
  labelKey: string
  noteKey: string
  sourceLabelKey: string
  sourceURL: string
  inputRmb: number
  cachedInputRmb: number
  outputRmb: number
  accent: string
}

export type EstimateMode = 'task' | 'coding'

export type EstimateScenario = {
  id: EstimateMode
  name: string
  englishName: string
  descriptionKey: string
  cacheHitRate: number
  inputOutputRatio: number
  tokensPerInteraction: number
}

export type EstimateOutcome = {
  value: string
  unitKey: string
  labelKey: string
}

export type ModelEstimate = {
  model: ModelPrice
  tokenMillions: number
  interactions: number
  outcomes: EstimateOutcome[]
}

export const SCENARIOS: Record<EstimateMode, EstimateScenario> = {
  task: {
    id: 'task',
    name: 'Task Agent',
    englishName: 'TASK EXECUTION',
    descriptionKey: 'CeUserMenu.scenarioTaskDesc',
    cacheHitRate: 0.85,
    inputOutputRatio: 8,
    tokensPerInteraction: 50_000,
  },
  coding: {
    id: 'coding',
    name: 'Coding Agent',
    englishName: 'CODE GENERATION',
    descriptionKey: 'CeUserMenu.scenarioCodingDesc',
    cacheHitRate: 0.95,
    inputOutputRatio: 5,
    tokensPerInteraction: 100_000,
  },
}

export const MODELS: ModelPrice[] = [
  {
    id: 'glm',
    name: 'GLM-5.2',
    labelKey: 'CeUserMenu.modelLabelGlm',
    noteKey: 'CeUserMenu.modelNoteGlm',
    sourceLabelKey: 'CeUserMenu.modelSourceGlm',
    sourceURL: 'https://bigmodel.cn/pricing',
    inputRmb: 8,
    cachedInputRmb: 2,
    outputRmb: 28,
    accent: '#ef8a4d',
  },
  {
    id: 'kimi',
    name: 'Kimi K3',
    labelKey: 'CeUserMenu.modelLabelKimi',
    noteKey: 'CeUserMenu.modelNoteKimi',
    sourceLabelKey: 'CeUserMenu.modelSourceKimi',
    sourceURL: 'https://platform.kimi.com/',
    inputRmb: 20,
    cachedInputRmb: 2,
    outputRmb: 100,
    accent: '#cab189',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek-V4-Flash',
    labelKey: 'CeUserMenu.modelLabelDeepseek',
    noteKey: 'CeUserMenu.modelNoteDeepseek',
    sourceLabelKey: 'CeUserMenu.modelSourceDeepseek',
    sourceURL: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',
    inputRmb: 1,
    cachedInputRmb: 0.02,
    outputRmb: 2,
    accent: '#74a98c',
  },
]

export function getNumberLocale(language?: string) {
  if (!language) return 'en-US'
  if (language.startsWith('zh-TW') || language.startsWith('zh-HK')) return 'zh-TW'
  if (language.startsWith('zh')) return 'zh-CN'
  return 'en-US'
}

export function rmbPerMillionTotalTokens(model: ModelPrice, scenario: EstimateScenario) {
  const effectiveInputRmb =
    scenario.cacheHitRate * model.cachedInputRmb + (1 - scenario.cacheHitRate) * model.inputRmb
  return (scenario.inputOutputRatio * effectiveInputRmb + model.outputRmb) / (scenario.inputOutputRatio + 1)
}

export function formatTokenMillions(value: number) {
  if (value >= 100) return value.toFixed(0)
  if (value >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

export function formatUnitPrice(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)
}

export function buildEstimates(
  selectedPrice: number,
  estimateMode: EstimateMode,
  numberLocale = 'zh-CN',
): ModelEstimate[] {
  const scenario = SCENARIOS[estimateMode]
  const budget = Number.isFinite(selectedPrice) && selectedPrice > 0 ? selectedPrice : 0

  return MODELS.map((model) => {
    const tokenMillions = budget > 0 ? budget / rmbPerMillionTotalTokens(model, scenario) : 0
    const interactions = Math.floor((tokenMillions * 1_000_000) / scenario.tokensPerInteraction)
    const outcomes: EstimateOutcome[] =
      estimateMode === 'task'
        ? [
            {
              value: `${Math.floor(interactions / 10).toLocaleString(numberLocale)}–${Math.floor(interactions / 4).toLocaleString(numberLocale)}`,
              unitKey: 'CeUserMenu.itemUnit',
              labelKey: 'CeUserMenu.outcomeSmallTask',
            },
            {
              value: Math.floor(interactions / 50).toLocaleString(numberLocale),
              unitKey: 'CeUserMenu.timesUnit',
              labelKey: 'CeUserMenu.outcomeSecurityAudit',
            },
          ]
        : [
            {
              value: Math.floor(interactions / 12).toLocaleString(numberLocale),
              unitKey: 'CeUserMenu.itemUnit',
              labelKey: 'CeUserMenu.outcomeProductPage',
            },
            {
              value: Math.floor(interactions / 25).toLocaleString(numberLocale),
              unitKey: 'CeUserMenu.timesUnit',
              labelKey: 'CeUserMenu.outcomeFeatureIter',
            },
          ]

    return {
      model,
      tokenMillions,
      interactions,
      outcomes,
    }
  })
}
