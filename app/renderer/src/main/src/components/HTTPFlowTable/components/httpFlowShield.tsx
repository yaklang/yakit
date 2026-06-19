import React, { useContext } from 'react'
import { Tooltip } from 'antd'
import { useCreation } from 'ahooks'
import classNames from 'classnames'
import { RemoveIcon, StatusOfflineIcon } from '@/assets/newIcon'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import MITMContext from '@/pages/mitm/Context/MITMContext'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { HTTPFlowShieldProps } from '../HTTPFlowTable.constants'
import style from '../HTTPFlowTable.module.scss'

const HTTPFlowShield: React.FC<HTTPFlowShieldProps> = React.memo((props: HTTPFlowShieldProps) => {
  const { shieldData, cancleFilter, cancleAllFilter } = props
  const { t, i18n } = useI18nNamespaces(['yakitUi', 'history'])
  const mitmContent = useContext(MITMContext)

  const mitmVersion = useCreation(() => {
    return mitmContent.mitmStore.version
  }, [mitmContent.mitmStore.version])
  return (
    <>
      {shieldData?.data.length > 0 && (
        <YakitPopover
          placement="bottomLeft"
          trigger="click"
          content={
            <div className={style['title-header']}>
              {shieldData?.data.map((item: number | string) => (
                <div className={style['title-selected-tag']} key={item}>
                  <Tooltip title={item}>
                    <div className={classNames(style['tag-name-style'])}>{item}</div>
                  </Tooltip>
                  <div className={classNames(style['tag-del-style'])} onClick={() => cancleFilter(item)}>
                    <RemoveIcon />
                  </div>
                </div>
              ))}
              <YakitPopconfirm
                title={t('HTTPFlowTable.resetConfirm')}
                placement="top"
                onConfirm={() => cancleAllFilter(mitmVersion)}
              >
                <YakitButton type="text" className={style['shield-reset']}>
                  {t('YakitButton.reset')}
                </YakitButton>
              </YakitPopconfirm>
            </div>
          }
          overlayClassName={style['http-history-table-shield-popover']}
        >
          <div
            className={style['http-history-table-left-shield']}
            style={{ width: i18n.language.startsWith('zh') ? 115 : 150 }}
          >
            <span className="content-ellipsis">{t('HTTPFlowShield.conditionBlocked')}</span>
            <span className={style['http-history-table-left-number']}>{shieldData?.data.length}</span>
            <StatusOfflineIcon className={style['http-history-table-left-shield-icon']} />
          </div>
        </YakitPopover>
      )}
    </>
  )
})

HTTPFlowShield.displayName = 'HTTPFlowShield'

export default HTTPFlowShield
