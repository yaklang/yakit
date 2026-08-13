import type React from 'react'
import { useEffect, useState } from 'react'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { YakitModal } from '../yakitUI/YakitModal/YakitModal'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitSpin } from '../yakitUI/YakitSpin/YakitSpin'
import { OutlineDocumentduplicateIcon, OutlineRefreshIcon } from '@/assets/icon/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { setClipboardText } from '@/utils/clipboard'
import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'
import { yakitNotify } from '@/utils/notification'
import styles from './CeApiKeysListModal.module.scss'

type ApiKeyListItem = {
  apiKey: string
  active?: boolean
  remark?: string
}

export interface CeApiKeysListModalProps {
  visible: boolean
  onClose: () => void
}

const CeApiKeysListModal: React.FC<CeApiKeysListModalProps> = (props) => {
  const { visible, onClose } = props
  const { t } = useI18nNamespaces(['layout'])
  const [loading, setLoading] = useState(false)
  const [list, setList] = useState<ApiKeyListItem[]>([])

  const fetchList = useMemoizedFn(() => {
    setLoading(true)
    NetWorkApi<API.ApiKeysRequest, API.ApiKeysResponse>({
      method: 'post',
      url: 'apikeys',
      data: {
        page: 1,
        pageSize: 100,
      },
    })
      .then((res) => {
        const detail = res?.data
        const keys = Array.isArray(detail?.apiKey) ? detail.apiKey : []
        setList(
          keys.map((key) => ({
            apiKey: key,
            active: detail?.active,
            remark: detail?.remark,
          })),
        )
      })
      .catch((err) => {
        yakitNotify('error', t('FuncDomain.getApiKeyListFailed', { error: err }))
        setList([])
      })
      .finally(() => {
        setLoading(false)
      })
  })

  useEffect(() => {
    if (visible) {
      fetchList()
    } else {
      setList([])
    }
  }, [visible])

  return (
    <YakitModal
      wrapClassName={styles['api-keys-list-modal']}
      visible={visible}
      title={t('CeUserMenu.allApiKeys')}
      type="white"
      width={520}
      footer={null}
      destroyOnClose
      onCancel={onClose}
    >
      <div className={styles['api-keys-list-toolbar']}>
        <span className={styles['api-keys-list-count']}>{t('CeUserMenu.apiKeyCount', { count: list.length })}</span>
        <YakitButton type="text2" size="small" icon={<OutlineRefreshIcon />} onClick={fetchList} />
      </div>
      <YakitSpin spinning={loading}>
        <div className={styles['api-keys-list-body']}>
          {list.length === 0 && !loading ? (
            <div className={styles['api-keys-list-empty']}>{t('CeUserMenu.noApiKey')}</div>
          ) : (
            list.map((item, index) => {
              const key = item.apiKey || ''
              return (
                <div key={`${key}-${index}`} className={styles['api-keys-list-item']}>
                  <div className={styles['api-keys-list-item-main']}>
                    <span
                      className={classNames(styles['api-keys-list-item-status'], {
                        [styles['api-keys-list-item-status-active']]: item.active !== false,
                      })}
                    />
                    <div className={styles['api-keys-list-item-text']}>
                      <div
                        className={classNames(styles['api-keys-list-item-key'], 'yakit-single-line-ellipsis')}
                        title={key}
                      >
                        {key || '-'}
                      </div>
                      {!!item.remark && (
                        <div className={classNames(styles['api-keys-list-item-remark'], 'yakit-single-line-ellipsis')}>
                          {item.remark}
                        </div>
                      )}
                    </div>
                  </div>
                  {!!key && (
                    <YakitButton
                      type="text2"
                      size="small"
                      icon={<OutlineDocumentduplicateIcon />}
                      onClick={() => setClipboardText(key)}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
      </YakitSpin>
    </YakitModal>
  )
}

export default CeApiKeysListModal
