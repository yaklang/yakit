import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { YakitModal } from '../yakitUI/YakitModal/YakitModal'
import { YakitInput } from '../yakitUI/YakitInput/YakitInput'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'
import { yakitNotify } from '@/utils/notification'

export interface CeRedeemModalProps {
  open: boolean
  onClose: () => void
  /** 兑换成功后刷新额度等 */
  onSuccess?: () => void
}

const CeRedeemModal: React.FC<CeRedeemModalProps> = (props) => {
  const { open, onClose, onSuccess } = props
  const { t } = useI18nNamespaces(['layout'])
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  /** 关闭/重开后作废进行中请求的回调，避免误关新弹窗 */
  const requestSeqRef = useRef(0)

  useEffect(() => {
    if (!open) {
      requestSeqRef.current += 1
      setCode('')
      setLoading(false)
    }
  }, [open])

  const handleCancel = useMemoizedFn(() => {
    if (loading) return
    onClose()
  })

  const handleRedeem = useMemoizedFn(() => {
    const trimmed = code.trim()
    if (!trimmed) {
      yakitNotify('error', t('CeUserMenu.redeemCodeRequired'))
      return
    }
    if (loading) return
    const seq = ++requestSeqRef.current
    setLoading(true)
    NetWorkApi<API.RedeemCodeRequest, API.ActionSucceeded>({
      method: 'post',
      url: 'user/redeem',
      data: { code: trimmed },
    })
      .then(() => {
        if (seq !== requestSeqRef.current) return
        yakitNotify('success', t('CeUserMenu.redeemSuccess'))
        onSuccess?.()
        onClose()
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return
        yakitNotify('error', t('CeUserMenu.redeemFailed', { error: err }))
      })
      .finally(() => {
        if (seq !== requestSeqRef.current) return
        setLoading(false)
      })
  })

  return (
    <YakitModal
      type="white"
      title={t('CeUserMenu.redeem')}
      width={400}
      maskClosable={false}
      open={open}
      closable={!loading}
      onCancel={handleCancel}
      destroyOnHidden
      footer={null}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '0 0 24px 0' }}>
        <YakitInput
          value={code}
          allowClear
          wrapperStyle={{ flex: 1 }}
          placeholder={t('CeUserMenu.redeemCodePlaceholder')}
          onChange={(e) => setCode(e.target.value)}
          onPressEnter={handleRedeem}
        />
        <YakitButton type="primary" loading={loading} onClick={handleRedeem}>
          {t('CeUserMenu.redeem')}
        </YakitButton>
      </div>
    </YakitModal>
  )
}

export default CeRedeemModal
