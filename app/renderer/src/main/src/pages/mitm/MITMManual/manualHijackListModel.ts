import { ManualHijackListAction } from '@/defaultConstants/mitmV2'
import type { SingleManualHijackInfoMessage } from '../MITMHacker/utils'

export interface ManualHijackBatchHooks {
  onAdd?: (item: SingleManualHijackInfoMessage, dataBeforeAdd: ManualHijackListView) => void
  onDelete?: (item: SingleManualHijackInfoMessage, dataAfterDelete: ManualHijackListView) => void
  onUpdate?: (item: SingleManualHijackInfoMessage, found: boolean) => void
}

export interface ManualHijackListView {
  readonly length: number
  at: (index: number) => SingleManualHijackInfoMessage | undefined
}

export interface ManualHijackBatchResult {
  data: SingleManualHijackInfoMessage[]
  missingUpdateTaskIDs: string[]
}

/**
 * Applies a burst with one index build and one final compaction. Deletes leave
 * temporary tombstones so a large burst never repeatedly copies the full list.
 */
export const applyManualHijackBatch = (
  current: SingleManualHijackInfoMessage[],
  pending: SingleManualHijackInfoMessage[],
  hooks: ManualHijackBatchHooks = {},
): ManualHijackBatchResult => {
  const slots: Array<SingleManualHijackInfoMessage | undefined> = [...current]
  const indexByTaskID = new Map<string, number>()
  current.forEach((item, index) => {
    if (!indexByTaskID.has(item.TaskID)) indexByTaskID.set(item.TaskID, index)
  })
  let liveCount = current.length
  const missingUpdateTaskIDs: string[] = []
  const view: ManualHijackListView = {
    get length() {
      return liveCount
    },
    at(index) {
      if (index < 0 || index >= liveCount) return undefined
      let liveIndex = 0
      for (const entry of slots) {
        if (!entry) continue
        if (liveIndex === index) return entry
        liveIndex += 1
      }
      return undefined
    },
  }

  for (const item of pending) {
    const taskID = item.TaskID
    switch (item.manualHijackListAction) {
      case ManualHijackListAction.Hijack_List_Add: {
        if (!indexByTaskID.has(taskID)) {
          hooks.onAdd?.(item, view)
          indexByTaskID.set(taskID, slots.length)
          slots.push(item)
          liveCount += 1
        }
        break
      }
      case ManualHijackListAction.Hijack_List_Delete: {
        const deleteIndex = indexByTaskID.get(taskID)
        if (deleteIndex !== undefined) {
          slots[deleteIndex] = undefined
          indexByTaskID.delete(taskID)
          liveCount -= 1
        }
        hooks.onDelete?.(item, view)
        break
      }
      case ManualHijackListAction.Hijack_List_Update: {
        const updateIndex = indexByTaskID.get(taskID)
        hooks.onUpdate?.(item, updateIndex !== undefined)
        if (updateIndex === undefined) {
          missingUpdateTaskIDs.push(taskID)
          break
        }
        slots[updateIndex] = { ...item, arrivalOrder: slots[updateIndex]?.arrivalOrder }
        break
      }
      default:
        break
    }
  }

  return {
    data: slots.filter((item): item is SingleManualHijackInfoMessage => item !== undefined),
    missingUpdateTaskIDs,
  }
}

export const decorateManualHijackRows = (
  data: SingleManualHijackInfoMessage[],
  resolveCellClassName: (tags: string) => string,
): SingleManualHijackInfoMessage[] => {
  return data.map(({ Tags = [], ...rest }) => ({
    ...rest,
    Tags,
    cellClassName: resolveCellClassName(Tags.join('|')),
  }))
}
