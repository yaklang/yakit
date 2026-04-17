import React, { useMemo } from 'react'
import { YakitStatusType, YaklangEngineMode } from '@/yakitGVDefine'
import {
  fetchEnv,
  getReleaseEditionName,
  isCommunityEdition,
  isCommunityMemfit,
  isEnpriTrace,
  isEnpriTraceAgent,
  isIRify,
  isMemfit,
} from '@/utils/envfile'
import { Tooltip } from 'antd'
import { OutlineQuestionmarkcircleIcon } from '@/assets/icon/outline'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'

import yakitSE from '@/assets/yakitSE.png'
import yakitEE from '@/assets/yakitEE.png'
import yakitCE from '@/assets/yakit.jpg'
import styles from './newYakitLoading.module.scss'
import classNames from 'classnames'
import { SolidIrifyMiniLogoIcon, SolidMemfitMiniLogoIcon } from '@/assets/icon/colors'
import { TFunction, useI18nNamespaces } from '@/i18n/useI18nNamespaces'

import IRifyPrimaryBg from '../../assets/uiLayout/IRifyPrimaryBg.png'
import MemfitAIPrimaryBg from '@/assets/uiLayout/MemfitAIPrimaryBg.png'
import YakitPrimaryBg from '@/assets/uiLayout/YakitPrimaryBg.png'

const { ipcRenderer } = window.require('electron')

/** 首屏加载蒙层展示语 */
const LoadingTitle: (t: TFunction) => string[] = (t) => {
  return [
    t('YakitLoading.slogans.0'),
    t('YakitLoading.slogans.1'),
    t('YakitLoading.slogans.2'),
    t('YakitLoading.slogans.3'),
    t('YakitLoading.slogans.4'),
    t('YakitLoading.slogans.5'),
    t('YakitLoading.slogans.6'),
    t('YakitLoading.slogans.7', { edition: getReleaseEditionName() }),
    t('YakitLoading.slogans.8', { edition: getReleaseEditionName() }),
    t('YakitLoading.slogans.9', { edition: getReleaseEditionName() }),
    t('YakitLoading.slogans.10', { edition: getReleaseEditionName() }),
    t('YakitLoading.slogans.11'),
    t('YakitLoading.slogans.12', { edition: getReleaseEditionName() }),
    t('YakitLoading.slogans.13'),
    t('YakitLoading.slogans.14', { edition: getReleaseEditionName() }),
    t('YakitLoading.slogans.15'),
    t('YakitLoading.slogans.16'),
    t('YakitLoading.slogans.17', { edition: getReleaseEditionName() }),
    t('YakitLoading.slogans.18'),
  ]
}

export interface NewYakitLoadingProp {
  /** yakit模式 */
  yakitStatus: YakitStatusType
  checkLog: string[]
  restartLoading: boolean
  remoteControlRefreshLoading: boolean
  btnClickCallback: (type: YaklangEngineMode | YakitStatusType) => any
}

