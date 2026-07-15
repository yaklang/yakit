import React, { useEffect, useState } from 'react'
import { Form } from 'antd'
import { useMemoizedFn } from 'ahooks'
import QRCode from 'qrcode'
import { NetWorkApi } from '@/services/fetch'
import { API } from '@/services/swagger/resposeType'
import { failed } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import styles from './PaymentTestModal.module.scss'

export type PaymentChannel = 'wechat' | 'alipay'

export interface PaymentTestModalProps {
  onCancel: () => void
}

const layout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 },
}

const PaymentTestModal: React.FC<PaymentTestModalProps> = (props) => {
  const { onCancel } = props
  const { t } = useI18nNamespaces(['layout', 'yakitUi'])
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [qrImage, setQrImage] = useState('')
  const [outTradeNo, setOutTradeNo] = useState('')
  const [codeUrl, setCodeUrl] = useState('')

  useEffect(() => {
    form.setFieldsValue({
      channel: 'wechat' as PaymentChannel,
      money: 1,
    })
  }, [form])

  const onGenerate = useMemoizedFn(async () => {
    try {
      const values = await form.validateFields()
      const channel = values.channel as PaymentChannel
      const money = Number(values.money)
      if (!money || money <= 0) {
        failed(t('FuncDomain.paymentMoneyInvalid'))
        return
      }

      setLoading(true)
      setQrImage('')
      setOutTradeNo('')
      setCodeUrl('')

      const url = channel === 'wechat' ? 'wechatpay/qrcode' : 'alipay/qrcode'
      console.log('start', url, money)

      const res = await NetWorkApi<API.PayRequest, API.PaymentQrcodeResponse>({
        method: 'post',
        url,
        data: { money },
      }).catch((err) => {
        console.log('err', err)
      })
      console.log('res', res)

      if (!res?.codeUrl) {
        failed(t('FuncDomain.paymentNoCodeUrl'))
        return
      }

      const dataUrl = await QRCode.toDataURL(res.codeUrl, {
        width: 200,
        margin: 1,
      })
      setCodeUrl(res.codeUrl)
      setOutTradeNo(res.outTradeNo || '')
      setQrImage(dataUrl)
    } catch (err) {
      failed(t('FuncDomain.paymentFailed', { error: err }))
    } finally {
      setLoading(false)
    }
  })

  return (
    <div className={styles['payment-test-modal']}>
      <Form {...layout} form={form}>
        <Form.Item
          name="channel"
          label={t('FuncDomain.paymentChannel')}
          rules={[{ required: true, message: t('YakitForm.requiredField') }]}
        >
          <YakitRadioButtons
            buttonStyle="solid"
            options={[
              { label: t('FuncDomain.paymentWechat'), value: 'wechat' },
              { label: t('FuncDomain.paymentAlipay'), value: 'alipay' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="money"
          label={t('FuncDomain.paymentMoney')}
          rules={[{ required: true, message: t('YakitForm.requiredField') }]}
        >
          <YakitInputNumber min={1} precision={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>

      <div className={styles['payment-test-actions']}>
        <YakitButton type="outline2" onClick={onCancel}>
          {t('YakitButton.cancel')}
        </YakitButton>
        <YakitButton type="primary" loading={loading} onClick={onGenerate}>
          {t('FuncDomain.paymentGenerate')}
        </YakitButton>
      </div>

      <YakitSpin spinning={loading}>
        <div className={styles['payment-test-qr']}>
          {qrImage ? (
            <>
              <img src={qrImage} alt="payment-qrcode" className={styles['payment-test-qr-img']} />
              {outTradeNo && (
                <div className={styles['payment-test-meta']}>
                  {t('FuncDomain.paymentOutTradeNo')}: {outTradeNo}
                </div>
              )}
              {codeUrl && (
                <div className={styles['payment-test-meta']} title={codeUrl}>
                  {t('FuncDomain.paymentCodeUrl')}: {codeUrl}
                </div>
              )}
            </>
          ) : (
            <div className={styles['payment-test-qr-empty']}>{t('FuncDomain.paymentQrEmpty')}</div>
          )}
        </div>
      </YakitSpin>
    </div>
  )
}

export default PaymentTestModal
