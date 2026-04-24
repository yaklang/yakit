import React, { memo, useEffect, useRef, useState } from 'react'
import { useMemoizedFn, useSize } from 'ahooks'
import classNames from 'classnames'
import { OutlineImportIcon } from '@/assets/icon/outline'
import { SolidIrifyMiniLogoIcon } from '@/assets/icon/colors'
import { YakRunnerOpenFolderIcon } from '@/pages/yakRunner/icon'
import emiter from '@/utils/eventBus/eventBus'
import { getYakRunnerHistory } from '@/pages/yakRunner/utils'
import { YakRunnerHistoryProps } from '@/pages/yakRunner/YakRunnerType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { SystemInfo } from '@/constants/hardware'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { OpenFolderDragger } from '@/pages/yakRunner/RunnerFileTree/RunnerFileTree'
import { warn } from '@/utils/notification'
import i18n from '@/i18n/i18n'
import styles from './IrifyAiCodeAuditWelcomePage.module.scss'

const tYak = i18n.getFixedT(null, 'yakRunner')

export const IrifyAiCodeAuditWelcomePage: React.FC = memo(() => {
  const { t } = useI18nNamespaces(['irifyAiCodeAudit'])
  const ref = useRef<HTMLDivElement>(null)
  const size = useSize(ref)
  const [historyList, setHistoryList] = useState<YakRunnerHistoryProps[]>([])

  const getHistoryList = useMemoizedFn(async () => {
    try {
      const list = await getYakRunnerHistory()
      setHistoryList(list)
    } catch (error) {}
  })
  useEffect(() => {
    getHistoryList()
  }, [])

  const openFolder = useMemoizedFn(() => {
    if (SystemInfo.mode === 'remote') {
      let absolutePath = ''
      const m = showYakitModal({
        title: tYak('RunnerFileTree.enterFolderPath'),
        width: 400,
        type: 'white',
        closable: false,
        centered: true,
        content: <OpenFolderDragger setAbsolutePath={(v) => (absolutePath = v)} />,
        onCancel: () => {
          m.destroy()
        },
        onOk: async () => {
          if (absolutePath.length === 0) {
            warn(tYak('RunnerFileTree.enterFolderPath'))
            return
          }
          emiter.emit('onIrifyAiCodeAuditOpenFileTree', absolutePath)
          m.destroy()
        },
      })
    } else {
      handleOpenFileSystemDialog({ title: tYak('RunnerFileTree.selectFolder'), properties: ['openDirectory'] }).then(
        (data) => {
          if (data.filePaths.length) {
            const absolutePath: string = data.filePaths[0].replace(/\\/g, '\\')
            emiter.emit('onIrifyAiCodeAuditOpenFileTree', absolutePath)
          }
        },
      )
    }
  })

  return (
    <div className={styles['yak-runner-welcome-page']} ref={ref}>
      <div className={styles['title']}>
        <div className={styles['icon-style']}>
          <SolidIrifyMiniLogoIcon />
        </div>
        <div className={styles['header-style']}>{t('welcomeTitle')}</div>
        <div className={styles['welcome-subtitle']}>{t('welcomeHint')}</div>
      </div>
      <div className={styles['operate-box']} style={size && size.width < 600 ? { padding: '0px 20px' } : {}}>
        <div className={styles['operate']}>
          <div className={styles['title-style']}>{t('quickStart')}</div>
          <div
            className={classNames(styles['operate-btn-group'], {
              [styles['operate-btn-group-irify']]: true,
            })}
          >
            <div className={classNames(styles['btn-style'], styles['btn-open-folder'])} onClick={openFolder}>
              <div className={styles['btn-title']}>
                <YakRunnerOpenFolderIcon />
                {t('openLocalFolder')}
              </div>
              <OutlineImportIcon className={styles['icon-style']} />
            </div>
          </div>
        </div>

        <div className={styles['recent-open']}>
          <div className={styles['title-style']}>{t('recentlyOpened')}</div>
          <div className={styles['recent-list']}>
            {historyList
              .filter((h) => !h.isFile)
              .slice(0, 3)
              .map((item) => {
                return (
                  <div
                    key={item.path}
                    className={styles['list-opt']}
                    onClick={() => {
                      emiter.emit('onIrifyAiCodeAuditOpenFileTree', item.path)
                    }}
                  >
                    <div className={styles['file-name']}>{item.name}</div>
                    <div className={classNames(styles['file-path'], 'yakit-single-line-ellipsis')}>{item.path}</div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
})
