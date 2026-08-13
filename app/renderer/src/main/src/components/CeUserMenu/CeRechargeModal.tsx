import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import QRCode from 'qrcode'
import { YakitModal } from '../yakitUI/YakitModal/YakitModal'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitRadioButtons } from '../yakitUI/YakitRadioButtons/YakitRadioButtons'
import { OutlineChevronleftIcon, OutlineCreditcardIcon, OutlineRefreshIcon, OutlineXIcon } from '@/assets/icon/outline'
import { WechatIcon } from '@/assets/commonProcessIcons'
import { AlipayIcon, PayFailedIcon, PaySuccessIcon, QrLoadErrorIcon, QrLoadingIcon } from './icon'
import {
  buildEstimates,
  formatTokenMillions,
  formatUnitPrice,
  getNumberLocale,
  SCENARIOS,
  type EstimateMode,
} from './ceRechargeEstimate'
import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './CeRechargeModal.module.scss'

type PayMethod = 'alipay' | 'wechat'
type ViewType = 'plan' | 'pay'
/** loading/loadError: 拉码；ready/expired: 扫码；success/failed: 支付结果 */
type PayStatus = 'loading' | 'loadError' | 'ready' | 'expired' | 'success' | 'failed'

interface TokenPackage {
  id: string
  price: number
}

/** 1 毛钱 = 1M Token → 1 元 = 10M Token */
const TOKEN_RATE = 10
/** 二维码 UI 有效期（秒）；到期仅切失效态，不停订单轮询 */
const QR_EXPIRE_SECONDS = 120
/** 订单状态轮询间隔（毫秒） */
const POLL_INTERVAL_MS = 2000

const TOKEN_PACKAGES: TokenPackage[] = [
  { id: 'p1', price: 20 },
  { id: 'p2', price: 50 },
  { id: 'p3', price: 100 },
  { id: 'p4', price: 200 },
]

const formatPayTime = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const formatPayTimeFromUnix = (payTime?: number) => {
  if (payTime && payTime > 0) {
    return formatPayTime(new Date(payTime * 1000))
  }
  return formatPayTime(new Date())
}

export interface CeRechargeModalProps {
  visible: boolean
  onClose: () => void
  onPaySuccess?: () => void
}

