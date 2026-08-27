import type { SingleManualHijackInfoMessage } from '../MITMHacker/utils'
import { Uint8ArrayToString } from '@/utils/str'

export interface ManualHijackBackendPacketSnapshot {
  taskID: string
  isWebsocket: boolean
  request: string
  response: string
  payload: string
}

export interface ManualHijackPacketSyncPlan {
  snapshot: ManualHijackBackendPacketSnapshot
  syncRequest: boolean
  syncResponse: boolean
}

export const snapshotManualHijackBackendPackets = (
  info: SingleManualHijackInfoMessage,
): ManualHijackBackendPacketSnapshot => ({
  taskID: info.TaskID,
  isWebsocket: info.IsWebsocket,
  request: Uint8ArrayToString(info.Request),
  response: Uint8ArrayToString(info.Response),
  payload: Uint8ArrayToString(info.Payload),
})

/**
 * Decide which editable packet state must be refreshed from the backend.
 *
 * A fresh list-row object for the same task is not necessarily a fresh packet.
 * Reapplying byte-identical backend data would overwrite the parent component's
 * editable value while Monaco keeps rendering its local value, so the UI and
 * the packet submitted to MITMv2 would diverge.
 */
export const planManualHijackPacketSync = (
  previous: ManualHijackBackendPacketSnapshot | undefined,
  info: SingleManualHijackInfoMessage,
): ManualHijackPacketSyncPlan => {
  const snapshot = snapshotManualHijackBackendPackets(info)
  const switchedTask = !previous || previous.taskID !== snapshot.taskID || previous.isWebsocket !== snapshot.isWebsocket

  if (switchedTask) {
    return {
      snapshot,
      syncRequest: true,
      syncResponse: !snapshot.isWebsocket,
    }
  }

  if (snapshot.isWebsocket) {
    return {
      snapshot,
      syncRequest: previous.payload !== snapshot.payload,
      syncResponse: false,
    }
  }

  return {
    snapshot,
    syncRequest: previous.request !== snapshot.request,
    syncResponse: previous.response !== snapshot.response,
  }
}
