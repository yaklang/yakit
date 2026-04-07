import { FC, useMemo, useRef, useState } from 'react'

import { useMemoizedFn, useUpdateEffect } from 'ahooks'

import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { setAIModal } from '@/pages/ai-agent/aiModelList/AIModelList'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import styles from './EditorInfo.module.scss'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitPluginBaseAIInfo } from '../base'
import useHoldGRPCStream from '@/hook/useHoldGRPCStream/useHoldGRPCStream'
import { failed, yakitNotify } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import { ExpandAndRetractExcessiveState } from '@/pages/plugins/operator/expandAndRetract/ExpandAndRetract'
import { apiDebugPlugin, DebugPluginRequest } from '@/pages/plugins/utils'
import { grpcFetchLocalPluginDetail } from '@/pages/pluginHub/utils/grpc'
import { defPluginExecuteFormValue } from '@/pages/plugins/operator/localPluginExecuteDetailHeard/constants'
import { EditorBaseInfoProps } from './EditorInfo'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { JSONParseLog } from '@/utils/tool'

const emptyAI: YakitPluginBaseAIInfo = {
  EnableForAI: false,
  AIDesc: '',
  AIKeywords: '',
  AIUsage: '',
}

interface AIPluginComponentProps extends Pick<EditorBaseInfoProps, 'getCodeContent'> {
  value?: YakitPluginBaseAIInfo
  onChange?: (value: YakitPluginBaseAIInfo) => void
}

const AIPluginComponent: FC<AIPluginComponentProps> = ({ getCodeContent, value, onChange }) => {
  const { t } = useI18nNamespaces(['aiAgent'])

  const tokenRef = useRef<string>(randomString(40))
  const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>('default')

  const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
    taskName: 'debug-plugin',
    apiKey: 'DebugPlugin',
    token: tokenRef.current,
    onEnd: () => {
      debugPluginStreamEvent.stop()
      setTimeout(() => {
        setExecuteStatus('finished')
      }, 300)
    },
    setRuntimeId: (rId) => {
      yakitNotify('info', `调试任务启动成功，运行时 ID: ${rId}`)
    },
  })

  const merged = useMemo(() => ({ ...emptyAI, ...value }), [value])

  const handleEnableChange = useMemoizedFn((check: boolean) => {
    onChange?.({ ...merged, EnableForAI: check })
  })

  const patch = useMemoizedFn((partial: Partial<YakitPluginBaseAIInfo>) => {
    onChange?.({ ...merged, ...partial })
  })

  const handleGenerate = useMemoizedFn(async () => {
    const codeContent = getCodeContent()
    if (codeContent?.trim().length === 0) {
      failed('插件源码不能为空')
      return
    }
    try {
      debugPluginStreamEvent.reset()
      const plugin = await grpcFetchLocalPluginDetail({ Name: 'YakScript AI元数据生成' }, false)
      const token = tokenRef.current

      let executeParams: DebugPluginRequest = {
        Code: '',
        PluginType: plugin.Type,
        Input: '',
        HTTPRequestTemplate: {
          ...defPluginExecuteFormValue,
        },
        ExecParams: [
          {
            Key: 'content',
            Value: codeContent || '',
          },
          {
            Key: 'script_name',
            Value: 'script.yak',
          },
          {
            Key: 'type',
            Value: 'yak',
          },
          {
            Key: 'tags',
            Value: '',
          },
          {
            Key: 'desc',
            Value: '',
          },
        ],
        PluginName: plugin.ScriptName,
      }

      apiDebugPlugin({
        params: executeParams,
        token: token,
        pluginCustomParams: plugin.Params,
      }).then(() => {
        setExecuteStatus('process')
        debugPluginStreamEvent.start()
      })
    } catch (error) {}
  })

  useUpdateEffect(() => {
    if (executeStatus !== 'finished') return
    const raw = streamInfo?.logState?.find((item) => item?.level === 'info')?.data
    if (raw == null) return
    try {
      let transformLogState: Record<string, unknown>
      if (typeof raw === 'string') {
        const parsed = JSONParseLog(raw, { page: 'AIPluginComponent' })
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
        transformLogState = parsed as Record<string, unknown>
      } else if (typeof raw === 'object' && !Array.isArray(raw)) {
        transformLogState = raw as Record<string, unknown>
      } else {
        return
      }
      const kw = transformLogState.ai_keywords
      const AIKeywords = Array.isArray(kw) ? kw.join(',') : typeof kw === 'string' ? kw : ''
      onChange?.({
        ...emptyAI,
        ...value,
        EnableForAI: true,
        AIDesc: typeof transformLogState.ai_desc === 'string' ? transformLogState.ai_desc : '',
        AIUsage: typeof transformLogState.ai_usage === 'string' ? transformLogState.ai_usage : '',
        AIKeywords,
      })
    } catch {
      failed('解析 AI 生成结果失败')
    }
  }, [streamInfo, executeStatus])

  /** 增加 AI 配置模型 */
  const handleSetting = useMemoizedFn(() => {
    setAIModal({
      t,
      onSuccess: () => {},
    })
  })

  return (
    <div className={styles['switch-ai-wrapper']}>
      <YakitSwitch checked={merged.EnableForAI} onChange={handleEnableChange} />
      <div className={styles['wrapper-label']}>
        <div>开放给AI使用</div>
        <div>开启后使用AI时可调用该插件</div>
        <div className={styles['wrapper-label-highlight']}>
          以下内容可通过AI生成，
          <YakitButton
            type="text"
            onClick={() => handleGenerate()}
            style={{ margin: 0, padding: 0, fontSize: 14 }}
            loading={executeStatus === 'process'}
          >
            点击生成，
          </YakitButton>
          如未配置AI可
          <br />
          <YakitButton type="text" onClick={() => handleSetting()} style={{ margin: 0, padding: 0, fontSize: 14 }}>
            点此配置
          </YakitButton>
          AI描述
        </div>
        {merged.EnableForAI && (
          <>
            <div className={styles['ai-items-wrapper']}>
              <div>AI描述</div>
              <YakitInput value={merged.AIDesc} onChange={(e) => patch({ AIDesc: e.target.value })} />
            </div>
            <div className={styles['ai-items-wrapper']}>
              <div>AI关键词</div>
              <YakitInput.TextArea
                rows={2}
                value={merged.AIKeywords}
                onChange={(e) => patch({ AIKeywords: e.target.value })}
              />
            </div>
            <div className={styles['ai-items-wrapper']}>
              <div>AI指南</div>
              <YakitInput.TextArea
                rows={2}
                value={merged.AIUsage}
                onChange={(e) => patch({ AIUsage: e.target.value })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export { AIPluginComponent }