const CeRechargeModal: React.FC<CeRechargeModalProps> = (props) => {
  const { visible, onClose, onPaySuccess } = props
  const { t, i18n } = useI18nNamespaces(['layout'])
  const numberLocale = getNumberLocale(i18n.language)

  const [view, setView] = useState<ViewType>('plan')
  const [selectedPackageId, setSelectedPackageId] = useState<string>()
  const [customAmount, setCustomAmount] = useState(0)
  const [payMethod, setPayMethod] = useState<PayMethod>()
  const [payStatus, setPayStatus] = useState<PayStatus>('loading')
  const [expireSeconds, setExpireSeconds] = useState(QR_EXPIRE_SECONDS)
  const [payTimeText, setPayTimeText] = useState('')
  const [failReason, setFailReason] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [estimateMode, setEstimateMode] = useState<EstimateMode>('task')

  const expireTimerRef = useRef<ReturnType<typeof setInterval>>()
  const pollTimerRef = useRef<ReturnType<typeof setInterval>>()
  const outTradeNoRef = useRef('')
  const fetchSeqRef = useRef(0)

  const scenario = SCENARIOS[estimateMode]
  const estimates = useMemo(
    () => buildEstimates(customAmount, estimateMode, numberLocale),
    [customAmount, estimateMode, numberLocale],
  )
  const tokenAmount = useMemo(() => customAmount * TOKEN_RATE, [customAmount])
  const canPay = customAmount > 0 && !!payMethod

  const clearExpireTimer = useMemoizedFn(() => {
    if (expireTimerRef.current) {
      clearInterval(expireTimerRef.current)
      expireTimerRef.current = undefined
    }
  })

  const clearPollTimer = useMemoizedFn(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = undefined
    }
  })

  const clearAllTimers = useMemoizedFn(() => {
    clearExpireTimer()
    clearPollTimer()
  })

  const resetPayRuntime = useMemoizedFn(() => {
    clearAllTimers()
    outTradeNoRef.current = ''
    setQrDataUrl('')
    setFailReason('')
    setPayTimeText('')
    setExpireSeconds(QR_EXPIRE_SECONDS)
  })

  const startUiCountdown = useMemoizedFn(() => {
    clearExpireTimer()
    setExpireSeconds(QR_EXPIRE_SECONDS)
    expireTimerRef.current = setInterval(() => {
      setExpireSeconds((prev) => {
        if (prev <= 1) {
          clearExpireTimer()
          setPayStatus((status) => (status === 'ready' ? 'expired' : status))
          return 0
        }
        return prev - 1
      })
    }, 1000)
  })

  const handleOrderPaid = useMemoizedFn((order?: API.PaymentOrderResponse) => {
    clearAllTimers()
    setPayTimeText(formatPayTimeFromUnix(order?.payTime))
    setFailReason('')
    setPayStatus('success')
    onPaySuccess?.()
  })

  const handleOrderFailed = useMemoizedFn((order?: API.PaymentOrderResponse) => {
    clearAllTimers()
    setFailReason(order?.failReason || t('CeUserMenu.payFailedDefault'))
    setPayStatus('failed')
  })

  const pollPaymentOrder = useMemoizedFn(async () => {
    const outTradeNo = outTradeNoRef.current
    if (!outTradeNo) return
    try {
      const order = await NetWorkApi<{ outTradeNo: string }, API.PaymentOrderResponse>({
        method: 'get',
        url: 'payment/order',
        params: { outTradeNo },
      })
      if (outTradeNoRef.current !== outTradeNo) return
      if (order?.status === 'paid') {
        handleOrderPaid(order)
      } else if (order?.status === 'failed') {
        handleOrderFailed(order)
      }
    } catch {
      // 轮询失败不打断扫码流程，等待下一轮
    }
  })

  const startOrderPolling = useMemoizedFn(() => {
    clearPollTimer()
    pollPaymentOrder()
    pollTimerRef.current = setInterval(() => {
      pollPaymentOrder()
    }, POLL_INTERVAL_MS)
  })

  const fetchPayQrcode = useMemoizedFn(async () => {
    if (!payMethod || customAmount <= 0) return

    const seq = ++fetchSeqRef.current
    clearAllTimers()
    outTradeNoRef.current = ''
    setQrDataUrl('')
    setFailReason('')
    setPayTimeText('')
    setPayStatus('loading')

    try {
      const moneyFen = Math.round(customAmount * 100)
      const res = await NetWorkApi<API.PayRequest, API.PaymentQrcodeResponse>({
        method: 'post',
        url: payMethod === 'alipay' ? 'alipay/qrcode' : 'wechatpay/qrcode',
        data: { money: moneyFen },
      })

      if (seq !== fetchSeqRef.current) return

      const codeUrl = res?.codeUrl
      const outTradeNo = res?.outTradeNo
      if (!codeUrl || !outTradeNo) {
        setPayStatus('loadError')
        return
      }

      const dataUrl = await QRCode.toDataURL(codeUrl, {
        margin: 1,
        width: 160,
        errorCorrectionLevel: 'M',
      })

      if (seq !== fetchSeqRef.current) return

      outTradeNoRef.current = outTradeNo
      setQrDataUrl(dataUrl)
      setPayStatus('ready')
      startUiCountdown()
      startOrderPolling()
    } catch {
      if (seq !== fetchSeqRef.current) return
      setPayStatus('loadError')
    }
  })

  useEffect(() => {
    if (!visible) {
      fetchSeqRef.current += 1
      resetPayRuntime()
      setView('plan')
      setSelectedPackageId(undefined)
      setCustomAmount(0)
      setPayMethod(undefined)
      setPayStatus('loading')
    }
  }, [visible, resetPayRuntime])

  useEffect(() => {
    return () => {
      fetchSeqRef.current += 1
      clearAllTimers()
    }
  }, [clearAllTimers])

  const handleSelectPackage = useMemoizedFn((pkg: TokenPackage) => {
    setSelectedPackageId(pkg.id)
    setCustomAmount(pkg.price)
  })

  const handleAmountChange = useMemoizedFn((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '')
    const next = raw === '' ? 0 : Math.min(Number(raw), 999999)
    setCustomAmount(next)
    const matched = TOKEN_PACKAGES.find((item) => item.price === next)
    setSelectedPackageId(matched?.id)
  })

  const handleGoPay = useMemoizedFn(() => {
    if (!canPay) return
    setView('pay')
    fetchPayQrcode()
  })

  const handleBackToPlan = useMemoizedFn(() => {
    fetchSeqRef.current += 1
    resetPayRuntime()
    setView('plan')
    setPayStatus('loading')
  })

  const handleRetryLoad = useMemoizedFn(() => {
    fetchPayQrcode()
  })

  const handleRefreshQr = useMemoizedFn(() => {
    fetchPayQrcode()
  })

  const handleRetryPay = useMemoizedFn(() => {
    fetchPayQrcode()
  })

  const payTitle = payMethod === 'alipay' ? t('CeUserMenu.payAlipayScan') : t('CeUserMenu.payWechatScan')
  const payMethodLabel = payMethod === 'alipay' ? t('CeUserMenu.alipay') : t('CeUserMenu.wechat')
  const appName = payMethod === 'alipay' ? t('CeUserMenu.payAppAlipay') : t('CeUserMenu.payAppWechat')

  const renderPayInstruction = () => {
    if (payStatus === 'loading') {
      return <div className={styles['pay-view-desc']}>{t('CeUserMenu.payQrLoading')}</div>
    }
    if (payStatus === 'loadError') {
      return (
        <div className={classNames(styles['pay-view-desc'], styles['pay-view-desc-error'])}>
          {t('CeUserMenu.payQrLoadError')}
        </div>
      )
    }
    if (payStatus === 'ready' || payStatus === 'expired') {
      return (
        <div className={styles['pay-view-desc']}>
          {t('CeUserMenu.payScanGuideBefore')}
          <span className={styles['pay-view-desc-em']}>{appName}</span>
          {t('CeUserMenu.payScanGuideBetween')}
          <span className={styles['pay-view-desc-em']}>{t('CeUserMenu.payScanAction')}</span>
          {t('CeUserMenu.payScanGuideAfter')}
        </div>
      )
    }
    return null
  }

  const renderQrArea = () => {
    if (payStatus === 'success' || payStatus === 'failed') return null

    return (
      <>
        <div
          className={classNames(styles['qr-box'], {
            [styles['qr-box-card']]: payStatus === 'ready' || payStatus === 'expired',
            [styles['qr-box-illust']]: payStatus === 'loading' || payStatus === 'loadError',
          })}
        >
          {payStatus === 'loading' && (
            <div className={styles['qr-illust']}>
              <QrLoadingIcon />
            </div>
          )}

          {payStatus === 'loadError' && (
            <div className={styles['qr-illust']}>
              <QrLoadErrorIcon />
            </div>
          )}

          {(payStatus === 'ready' || payStatus === 'expired') && (
            <>
              <div className={classNames(styles['qr-code'], { [styles['qr-code-dimmed']]: payStatus === 'expired' })}>
                {qrDataUrl ? <img className={styles['qr-svg']} src={qrDataUrl} alt="payment-qrcode" /> : null}
              </div>
              {payStatus === 'expired' && (
                <button type="button" className={styles['qr-expired-mask']} onClick={handleRefreshQr}>
                  <span className={styles['qr-refresh-icon']}>
                    <OutlineRefreshIcon />
                  </span>
                  <span className={styles['qr-refresh-text']}>{t('CeUserMenu.refreshQrcode')}</span>
                </button>
              )}
            </>
          )}
        </div>

        {payStatus === 'ready' && (
          <div className={styles['qr-expire-tip']}>
            <span className={styles['qr-expire-tip-time']}>{expireSeconds}s</span>
            <span className={styles['qr-expire-tip-text']}>{t('CeUserMenu.qrExpireSoon')}</span>
          </div>
        )}
        {payStatus === 'expired' && <div className={styles['qr-expired-tip']}>{t('CeUserMenu.qrExpiredTip')}</div>}

        {payStatus === 'loadError' && (
          <YakitButton
            type="outline2"
            size="large"
            className={styles['retry-btn']}
            icon={<OutlineRefreshIcon />}
            onClick={handleRetryLoad}
          >
            {t('CeUserMenu.retry')}
          </YakitButton>
        )}
      </>
    )
  }

  const renderResultArea = () => {
    if (payStatus === 'success') {
      return (
        <div className={styles['result-view']}>
          <div className={styles['result-header']}>
            <div className={styles['result-badge']}>
              <PaySuccessIcon />
            </div>
            <div className={styles['result-title']}>{t('CeUserMenu.paySuccess')}</div>
          </div>
          <div className={styles['result-detail']}>
            <div className={styles['result-detail-row']}>
              <span className={styles['result-detail-label']}>{t('CeUserMenu.payMethodLabel')}</span>
              <span className={styles['result-detail-value']}>{payMethodLabel}</span>
            </div>
            <div className={styles['result-detail-line']} />
            <div className={styles['result-detail-row']}>
              <span className={styles['result-detail-label']}>{t('CeUserMenu.payTimeLabel')}</span>
              <span className={styles['result-detail-value']}>{payTimeText}</span>
            </div>
            <div className={styles['result-detail-line']} />
            <div className={styles['result-detail-row']}>
              <span className={styles['result-detail-label']}>{t('CeUserMenu.payAmountLabel')}</span>
              <span className={styles['result-detail-value']}>¥{customAmount}</span>
            </div>
            <div className={styles['result-detail-line']} />
            <div className={styles['result-detail-row']}>
              <span className={styles['result-detail-label']}>{t('CeUserMenu.payProductLabel')}</span>
              <span className={styles['result-detail-value']}>{tokenAmount}M Token</span>
            </div>
          </div>
          <YakitButton type="outline2" size="large" onClick={onClose}>
            {t('CeUserMenu.close')}
          </YakitButton>
        </div>
      )
    }

    if (payStatus === 'failed') {
      return (
        <div className={styles['result-view']}>
          <div className={styles['result-header']}>
            <div className={styles['result-badge']}>
              <PayFailedIcon />
            </div>
            <div className={styles['result-title']}>{t('CeUserMenu.payFailed')}</div>
          </div>
          <div className={styles['result-fail-reason']}>{failReason}</div>
          <YakitButton type="outline2" size="large" icon={<OutlineRefreshIcon />} onClick={handleRetryPay}>
            {t('CeUserMenu.retry')}
          </YakitButton>
        </div>
      )
    }

    return null
  }

  return (
    <YakitModal
      wrapClassName={styles['recharge-modal']}
      visible={visible}
      type="white"
      width={860}
      footer={null}
      destroyOnClose
      centered
      hiddenHeader
      bodyStyle={{ padding: 0 }}
      onCancel={onClose}
    >
      <div className={styles['recharge-body']}>
        <div className={styles['recharge-right']}>
          {view === 'plan' ? (
            <>
              <div className={styles['right-header']}>
                <div className={styles['right-header-title']}>
                  <OutlineCreditcardIcon />
                  <span>{t('CeUserMenu.recharge')}</span>
                </div>
              </div>

              <div className={styles['recharge-content']}>
                <div className={styles['package-section']}>
                  <div className={styles['section-title']}>{t('CeUserMenu.tokenPackageRecommend')}</div>
                  <div className={styles['package-grid']}>
                    {TOKEN_PACKAGES.map((pkg) => (
                      <div
                        key={pkg.id}
                        className={classNames(styles['package-card'], {
                          [styles['package-card-selected']]: selectedPackageId === pkg.id,
                        })}
                        onClick={() => handleSelectPackage(pkg)}
                      >
                        <span className={styles['package-price']}>¥{pkg.price}</span>
                        <span className={styles['package-unit']}>RMB</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles['amount-box']}>
                  <div className={styles['amount-box-header']}>
                    <span className={styles['amount-label']}>{t('CeUserMenu.amount')}</span>
                  </div>
                  <div className={styles['amount-box-body']}>
                    <div className={styles['amount-input-wrap']}>
                      <span className={styles['amount-currency']}>¥</span>
                      <input
                        className={styles['amount-input']}
                        value={customAmount || ''}
                        placeholder="0"
                        inputMode="numeric"
                        onChange={handleAmountChange}
                      />
                    </div>
                  </div>
                </div>
                <div className={styles['pay-method-section']}>
                  <div className={styles['section-title']}>{t('CeUserMenu.selectPayMethod')}</div>
                  <div className={styles['pay-method-grid']}>
                    <div
                      className={classNames(styles['pay-method-card'], {
                        [styles['pay-method-card-selected']]: payMethod === 'alipay',
                      })}
                      onClick={() => setPayMethod('alipay')}
                    >
                      <AlipayIcon />
                      <span>{t('CeUserMenu.alipay')}</span>
                    </div>
                    <div
                      className={classNames(styles['pay-method-card'], {
                        [styles['pay-method-card-selected']]: payMethod === 'wechat',
                      })}
                      onClick={() => setPayMethod('wechat')}
                    >
                      <WechatIcon />
                      <span>{t('CeUserMenu.wechat')}</span>
                    </div>
                  </div>
                </div>
              </div>
              <YakitButton
                type="primary"
                size="large"
                className={styles['pay-action']}
                disabled={!canPay}
                onClick={handleGoPay}
              >
                {t('CeUserMenu.goPay')}
              </YakitButton>
            </>
          ) : (
            <>
              <div className={styles['right-header']}>
                <button type="button" className={styles['right-header-back']} onClick={handleBackToPlan}>
                  <OutlineChevronleftIcon />
                  <span>{t('CeUserMenu.backToPayPlan')}</span>
                </button>
              </div>

              {payStatus === 'success' || payStatus === 'failed' ? (
                renderResultArea()
              ) : (
                <div className={styles['pay-view']}>
                  <div className={styles['pay-view-title']}>{payTitle}</div>
                  {renderPayInstruction()}
                  {renderQrArea()}
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles['recharge-left']}>
          <button type="button" className={styles['model-list-close']} onClick={onClose}>
            <OutlineXIcon />
          </button>
          <div className={styles['estimate-toolbar']}>
            <YakitRadioButtons
              size="small"
              value={estimateMode}
              onChange={(e) => setEstimateMode(e.target.value as EstimateMode)}
              options={[
                { label: SCENARIOS.task.name, value: 'task' },
                { label: SCENARIOS.coding.name, value: 'coding' },
              ]}
            />
          </div>
          <div className={styles['estimate-scenario']}>
            <div className={styles['estimate-scenario-en']}>{scenario.englishName}</div>
            <div className={styles['estimate-scenario-desc']}>{t(scenario.descriptionKey)}</div>
            <div className={styles['estimate-tags']}>
              <span className={styles['estimate-tag']}>
                {t('CeUserMenu.cacheHitRateTag', { rate: scenario.cacheHitRate * 100 })}
              </span>
              <span className={styles['estimate-tag']}>
                {t('CeUserMenu.inputOutputRatioTag', { ratio: scenario.inputOutputRatio })}
              </span>
              <span className={styles['estimate-tag']}>
                {t('CeUserMenu.avgPerInteraction', { tokens: scenario.tokensPerInteraction / 1000 })}
              </span>
            </div>
          </div>
          <div className={styles['estimate-list']}>
            {estimates.map(({ model, tokenMillions, interactions, outcomes }) => (
              <section key={model.id} className={styles['estimate-card']}>
                <div className={styles['estimate-card-header']}>
                  <div className={styles['estimate-card-title']}>
                    <span className={styles['estimate-dot']} style={{ backgroundColor: model.accent }} />
                    <span className={styles['estimate-name']}>{model.name}</span>
                  </div>
                  <span className={styles['estimate-label']}>{t(model.labelKey)}</span>
                </div>
                <div className={styles['estimate-main']}>
                  <div>
                    <div className={styles['estimate-main-caption']}>{t('CeUserMenu.inputPlusOutput')}</div>
                    <div className={styles['estimate-main-value']}>
                      {formatTokenMillions(tokenMillions)}
                      <span className={styles['estimate-main-unit']}>M Tokens</span>
                    </div>
                  </div>
                  <div className={styles['estimate-interactions']}>
                    <div>
                      {interactions.toLocaleString(numberLocale)} {t('CeUserMenu.timesUnit')}
                    </div>
                    <div className={styles['estimate-interactions-sub']}>
                      {t('CeUserMenu.kInteraction', { tokens: scenario.tokensPerInteraction / 1000 })}
                    </div>
                  </div>
                </div>
                <div className={styles['estimate-outcomes']}>
                  {outcomes.map((outcome) => {
                    const outcomeLabel = t(outcome.labelKey)
                    const outcomeUnit = t(outcome.unitKey)
                    return (
                      <div key={outcome.labelKey} className={styles['estimate-outcome']}>
                        <div className={styles['estimate-outcome-value']}>
                          {outcome.value}
                          {!!outcomeUnit && <span className={styles['estimate-outcome-unit']}>{outcomeUnit}</span>}
                        </div>
                        <div className={styles['estimate-outcome-label']} title={outcomeLabel}>
                          {outcomeLabel}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <dl className={styles['estimate-prices']}>
                  {[
                    [t('CeUserMenu.input'), model.inputRmb],
                    [t('CeUserMenu.cache'), model.cachedInputRmb],
                    [t('CeUserMenu.output'), model.outputRmb],
                  ].map(([label, value]) => (
                    <div key={label as string} className={styles['estimate-price-item']}>
                      <dt>{t('CeUserMenu.pricePer1M', { label })}</dt>
                      <dd>RMB {formatUnitPrice(value as number)}</dd>
                    </div>
                  ))}
                </dl>
                <div className={styles['estimate-footnote']}>
                  {t(model.sourceLabelKey)} · {t(model.noteKey)}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </YakitModal>
  )
}

export default CeRechargeModal
