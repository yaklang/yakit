import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import styles from './BottomEditorDetails.module.scss'
import classNames from 'classnames'
import type { BottomEditorDetailsProps, ShowItemType } from './BottomEditorDetailsType'
import { XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import useStore from '../hooks/useStore'
import emiter from '@/utils/eventBus/eventBus'
import { PaperAirplaneIcon } from '@yakit-libs/yakit-ui-icons/oldicon'
import { RuleEditorBox } from './RuleEditorBox/RuleEditorBox'
import useDispatcher from '../hooks/useDispatcher'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import useShortcutKeyTrigger from '@/utils/globalShortcutKey/events/useShortcutKeyTrigger'
import { HoleDispose } from './HoleDispose/HoleDispose'
import type {
  QuerySSARisksResponse,
  SSARisk,
} from '@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType'
import { RightBugAuditResult } from '@/pages/risks/YakitRiskTable/YakitRiskTable'
import { openSSARiskNewWindow } from '@/utils/openWebsite'
import { JSONParseLog } from '@/utils/tool'
import { yakitNotify } from '@/utils/notification'
import { openAIForge } from '@/pages/yakRunnerAuditHole/YakitAuditHoleTable/utils'
import {
  AUDIT_CODE_RULE_GEN_AI_PAGE_ID,
  registerAuditCodeRuleEditorGetter,
  unescapeLikelyJsonEscapedText,
} from '../auditCodeRuleGenAiBridge'
import { YakRunnerCasualCodeReplaceReviewOverlay } from '@/pages/yakRunner/YakRunnerCasualCodeReplaceReviewOverlay'
import {
  registerYakRunnerPageCasualCodeReplaceReview,
  registerYakRunnerPageGetActiveCodeString,
  type YakRunnerCasualCodeReplaceReviewPayload,
} from '@/pages/yakRunner/yakRunnerAiCodeApplyBridge'
import { syncYakRunnerPatchWorkingDraft } from '@/pages/yakRunner/yakRunnerAiCodePatchApply'
const { ipcRenderer } = window.require('electron')

// 编辑器区域 展示详情（输出/语法检查/终端/帮助信息）
export const BottomEditorDetails: React.FC<BottomEditorDetailsProps> = (props) => {
  const { isShowEditorDetails, setEditorDetails, showItem, setShowItem } = props
  const { projectName, auditExecuting } = useStore()
  const { setAuditRule } = useDispatcher()
  // 不再重新加载的元素
  const [showType, setShowType] = useState<ShowItemType[]>([])
  // monaco输入内容
  const [ruleEditor, setRuleEditor] = useState<string>('')
  const ruleEditorRef = useRef(ruleEditor)
  // 展示所需的BugHash
  const [bugHash, setBugHash] = useState<string>('')
  const [info, setInfo] = useState<SSARisk>()

  const casualReviewQueueIdRef = useRef(0)
  const casualReviewSessionIdRef = useRef<string | null>(null)
  const casualReviewBaselineRef = useRef<string | null>(null)
  const [casualReviewQueue, setCasualReviewQueue] = useState<
    { id: string; payload: YakRunnerCasualCodeReplaceReviewPayload }[]
  >([])

  useEffect(() => {
    ruleEditorRef.current = ruleEditor
  }, [ruleEditor])

  const toAI = useMemoizedFn((e) => {
    e.stopPropagation()
    if (!ruleEditor) {
      yakitNotify('warning', '未找到规则内容，无法进行AI美化')
      return
    }
    const params = {
      query: {
        ForgeName: 'sf_rule_completion',
      },
      handleParamsUIConfig: (paramsUIConfig) => {
        paramsUIConfig.map((item) => {
          if (item.Field === 'file_content') {
            item.DefaultValue = ruleEditor
          }
          return item
        })
        return paramsUIConfig
      },
      jsonParseLogParams: {
        page: 'YakRunnerAuditCode',
        fun: 'toAI',
      },
    }
    openAIForge(params)
  })

  // 数组去重
  const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

  const onResetAuditRuleFun = useMemoizedFn((v: string) => {
    setRuleEditor(unescapeLikelyJsonEscapedText(v))
  })

  useEffect(() => {
    emiter.on('onResetAuditRule', onResetAuditRuleFun)
    return () => {
      emiter.off('onResetAuditRule', onResetAuditRuleFun)
    }
  }, [])

  // 供「规则生成」AI 发送时附带当前规则草稿；并给 patch 合并用 active code
  useEffect(() => {
    const unregisterGetter = registerAuditCodeRuleEditorGetter(
      AUDIT_CODE_RULE_GEN_AI_PAGE_ID,
      () => ruleEditorRef.current,
    )
    const unregisterActive = registerYakRunnerPageGetActiveCodeString(
      AUDIT_CODE_RULE_GEN_AI_PAGE_ID,
      () => ruleEditorRef.current,
    )
    return () => {
      unregisterGetter()
      unregisterActive()
    }
  }, [])

  const onCasualCodeReplaceReviewEnqueued = useMemoizedFn((payload: YakRunnerCasualCodeReplaceReviewPayload) => {
    const incoming = unescapeLikelyJsonEscapedText(payload.change.code?.content ?? '')
    let baseline = unescapeLikelyJsonEscapedText(payload.original ?? '')
    if (casualReviewSessionIdRef.current != null && casualReviewBaselineRef.current != null) {
      baseline = casualReviewBaselineRef.current
    } else {
      baseline = ruleEditorRef.current || baseline
    }

    const normIncoming = String(incoming).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const normOriginal = String(baseline).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    if (normOriginal === normIncoming) {
      if (casualReviewSessionIdRef.current != null) {
        setCasualReviewQueue([])
        casualReviewSessionIdRef.current = null
        casualReviewBaselineRef.current = null
      }
      // 内容相同也确保面板打开且草稿已是最新
      setRuleEditor(normIncoming)
      return
    }

    const enrichedPayload: YakRunnerCasualCodeReplaceReviewPayload = {
      ...payload,
      original: baseline,
      change: {
        ...payload.change,
        code: {
          ...payload.change.code,
          content: incoming,
        },
      },
      language: payload.language || 'sf',
      fileName: payload.fileName || 'rule.sf',
    }

    if (casualReviewSessionIdRef.current == null) {
      casualReviewQueueIdRef.current += 1
      casualReviewSessionIdRef.current = `sf-rule-${casualReviewQueueIdRef.current}`
    }
    casualReviewBaselineRef.current = baseline
    const id = casualReviewSessionIdRef.current
    setCasualReviewQueue([{ id, payload: enrichedPayload }])
    // 首次交付时立刻挂上 ruleEditor 面板，避免 overlay 等下一轮 effect 才进 DOM
    setShowType((arr) => filterItem([...arr, 'ruleEditor']))
    setShowItem('ruleEditor')
    setEditorDetails(true)
  })

  const onCasualRoundApplyMerged = useMemoizedFn((mergedCode: string, done?: boolean) => {
    const head = casualReviewQueue[0]
    if (!head) return
    const next = unescapeLikelyJsonEscapedText(mergedCode)
    casualReviewBaselineRef.current = next
    syncYakRunnerPatchWorkingDraft(AUDIT_CODE_RULE_GEN_AI_PAGE_ID, next)
    setRuleEditor(next)
    setCasualReviewQueue((prev) => {
      const cur = prev[0]
      if (!cur) return prev
      return [{ ...cur, payload: { ...cur.payload, original: next } }]
    })
    if (done) {
      setCasualReviewQueue([])
      casualReviewSessionIdRef.current = null
      casualReviewBaselineRef.current = null
    }
  })

  useEffect(() => {
    return registerYakRunnerPageCasualCodeReplaceReview(
      AUDIT_CODE_RULE_GEN_AI_PAGE_ID,
      onCasualCodeReplaceReviewEnqueued,
    )
  }, [onCasualCodeReplaceReviewEnqueued])

  useEffect(() => {
    if (showItem && isShowEditorDetails) {
      if (showType.includes(showItem)) return
      setShowType((arr) => filterItem([...arr, showItem]))
    }
  }, [showItem, isShowEditorDetails])

  const onOpenBottomDetailFun = useMemoizedFn((v: string) => {
    try {
      const { type }: { type: ShowItemType } = JSONParseLog(v, {
        page: 'BottomEditorDetails',
        fun: 'onOpenBottomDetailFun',
      })
      setEditorDetails(true)
      setShowItem(type)
    } catch (error) {}
  })

  const onCodeAuditOpenBugDetailFun = useMemoizedFn((hash: string) => {
    ipcRenderer
      .invoke('QuerySSARisks', {
        Filter: {
          Hash: [hash],
        },
      })
      .then((res: QuerySSARisksResponse) => {
        const { Data } = res
        if (Data.length > 0) {
          setInfo(Data[0])
          setBugHash(hash)
        }
      })
      .catch((err) => {})
  })

  useEffect(() => {
    emiter.on('onCodeAuditOpenBottomDetail', onOpenBottomDetailFun)
    // 打开编译BUG详情
    emiter.on('onCodeAuditOpenBugDetail', onCodeAuditOpenBugDetailFun)
    return () => {
      emiter.off('onCodeAuditOpenBottomDetail', onOpenBottomDetailFun)
      emiter.off('onCodeAuditOpenBugDetail', onCodeAuditOpenBugDetailFun)
    }
  }, [])

  const onAuditRuleSubmit = useMemoizedFn(() => {
    if (!projectName || ruleEditor.length === 0) return
    setAuditRule && setAuditRule(ruleEditor)
    emiter.emit('onAuditRuleSubmit', ruleEditor)
  })

  const onStopAuditRule = useMemoizedFn(() => {
    emiter.emit('onStopAuditRule')
  })

  useShortcutKeyTrigger('submit*aduit', () => {
    if (isShowEditorDetails && showItem === 'ruleEditor') {
      onAuditRuleSubmit()
    }
  })

  return (
    <div className={styles['bottom-editor-details']}>
      <div className={styles['header']}>
        <div className={styles['select-box']}>
          <div
            className={classNames(styles['item'], {
              [styles['active-item']]: showItem === 'ruleEditor',
              [styles['no-active-item']]: showItem !== 'ruleEditor',
            })}
            onClick={() => setShowItem('ruleEditor')}
          >
            <div className={styles['title']}>规则编写</div>
          </div>
          <div
            className={classNames(styles['item'], {
              [styles['active-item']]: showItem === 'holeDetail',
              [styles['no-active-item']]: showItem !== 'holeDetail',
            })}
            onClick={() => setShowItem('holeDetail')}
          >
            <div className={styles['title']}>漏洞详情</div>
          </div>
          <div
            className={classNames(styles['item'], {
              [styles['active-item']]: showItem === 'holeDispose',
              [styles['no-active-item']]: showItem !== 'holeDispose',
            })}
            onClick={() => setShowItem('holeDispose')}
          >
            <div className={styles['title']}>漏洞处置</div>
          </div>
        </div>
        <div className={styles['extra']}>
          {showItem === 'ruleEditor' && (
            <>
              <YakitButton onClick={toAI} disabled={auditExecuting}>
                美化
              </YakitButton>
              {auditExecuting ? (
                <YakitButton danger icon={<PaperAirplaneIcon />} onClick={onStopAuditRule}>
                  暂停执行
                </YakitButton>
              ) : (
                <YakitButton
                  icon={<PaperAirplaneIcon />}
                  onClick={onAuditRuleSubmit}
                  disabled={!projectName || ruleEditor.length === 0}
                >
                  开始审计
                </YakitButton>
              )}
            </>
          )}
          <YakitButton
            type="text2"
            icon={<XOutlined color="currentColor" />}
            onClick={() => {
              setEditorDetails(false)
            }}
          />
        </div>
      </div>
      <div className={styles['content']}>
        {showType.includes('ruleEditor') && (
          <div
            className={classNames(styles['render-hideen'], styles['rule-editor-wrap'], {
              [styles['render-show']]: showItem === 'ruleEditor',
            })}
          >
            {/* Keep underlying editor mounted (visibility only) so wrap height stays
                100%; absolute review overlay still needs an in-flow size host. */}
            <div
              style={{
                height: '100%',
                width: '100%',
                visibility: casualReviewQueue[0] ? 'hidden' : 'visible',
                pointerEvents: casualReviewQueue[0] ? 'none' : 'auto',
              }}
            >
              <RuleEditorBox
                ruleEditor={ruleEditor}
                setRuleEditor={setRuleEditor}
                disabled={auditExecuting || !!casualReviewQueue[0]}
                onAuditRuleSubmit={onAuditRuleSubmit}
              />
            </div>
            {casualReviewQueue[0] ? (
              <YakRunnerCasualCodeReplaceReviewOverlay
                roundKey={casualReviewQueue[0].id}
                payload={casualReviewQueue[0].payload}
                onApplyRound={onCasualRoundApplyMerged}
              />
            ) : null}
          </div>
        )}
        {showType.includes('holeDetail') && (
          <div
            className={classNames(styles['render-hideen'], {
              [styles['render-show']]: showItem === 'holeDetail',
            })}
          >
            {bugHash ? (
              <>
                {info && (
                  <RightBugAuditResult
                    info={info}
                    extra={
                      <YakitButton
                        type="primary"
                        onClick={() => {
                          openSSARiskNewWindow(info)
                        }}
                      >
                        新窗口打开
                      </YakitButton>
                    }
                  />
                )}
              </>
            ) : (
              <div className={styles['no-audit']}>
                <YakitEmpty title="暂无漏洞" />
              </div>
            )}
          </div>
        )}
        {showType.includes('holeDispose') && (
          <div
            className={classNames(styles['render-hideen'], {
              [styles['render-show']]: showItem === 'holeDispose',
            })}
          >
            {bugHash ? (
              <HoleDispose RiskHash={bugHash} info={info} />
            ) : (
              <div className={styles['no-audit']}>
                <YakitEmpty title="请选择漏洞进行处置" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
