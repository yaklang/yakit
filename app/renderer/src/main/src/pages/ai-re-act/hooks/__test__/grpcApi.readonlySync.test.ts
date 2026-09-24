import { describe, expect, it } from 'vitest'
import { AIInputEventSyncTypeEnum, isReadonlySyncQuery, readonlySyncQueryTypes } from '../grpcApi'

describe('readonlySyncQueryTypes', () => {
  it('集合恰好包含全部只读数据查询类同步类型', () => {
    expect([...readonlySyncQueryTypes].sort()).toEqual(
      [
        AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN,
        AIInputEventSyncTypeEnum.SYNC_TYPE_CONSUMPTION,
        AIInputEventSyncTypeEnum.SYNC_TYPE_PING,
        AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
        AIInputEventSyncTypeEnum.SYNC_TYPE_TIMELINE,
        AIInputEventSyncTypeEnum.SYNC_TYPE_MEMORY_CONTEXT,
        AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS,
        AIInputEventSyncTypeEnum.SYNC_CAPABILITY_INVENTORY,
      ]
        .map((value) => `${value}` as const)
        .sort(),
    )
  })

  it('不含任何会修改任务与配置的同步类型', () => {
    const mutatingTypes: `${AIInputEventSyncTypeEnum}`[] = [
      AIInputEventSyncTypeEnum.SYNC_TYPE_PROCESS_EVENT,
      AIInputEventSyncTypeEnum.SYNC_TYPE_UPDATE_CONFIG,
      AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
      AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_JUMP_QUEUE,
      AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_REMOVE_TASK,
      AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CLEAR_TASK,
      AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_PLAN_AND_EXEC,
      AIInputEventSyncTypeEnum.SYNC_TYPE_SKIP_SUBTASK_IN_PLAN,
      AIInputEventSyncTypeEnum.SYNC_TYPE_REDO_SUBTASK_IN_PLAN,
      AIInputEventSyncTypeEnum.SYNC_TYPE_KNOWLEDGE,
      AIInputEventSyncTypeEnum.SYNC_TYPE_USER_INTERVENTION,
      AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_HISTORY,
      AIInputEventSyncTypeEnum.SYNC_EXECUTE_DETACHED_PLAN,
      AIInputEventSyncTypeEnum.SYNC_CLOSE_BROWSER,
      AIInputEventSyncTypeEnum.SYNC_TYPE_SESSION_SNAPSHOT_SYNC,
    ]
    for (const type of mutatingTypes) {
      expect(readonlySyncQueryTypes.has(type)).toBe(false)
    }
  })
})

describe('isReadonlySyncQuery', () => {
  it('集合内每个成员都返回 true', () => {
    for (const type of readonlySyncQueryTypes) {
      expect(isReadonlySyncQuery(type)).toBe(true)
    }
  })

  it('undefined、空字符串与非集合成员返回 false', () => {
    expect(isReadonlySyncQuery(undefined)).toBe(false)
    expect(isReadonlySyncQuery('' as `${AIInputEventSyncTypeEnum}`)).toBe(false)
    expect(isReadonlySyncQuery(AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK)).toBe(false)
    expect(isReadonlySyncQuery('not_a_sync_type' as `${AIInputEventSyncTypeEnum}`)).toBe(false)
  })
})
