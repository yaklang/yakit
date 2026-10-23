import { useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import useCurrentSessionId from '../../hooks/useCurrentSessionId'
import { useSyncLoadingState } from '../../hooks/useSyncLoadingState'
import { AIInputEventSyncTypeEnum } from '../../hooks/grpcApi'

export const useSkillLoading = () => {
  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()
  const { loading: addLoading, markSending } = useSyncLoadingState()
  const [addingSkill, setAddingSkill] = useState('')

  const onAddSkill = useMemoizedFn((name: string) => {
    const syncId = `skill-load-${randomString(16)}`
    setAddingSkill(name)
    markSending(syncId)
    onSend({
      token: sessionId,
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_LOAD_SKILL,
        SyncID: syncId,
        SyncJsonInput: JSON.stringify({ skill_names: [name] }),
      },
    })
  })

  return { addLoading, addingSkill, onAddSkill }
}