export const NewYakitLoading: React.FC<NewYakitLoadingProp> = (props) => {
  const { yakitStatus, checkLog, restartLoading, remoteControlRefreshLoading, btnClickCallback } = props
  const { t, i18n } = useI18nNamespaces(['layout', 'yakitUi'])

  const btns = useMemo(() => {
    if (yakitStatus === 'control-remote') {
      return (
        <>
          <YakitButton
            loading={remoteControlRefreshLoading}
            className={styles['btn-style']}
            size="max"
            onClick={() => btnClickCallback('control-remote')}
          >
            {t('YakitButton.refresh')}
          </YakitButton>
          <YakitButton
            loading={remoteControlRefreshLoading}
            className={styles['btn-style']}
            type="outline2"
            size="max"
            onClick={() => btnClickCallback('local')}
          >
            {t('YakitLoading.backToLocal')}
          </YakitButton>
        </>
      )
    }

    if (yakitStatus === 'control-remote-timeout') {
      return (
        <YakitButton
          loading={restartLoading}
          className={styles['btn-style']}
          type="outline2"
          size="max"
          onClick={() => btnClickCallback('local')}
        >
          {t('YakitLoading.backToLocal')}
        </YakitButton>
      )
    }

    return null
  }, [yakitStatus, remoteControlRefreshLoading, restartLoading, i18n.language])

  /** 加载页随机宣传语 */
  const loadingTitle = useMemo(
    () => LoadingTitle(t)[Math.floor(Math.random() * (LoadingTitle(t).length - 0)) + 0],
    [i18n.language],
  )
  /** Title */
  const Title = useMemo(
    () =>
      yakitStatus === 'control-remote'
        ? t('YakitLoading.remoteControlling')
        : t('YakitLoading.welcome', { edition: getReleaseEditionName() }),
    [yakitStatus, i18n.language],
  )

  const startLogo = useMemo(() => {
    /* 社区版 */
    if (isCommunityEdition()) {
      if (isIRify()) {
        return (
          <div className={styles['yakit-loading-icon-wrapper']}>
            <div className={styles['white-icon']}>
              <SolidIrifyMiniLogoIcon />
            </div>
          </div>
        )
      }
      if (isCommunityMemfit()) {
        return (
          <div className={styles['yakit-loading-icon-wrapper']}>
            <div className={styles['white-icon']}>
              <SolidMemfitMiniLogoIcon />
            </div>
          </div>
        )
      }
      return (
        <div className={styles['yakit-loading-icon-wrapper']}>
          <div className={styles['white-icon']}>
            <img src={yakitCE} alt={t('YakitEmpty.noImage')} />
          </div>
        </div>
      )
    }

    /* 企业版 */
    if (isEnpriTrace()) {
      if (isIRify()) {
        return (
          <div className={styles['yakit-loading-icon-wrapper']}>
            <div className={styles['white-icon']}>
              <SolidIrifyMiniLogoIcon />
            </div>
          </div>
        )
      }
      if (isMemfit()) {
        return (
          <div className={styles['yakit-loading-icon-wrapper']}>
            <div className={styles['white-icon']}>
              <SolidMemfitMiniLogoIcon />
            </div>
          </div>
        )
      }
      return (
        <div className={styles['yakit-loading-icon-wrapper']}>
          <div className={styles['white-icon']}>
            <img src={yakitEE} alt={t('YakitEmpty.noImage')} />
          </div>
        </div>
      )
    }

    /* 便携版 */
    if (isEnpriTraceAgent()) {
      return (
        <div className={styles['yakit-loading-icon-wrapper']}>
          <div className={styles['white-icon']}>
            {/* <img src={yakitSE} alt={t('YakitEmpty.noImage')} /> */}
          </div>
        </div>
      )
    }

    return null
  }, [i18n.language])

  const primaryBg = useMemo(() => {
    switch (fetchEnv()) {
      case 'irify':
      case 'irify-enterprise':
        return `url(${IRifyPrimaryBg})`
      case 'memfit':
        return `url(${MemfitAIPrimaryBg})`
      case 'enterprise':
      case 'simple-enterprise':
      case 'yakit':
        return `url(${YakitPrimaryBg})`
      default:
        break
    }
  }, [])

  return (
    <div className={styles['yakit-loading-wrapper']}>
      <div className={styles['yakit-loading-body']}>
        <div className={styles['body-content']} style={{ backgroundImage: primaryBg }}>
          {startLogo}

          <div className={styles['yakit-loading-title']}>
            <div className={styles['title-style']}>{Title}</div>
            {isCommunityEdition() && <div className={styles['subtitle-stlye']}>{loadingTitle}</div>}
          </div>

          <div className={styles['yakit-loading-content']}>
            <div className={classNames(styles['loading-box-wrapper'], styles['light-boder'])}>
              <div className={classNames(styles['loading-box'], styles['light-bg'])}>
                <div className={styles['loading-bar']}>
                  <div className={styles['shine']}></div>
                </div>
              </div>
            </div>

            <div className={styles['log-wrapper']}>
              <div className={styles['log-body']}>
                {checkLog.map((item, index) => {
                  return (
                    <div key={item} className={styles['log-item']}>
                      {item}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className={styles['engine-log-btn']}>
              {btns}
              <div
                className={styles['engine-help-wrapper']}
                onClick={() => {
                  ipcRenderer.invoke('open-yaklang-path')
                }}
                style={{ position: 'fixed', bottom: 32 }}
              >
                {t('YakitLoading.openEngineFolder')}
                <Tooltip title={t('YakitLoading.openEngineFolderTip')}>
                  <OutlineQuestionmarkcircleIcon />
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
