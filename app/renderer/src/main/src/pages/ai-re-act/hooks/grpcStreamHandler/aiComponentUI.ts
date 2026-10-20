import type { AIMessageHandler, AIMessageHandlerParams } from '../type'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '../aiRender'
import { genBaseAIChatData } from '../utils'
import { Uint8ArrayToString } from '@/utils/str'
import { persistGetSessionContent, persistIndependentItem } from '../persist/contentPersistHelper'
import { parseJSONPrefix } from '../../interactive-ui/partialJson'
import type { UISubmission } from '../../interactive-ui/types'

export const UI_CONTENT_TYPE = 'application/vnd.memfit.ui+json'
const streams = new WeakMap<object, Map<string, { source: string; id?: string }>>()
const accepted = new WeakMap<object, Map<string, Record<string, UISubmission>>>()

// Ordinary user messages are also durable receipts, including old engine
// histories that have no component snapshot after submission.
export async function recordComponentSubmission(info: AIMessageHandlerParams, receipt: UISubmission) {
  if (receipt?.source !== 'component' || !receipt.requestId || !receipt.nodeId) return
  let cache = accepted.get(info.rawData.contents)
  if (!cache) {
    cache = new Map()
    accepted.set(info.rawData.contents, cache)
  }
  const submissions = cache.get(receipt.requestId) || {}
  submissions[receipt.nodeId] ||= receipt
  cache.set(receipt.requestId, submissions)
  const token = `ui-component:${receipt.requestId}`
  const item = info.rawData.contents.get(token) || (await persistGetSessionContent(info.sessionId, token))
  if (!info.meta.lifecycle.current || item?.type !== AIChatQSDataTypeEnum.UI_COMPONENT) return
  item.data.submissions = { ...submissions, ...item.data.submissions }
  info.rawData.contents.set(token, item)
  persistIndependentItem(info.sessionId, item, info.meta.lifecycle)
  info.store.getState().incrementNodeVersion(token, 'item')
}

async function upsert(
  info: AIMessageHandlerParams,
  id: string,
  source: string,
  final: boolean,
  revision = 0,
  diagnostics = [],
  submissions: Record<string, UISubmission> = {},
) {
  const token = `ui-component:${id}`
  const { rawData, store, res, sessionId } = info
  const previous = rawData.contents.get(token) || (await persistGetSessionContent(sessionId, token))
  if (!info.meta.lifecycle.current) return
  if (previous?.type === AIChatQSDataTypeEnum.UI_COMPONENT) {
    // A completed snapshot wins over its old streamed representation during history replay.
    if (res.IsSync && ((previous.data.final && !final) || (previous.data.revision || 0) > revision)) return
    if (!final && (previous.data.revision || 0) >= 1) return
  }
  const item: AIChatQSData = {
    ...genBaseAIChatData(res),
    id: token,
    type: AIChatQSDataTypeEnum.UI_COMPONENT,
    chatType: 'reAct',
    data: {
      sessionId,
      source,
      final,
      revision,
      diagnostics,
      submissions: {
        ...accepted.get(rawData.contents)?.get(id),
        ...(previous?.type === AIChatQSDataTypeEnum.UI_COMPONENT ? previous.data.submissions : {}),
        ...submissions,
      },
    },
    uiState: previous?.uiState,
    stageSettled: final,
  }
  rawData.contents.set(token, item)
  if (final) persistIndependentItem(sessionId, item, info.meta.lifecycle)
  store
    .getState()
    .dispatchStreamingNode({ chatType: 'reAct', node: { token, kind: 'item', type: item.type, isHistory: res.IsSync } })
  if (previous) store.getState().incrementNodeVersion(token, 'item')
}

export const handleComponentUI: AIMessageHandler = async (info) => {
  const payload = JSON.parse(Uint8ArrayToString(info.res.Content))
  if (!payload.document?.id) return
  await upsert(
    info,
    payload.document.id,
    JSON.stringify(payload.document),
    true,
    payload.revision,
    payload.diagnostics,
    payload.submissions,
  )
}

/** Returns true only for the registered UI stream; other streams keep their existing path. */
export async function handleComponentStream(info: AIMessageHandlerParams): Promise<boolean> {
  const { res, rawData } = info
  let payload: any
  if (res.Type === 'stream_start' || res.NodeId === 'stream-finished') {
    try {
      payload = JSON.parse(Uint8ArrayToString(res.Content))
    } catch {
      return false
    }
  }
  let cache = streams.get(rawData)
  const uuid = payload?.event_writer_id || res.EventUUID
  const isUI =
    res.ContentType === UI_CONTENT_TYPE ||
    res.NodeId === 'ui_component' ||
    payload?.node_id === 'ui_component' ||
    cache?.has(uuid)
  if (!isUI) return false
  if (!cache) {
    cache = new Map()
    streams.set(rawData, cache)
  }
  if (res.Type === 'stream_start') {
    cache.set(uuid, { source: '' })
    return true
  }
  if (res.NodeId === 'stream-finished') {
    const id = cache.get(uuid)?.id
    const item = id ? rawData.contents.get(`ui-component:${id}`) : undefined
    if (item?.type === AIChatQSDataTypeEnum.UI_COMPONENT && !item.data.final) {
      item.data.streamEnded = true
      item.stageSettled = true
      persistIndependentItem(info.sessionId, item, info.meta.lifecycle)
      info.store.getState().incrementNodeVersion(item.id, 'item')
    }
    cache.delete(uuid)
    return true
  }
  if (res.Type !== 'stream') return true
  const state = cache.get(uuid) || { source: '' }
  const source =
    state.source +
    (res.Content ? Uint8ArrayToString(res.Content) : '') +
    (res.StreamDelta ? Uint8ArrayToString(res.StreamDelta) : '')
  if (source.length > 262144) {
    cache.delete(uuid)
    return true
  }
  state.source = source
  cache.set(uuid, state)
  try {
    const parsed = parseJSONPrefix(source)
    const doc = parsed.value as { id?: string }
    if (typeof doc?.id === 'string' && parsed.completed.has('id')) {
      state.id = doc.id
      await upsert(info, doc.id, source, false)
    }
  } catch {
    // The authoritative final event carries diagnostics and a textual fallback.
  }
  return true
}
