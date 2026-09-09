import type React from 'react'
import { memo, useMemo } from 'react'
import { useMemoizedFn } from 'ahooks'
import { Image } from 'antd'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { PencilAltOutlined, TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { CommentLogColorful } from '@yakit-libs/yakit-ui-icons/colorful'
import { PopoverArrowIcon } from '@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon'
import { formatTimestamp } from '@/utils/timeUtil'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
// import { AuthorImg } from '@/pages/plugins/funcTemplate'
import { disposalCommentJSONConvertToData } from './convert'
import type { DisposalLogItem } from './types'
import styles from './RiskDisposalLog.module.scss'

interface RiskDisposalLogItemProps {
  info: DisposalLogItem
  hiddenLine?: boolean
  onReply?: (info: DisposalLogItem) => void
  onDelete?: (info: DisposalLogItem) => void
}

export const RiskDisposalLogItem: React.FC<RiskDisposalLogItemProps> = memo((props) => {
  const { info, hiddenLine, onReply, onDelete } = props
  const { t } = useI18nNamespaces(['risk'])

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

  const showParentQuote = !!(parentContent?.text || (parentContent?.imgs && parentContent.imgs.length > 0))
  const hasBody = isSystem ? true : !!(content?.text || content?.imgs?.length || showParentQuote)

  return (
    <div className={styles['log-item']}>
      <div className={styles['log-item-icon']}>
        <PopoverArrowIcon className={styles['arrow-icon']} />
        <div className={styles['icon-wrapper']}>
          <CommentLogColorful />
        </div>
        <div className={classNames(styles['line-tail'], { [styles['hidden-line-tail']]: !!hiddenLine })}>
          <div className={styles['line-wrapper']}>
            <div className={styles['line-top-dot']} />
            <div className={styles['line-style']} />
            <div className={styles['line-bottom-dot']} />
          </div>
        </div>
      </div>
      <div className={styles['log-item-info']}>
        <div className={styles['info-body']}>
          <div
            className={classNames(styles['info-header'], {
              [styles['info-header-with-body']]: hasBody,
            })}
          >
            <div className={styles['header-content']}>
              {/* {!isSystem && (
                <AuthorImg src={info.headImg || UnLogin} size="small" wrapperClassName={styles['header-avatar']} />
              )} */}
              <span className={styles['name']}>{info.userName || (isSystem ? t('RiskDisposalLog.system') : '-')}</span>
              {isSystem ? (
                <span className={styles['action']}>{t('RiskDisposalLog.dispose_risk')}</span>
              ) : isReply ? (
                <>
                  <span className={styles['action']}>{t('RiskDisposalLog.reply')}</span>
                  <span className={styles['reply-name']}>{info.parentComment?.userName || '-'}</span>
                </>
              ) : (
                <span className={styles['action']}>{t('RiskDisposalLog.publish_comment')}</span>
              )}
              <span className={styles['time']}>{` · ${formatTimestamp(info.createdAt)}`}</span>
            </div>
            {!isSystem && (
              <div className={styles['header-operate']}>
                <YakitButton
                  className={styles['reply-btn']}
                  type="outline2"
                  icon={<PencilAltOutlined color="currentColor" />}
                  onClick={() => onReply?.(info)}
                >
                  {t('RiskDisposalLog.reply')}
                </YakitButton>
                {info.isMine && (
                  <YakitButton
                    className={styles['reply-btn']}
                    type="text"
                    colors="danger"
                    icon={<TrashOutlined color="currentColor" />}
                    onClick={() => onDelete?.(info)}
                  />
                )}
              </div>
            )}
          </div>

          {hasBody && (
            <div className={styles['info-additional']}>
              {isSystem ? (
                <>
                  <div className={styles['log-item-content']}>{info.disposalStatus || info.description || '-'}</div>
                  {(info.repairTime || info.repairDepartment || info.repairer) && (
                    <div className={styles['log-system-meta']}>
                      {!!info.repairTime && (
                        <span>
                          {t('RiskDisposalLog.repair_time')}
                          {formatTimestamp(info.repairTime)}
                        </span>
                      )}
                      {!!info.repairDepartment && (
                        <span>
                          {t('RiskDisposalLog.repair_department')}
                          {info.repairDepartment}
                        </span>
                      )}
                      {!!info.repairer && (
                        <span>
                          {t('RiskDisposalLog.repairer')}
                          {info.repairer}
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {showParentQuote && (
                    <div className={styles['reply-style']}>
                      <div className={styles['reply-line']} />
                      <div className={styles['reply-content']}>
                        {!!parentContent?.text && (
                          <div
                            className={classNames(styles['content-style'], 'yakit-content-single-ellipsis')}
                            title={parentContent.text}
                          >
                            {parentContent.text}
                          </div>
                        )}
                        {!!parentContent?.imgs?.length && (
                          <span>{t('RiskDisposalLog.image_count', { count: parentContent.imgs.length })}</span>
                        )}
                      </div>
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
                              {t('RiskDisposalLog.download')}
                            </YakitButton>
                          </div>
                        ))}
                      </Image.PreviewGroup>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
