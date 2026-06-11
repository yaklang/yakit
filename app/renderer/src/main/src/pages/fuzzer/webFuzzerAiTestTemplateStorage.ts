import {
  DEFAULT_WEB_FUZZER_AI_TEST_TEMPLATES,
  WebFuzzerAiTestTemplate,
} from '@/defaultConstants/webFuzzerAiTestTemplates'
import { FuzzerRemoteGV } from '@/enums/fuzzer'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'

function isValidTemplate(item: unknown): item is WebFuzzerAiTestTemplate {
  if (!item || typeof item !== 'object') return false
  const { label, prompt } = item as WebFuzzerAiTestTemplate
  return typeof label === 'string' && label.trim().length > 0 && typeof prompt === 'string'
}

function normalizeTemplates(list: WebFuzzerAiTestTemplate[]): WebFuzzerAiTestTemplate[] {
  return list
    .filter(isValidTemplate)
    .map((item) => ({
      label: item.label.trim(),
      prompt: item.prompt,
    }))
}

export async function saveWebFuzzerAiTestTemplates(templates: WebFuzzerAiTestTemplate[]): Promise<void> {
  await setRemoteValue(FuzzerRemoteGV.WebFuzzerAiTestTemplates, JSON.stringify(normalizeTemplates(templates)))
}

export async function loadWebFuzzerAiTestTemplates(): Promise<WebFuzzerAiTestTemplate[]> {
  try {
    const raw = await getRemoteValue(FuzzerRemoteGV.WebFuzzerAiTestTemplates)
    if (!raw) {
      const defaults = [...DEFAULT_WEB_FUZZER_AI_TEST_TEMPLATES]
      await saveWebFuzzerAiTestTemplates(defaults)
      return defaults
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      const defaults = [...DEFAULT_WEB_FUZZER_AI_TEST_TEMPLATES]
      await saveWebFuzzerAiTestTemplates(defaults)
      return defaults
    }
    const templates = normalizeTemplates(parsed)
    if (templates.length === 0) {
      const defaults = [...DEFAULT_WEB_FUZZER_AI_TEST_TEMPLATES]
      await saveWebFuzzerAiTestTemplates(defaults)
      return defaults
    }
    return templates
  } catch {
    const defaults = [...DEFAULT_WEB_FUZZER_AI_TEST_TEMPLATES]
    await saveWebFuzzerAiTestTemplates(defaults)
    return defaults
  }
}
