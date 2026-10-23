import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { grpcGetAIForge } from '@/pages/ai-agent/grpc'
import { getCodeByPath } from '@/pages/yakRunner/utils'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import { AIInputEventSyncTypeEnum } from '../../../../hooks/grpcApi'
import { useCurrentRawData } from '../../../../hooks/useCurrentDataBySession'
import useCurrentSessionId from '../../../../hooks/useCurrentSessionId'
import { useSyncLoadingState } from '../../../../hooks/useSyncLoadingState'
import type { AISkillDetailsProps } from './type'
import styles from './AISkillDetails.module.scss'

const AISkillDetails: FC<AISkillDetailsProps> = ({ source, name }) => {
  const rawData = useCurrentRawData()
  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()
  const { loading: syncLoading, markSending } = useSyncLoadingState()
  const [fileLoading, setFileLoading] = useState(true)
  const [fileContent, setFileContent] = useState<string>()
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const loadSkill = useMemoizedFn(async (isActive: () => boolean) => {
    setFileLoading(true)
    setFileContent(undefined)
    try {
      const forge = await grpcGetAIForge({ ForgeName: name, InflateSkillPath: true }, true)
      if (!isActive() || !forge.SkillPath) return
      const separator = forge.SkillPath.includes('\\') && !forge.SkillPath.includes('/') ? '\\' : '/'
      const path = `${forge.SkillPath}${forge.SkillPath.endsWith(separator) ? '' : separator}SKILL.md`
      const content = await getCodeByPath(path)
      if (isActive()) setFileContent(content)
    } catch {
      if (isActive()) setFileContent(undefined)
    } finally {
      if (isActive())
        loadingTimerRef.current = setTimeout(() => {
          if (isActive()) setFileLoading(false)
        }, 500)
    }
  })

  const loadSkillFromBackend = useMemoizedFn(() => {
    if (rawData.skillDetails.has(name)) return
    const syncId = `skill-detail-${randomString(16)}`
    markSending(syncId)
    onSend({
      token: sessionId,
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKILL_DETAIL,
        SyncID: syncId,
        SyncJsonInput: JSON.stringify({ skill_name: name }),
      },
    })
  })

  useEffect(() => {
    let active = true

    switch (source) {
      case 'right-panel':
        loadSkillFromBackend()
        break
      case 'task-details':
        void loadSkill(() => active)
        break
    }

    return () => {
      active = false
      clearTimeout(loadingTimerRef.current)
    }
  }, [source, name])

  const getDetailState = () => {
    switch (source) {
      case 'right-panel': {
        const detail = rawData.skillDetails.get(name)
        const content = detail?.loaded ? detail.prompt_content : detail?.skill_md
        return {
          loading: syncLoading,
          content: detail?.error ? '' : content,
          error: detail?.error,
        }
      }
      case 'task-details':
        return { loading: fileLoading, content: fileContent, error: '' }
      default:
        return { loading: false, content: '', error: '' }
    }
  }
  const { loading, content, error } = getDetailState()

  return (
    <div className={styles['skill-details']}>
      {error && <div role="alert">{error}</div>}
      <div className={styles['editor-container']}>
        <YakitSpin spinning={loading}>
          {content ? <YakitEditor value={content} type="markdown" readOnly={true} /> : <YakitEmpty />}
        </YakitSpin>
      </div>
    </div>
  )
}

export default AISkillDetails
