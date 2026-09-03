import type React from 'react'
import { memo, useMemo } from 'react'
import { useMemoizedFn } from 'ahooks'
import { Image } from 'antd'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineChatalt2Icon, OutlinePencilaltIcon, OutlineTrashIcon } from '@/assets/icon/outline'
import { formatTimestamp } from '@/utils/timeUtil'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { disposalCommentJSONConvertToData } from './convert'
import type { FlowDisposalLogItem } from './types'
import styles from './FlowDisposalLog.module.scss'

interface FlowDisposalLogItemProps {
  info: FlowDisposalLogItem
  hiddenLine?: boolean
  onReply?: (info: FlowDisposalLogItem) => void
  onDelete?: (info: FlowDisposalLogItem) => void
}

export const FlowDisposalLogItemView: React.FC<FlowDisposalLogItemProps> = memo((props) => {
  const { info, hiddenLine, onReply, onDelete } = props
  const { t } = useI18nNamespaces(['history'])

  const isSystem = info.logType === 'system'
  const isReply = !!info.parentComment

  const content = useMemo(() => {
    if (isSystem) return null
    return disposalCommentJSONConvertToData(info.description)
  }, [info.description, isSystem])

  const parentContent = useMemo(() => {
    if (!info.parentComment?.description) return null
    return disposalCommentJSONConvertToData(info.parentComment.description)
  }, [info.parentComment])

  const handleDownload = useMemoizedFn((url: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = url.split('/').pop() || 'image.png'
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  })

  return (
    <div className={classNames(styles['log-item'], { [styles['hidden-line']]: hiddenLine })}>
      <div className={styles['log-item-icon']}>
        {info.headImg ? <img src={info.headImg} alt="" /> : <OutlineChatalt2Icon />}
      </div>
      <div className={styles['log-item-main']}>
        <div className={styles['log-item-header']}>
          <div className={styles['log-item-user']}>
            <span className={styles['name']}>
              {info.userName || (isSystem ? t('HTTPFlowDetailMini.logSystem') : '-')}
            </span>
            <span className={styles['action']}>
              {isSystem
                ? t('HTTPFlowDetailMini.logUpdateMark')
                : isReply
                  ? t('HTTPFlowDetailMini.logReplyComment')
                  : t('HTTPFlowDetailMini.logPublishComment')}
            </span>
            <span className={styles['time']}>{formatTimestamp(info.createdAt)}</span>
          </div>
          {!isSystem && (
            <div className={styles['log-item-ops']}>
              <YakitButton type="text" size="small" icon={<OutlinePencilaltIcon />} onClick={() => onReply?.(info)}>
                {t('HTTPFlowDetailMini.logReply')}
              </YakitButton>
              {info.isMine && (
                <YakitButton
                  type="text"
                  size="small"
                  danger
                  icon={<OutlineTrashIcon />}
                  onClick={() => onDelete?.(info)}
                />
              )}
            </div>
          )}
        </div>

        {isSystem ? (
          <div className={styles['log-system-fields']}>
            <div className={styles['field-row']}>
              <span className={styles['label']}>{t('HTTPFlowTable.problemType')}：</span>
              <span>{info.problemType || '-'}</span>
            </div>
            <div className={styles['field-row']}>
              <span className={styles['label']}>{t('HTTPFlowTable.severity')}：</span>
              <span>{info.severity || '-'}</span>
            </div>
            <div className={styles['field-row']}>
              <span className={styles['label']}>{t('HTTPFlowTable.disposalStatus')}：</span>
              <span>{info.disposalStatus || '-'}</span>
            </div>
            <div className={styles['field-row']}>
              <span className={styles['label']}>{t('HTTPFlowTable.disposalNote')}：</span>
              <span>{info.disposalNote || t('HTTPFlowDetailMini.logNone')}</span>
            </div>
          </div>
        ) : (
          <>
            {!!parentContent && (
              <div className={styles['log-item-quote']}>
                {`${t('HTTPFlowDetailMini.logReply')} ${info.parentComment?.userName || '-'} : ${parentContent.text || ''}`}
                {parentContent.imgs.length > 0 && ` [图片] * ${parentContent.imgs.length}`}
              </div>
            )}
            {!!content?.text && <div className={styles['log-item-content']}>{content.text}</div>}
            {!!content?.imgs?.length && (
              <div className={styles['log-item-imgs']}>
                <Image.PreviewGroup>
                  {content.imgs.map((img) => (
                    <div key={img.url} className={styles['img-thumb']}>
                      <Image src={img.url} width={72} height={72} style={{ objectFit: 'cover' }} preview />
                      <YakitButton type="text" size="small" onClick={() => handleDownload(img.url)}>
                        {t('HTTPFlowDetailMini.logDownload')}
                      </YakitButton>
                    </div>
                  ))}
                </Image.PreviewGroup>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
})
