import React, { useEffect, useRef, useState } from 'react'
import { Tooltip } from 'antd'
import classNames from 'classnames'
import { useInViewport, useMemoizedFn } from 'ahooks'
import { OutlinePuzzleIcon, OutlineQuestionmarkcircleIcon, OutlineXIcon } from '@/assets/icon/outline'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { grpcGetAIReActRecommendedSkills } from '@/pages/ai-agent/grpc'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { AIChatSelect } from '../aiReviewRuleSelect/AIReviewRuleSelect'
import type { AIReActRecommendedSkill } from '../hooks/grpcApi'
import type { AIRecommendedSkillSelectProps } from './type'
import styles from './AIRecommendedSkillSelect.module.scss'

export const AIRecommendedSkillSelect: React.FC<AIRecommendedSkillSelectProps> = React.memo((props) => {
  const { value, onChange, className, disabled } = props
  const { t, i18n } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [skills, setSkills] = useState<AIReActRecommendedSkill[]>([])
  const [open, setOpen] = useState<boolean>(false)
  const ref = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(ref)

  useEffect(() => {
    if (!inViewport) return
    grpcGetAIReActRecommendedSkills()
      .then((res) => setSkills(res?.Data || []))
      .catch(() => setSkills([]))
  }, [inViewport])

  const getDisplayName = useMemoizedFn((skill: AIReActRecommendedSkill) => {
    return ['zh', 'zh-CN'].includes(i18n.language) ? skill.DisplayNameZhCN || skill.Name : skill.Name
  })

  const onSelectSkill = useMemoizedFn((name: string) => {
    onChange(skills.find((item) => item.Name === name))
    setOpen(false)
  })

  const onRemove = useMemoizedFn((event: React.MouseEvent) => {
    event.stopPropagation()
    onChange(undefined)
    setOpen(false)
  })

  return (
    <div ref={ref} className={classNames(styles['recommended-skill-select'], className)}>
      <AIChatSelect
        dropdownRender={(menu) => (
          <div className={styles['drop-select-wrapper']}>
            <div className={styles['select-title']}>
              <OutlinePuzzleIcon />
              {t('AIRecommendedSkill.title')}
              <Tooltip title={t('AIRecommendedSkill.tooltip')}>
                <OutlineQuestionmarkcircleIcon />
              </Tooltip>
            </div>
            {menu}
          </div>
        )}
        value={
          value?.Name || {
            label: (
              <div className={styles['select-option']}>
                <OutlinePuzzleIcon className={styles['icon-wrapper']} />
                <span className={styles['select-option-text']}>{t('AIRecommendedSkill.title')}</span>
              </div>
            ),
            value: '',
          }
        }
        optionLabelProp="label"
        open={open}
        setOpen={setOpen}
        disabled={disabled}
        onSelect={onSelectSkill}
      >
        {skills.map((skill) => (
          <YakitSelect.Option
            key={skill.Name}
            value={skill.Name}
            label={
              <div className={styles['select-option']}>
                <OutlinePuzzleIcon className={styles['icon-wrapper']} />
                <span className={styles['select-option-text']} title={getDisplayName(skill)}>
                  {getDisplayName(skill)}
                </span>
                {!disabled && <OutlineXIcon className={styles['icon-wrapper']} onClick={onRemove} />}
              </div>
            }
          >
            <Tooltip title={skill.Description} placement="right">
              <div
                className={classNames(styles['select-option-wrapper'], {
                  [styles['select-option-active-wrapper']]: skill.Name === value?.Name,
                })}
              >
                <div className={styles['text']}>{getDisplayName(skill)}</div>
              </div>
            </Tooltip>
          </YakitSelect.Option>
        ))}
      </AIChatSelect>
    </div>
  )
})
