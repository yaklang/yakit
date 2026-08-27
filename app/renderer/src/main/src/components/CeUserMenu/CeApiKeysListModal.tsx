import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { YakitModal } from '../yakitUI/YakitModal/YakitModal'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitSpin } from '../yakitUI/YakitSpin/YakitSpin'
import { ArrowUpRightOutlined, DocumentDuplicateOutlined, RefreshOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { setClipboardText } from '@/utils/clipboard'
import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'
import { yakitNotify } from '@/utils/notification'
import { RollingLoadList } from '../RollingLoadList/RollingLoadList'
import { grpcUpdateApiKey, maskApiKey } from './ceApiKey'
import styles from './CeApiKeysListModal.module.scss'
import { Tooltip } from 'antd'

type ApiKeyListItem = {
  apiKey: string
  active?: boolean
  remark?: string
}

export interface CeApiKeysListModalProps {
  visible: boolean
  onClose: () => void
}

const PAGE_SIZE = 20
const ITEM_HEIGHT = 64
const LIST_MAX_HEIGHT = 420
const LIST_MIN_HEIGHT = 120
const NO_MORE_HEIGHT = 28

const CeApiKeysListModal: React.FC<CeApiKeysListModalProps> = (props) => {
  const { visible, onClose } = props
  const { t } = useI18nNamespaces(['layout'])
  const [list, setList] = useState<ApiKeyListItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [isRef, setIsRef] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const loadingRef = useRef(false)
  const listBodyRef = useRef<HTMLDivElement>(null)

  const listBodyHeight = useMemo(() => {
    if (list.length === 0) return LIST_MIN_HEIGHT
    const contentHeight = list.length * ITEM_HEIGHT + (hasMore ? 0 : NO_MORE_HEIGHT)
    return Math.min(LIST_MAX_HEIGHT, Math.max(LIST_MIN_HEIGHT, contentHeight))
  }, [hasMore, list.length])

  const fetchList = useMemoizedFn((nextPage: number, reset = false) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    if (reset) {
      setSpinning(true)
      setIsRef((v) => !v)
    }

    NetWorkApi<API.ApiKeysRequest, API.ApiKeysResponse>({
      method: 'post',
      url: 'apikeys',
      data: {
        page: nextPage,
        pageSize: PAGE_SIZE,
      },
    })
      .then((res) => {
        const detail = res?.data
        const keys = Array.isArray(detail?.apiKey) ? detail.apiKey : []
        const nextList = keys.map((key) => ({
          apiKey: key,
          active: detail?.active,
          remark: detail?.remark,
        }))
        setList((prev) => (reset || nextPage === 1 ? nextList : [...prev, ...nextList]))
        setPage(nextPage)
        setHasMore(keys.length >= PAGE_SIZE)
      })
      .catch((err) => {
        yakitNotify('error', t('FuncDomain.getApiKeyListFailed', { error: err }))
        if (reset || nextPage === 1) {
          setList([])
          setHasMore(false)
          setPage(1)
        }
      })
      .finally(() => {
        loadingRef.current = false
        setLoading(false)
        setSpinning(false)
      })
  })

  const loadMoreData = useMemoizedFn(() => {
    if (loadingRef.current || !hasMore) return
    fetchList(page + 1)
  })

  const handleRefresh = useMemoizedFn(() => {
    fetchList(1, true)
  })

  const handleReplace = useMemoizedFn((apiKey?: string) => {
    if (!apiKey || replacing) return
    setReplacing(true)
    grpcUpdateApiKey(apiKey)
      .then(() => {
        yakitNotify('success', t('CeUserMenu.replaceApiKeySuccess'))
      })
      .catch((err) => {
        yakitNotify('error', t('CeUserMenu.replaceApiKeyFailed', { error: err }))
      })
      .finally(() => {
        setReplacing(false)
      })
  })

  useEffect(() => {
    if (visible) {
      fetchList(1, true)
    } else {
      setList([])
      setPage(1)
      setHasMore(false)
      setLoading(false)
      setSpinning(false)
      setReplacing(false)
      loadingRef.current = false
    }
  }, [visible])

  const renderRow = useMemoizedFn((item: ApiKeyListItem) => {
    const key = item.apiKey || ''
    return (
      <div className={styles['api-keys-list-item']}>
        <div className={styles['api-keys-list-item-main']}>
          <span
            className={classNames(styles['api-keys-list-item-status'], {
              [styles['api-keys-list-item-status-active']]: item.active !== false,
            })}
          />
          <div className={styles['api-keys-list-item-text']}>
            <div className={styles['api-keys-list-item-key-row']}>
              <div className={classNames(styles['api-keys-list-item-key'], 'yakit-single-line-ellipsis')}>
                {maskApiKey(key) || '-'}
              </div>
              {!!key && (
                <YakitButton
                  type="text2"
                  size="small"
                  icon={<DocumentDuplicateOutlined color="currentColor" />}
                  onClick={() => setClipboardText(key)}
                />
              )}
            </div>
            {!!item.remark && (
              <div className={classNames(styles['api-keys-list-item-remark'], 'yakit-single-line-ellipsis')}>
                {item.remark}
              </div>
            )}
          </div>
        </div>
        {!!key && (
          <Tooltip title={t('CeUserMenu.replaceApiKey')}>
            <YakitButton
              type="text2"
              size="small"
              icon={<ArrowUpRightOutlined color="currentColor" size={16} />}
              disabled={replacing}
              onClick={() => handleReplace(key)}
            />
          </Tooltip>
        )}
      </div>
    )
  })

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
        <YakitButton
          type="text2"
          size="small"
          icon={<RefreshOutlined color="currentColor" />}
          onClick={handleRefresh}
        />
      </div>
      <YakitSpin spinning={spinning}>
        {list.length === 0 && !spinning ? (
          <div className={styles['api-keys-list-empty']}>{t('CeUserMenu.noApiKey')}</div>
        ) : (
          <div ref={listBodyRef} className={styles['api-keys-list-body']} style={{ height: listBodyHeight }}>
            <RollingLoadList<ApiKeyListItem>
              data={list}
              loadMoreData={loadMoreData}
              renderRow={renderRow}
              page={page}
              hasMore={hasMore}
              loading={loading}
              defItemHeight={ITEM_HEIGHT}
              rowKey="apiKey"
              isRef={isRef}
              targetRef={listBodyRef}
              classNameList={styles['api-keys-list-scroll']}
              classNameRow={styles['api-keys-list-row']}
            />
          </div>
        )}
      </YakitSpin>
    </YakitModal>
  )
}

export default CeApiKeysListModal
