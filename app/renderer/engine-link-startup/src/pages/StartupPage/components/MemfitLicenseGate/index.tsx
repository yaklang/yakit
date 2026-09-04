import React, { useEffect, useRef, useState } from 'react'
import { Spin } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { yakitClipboard, yakitLicense } from '@/utils/electronBridge'
import { yakitNotify } from '@/utils/notification'
import memfitLogo from '@/assets/memfitHasName.png'
import styles from './MemfitLicenseGate.module.scss'

interface MemfitLicenseGateProps {
  onVerified: () => Promise<unknown>
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return '授权校验失败，请确认授权码与当前设备匹配后重试。'
}

export const MemfitLicenseGate: React.FC<MemfitLicenseGateProps> = ({ onVerified }) => {
  const [licenseRequest, setLicenseRequest] = useState('')
  const [licenseActivation, setLicenseActivation] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const completingRef = useRef(false)

  const complete = async () => {
    if (completingRef.current) return
    completingRef.current = true
    try {
      await onVerified()
    } catch (completeError) {
      completingRef.current = false
      throw completeError
    }
  }

  useEffect(() => {
    let active = true

    const initialize = async () => {
      setLoading(true)
      setError('')
      try {
        const cachedValid = await yakitLicense.verifyCached().catch(() => false)
        if (!active) return
        if (cachedValid) {
          await complete()
          return
        }

        const requestCode = await yakitLicense.getRequestCode()
        if (!active) return
        setLicenseRequest(requestCode)
        if (!requestCode) setError('未能生成授权申请码，请重新连接引擎后重试。')
      } catch (initializeError) {
        if (active) setError(getErrorMessage(initializeError))
      } finally {
        if (active) setLoading(false)
      }
    }

    initialize()
    return () => {
      active = false
    }
  }, [])

  const handleCopy = async () => {
    if (!licenseRequest) return
    await yakitClipboard.setText(licenseRequest)
    yakitNotify('success', '申请码已复制')
  }

  const handleActivate = async () => {
    const normalized = licenseActivation.trim()
    if (!normalized) {
      setError('请输入授权码。')
      return
    }

    setLoading(true)
    setError('')
    try {
      await yakitLicense.activate(normalized)
      await complete()
    } catch (activateError) {
      setError(getErrorMessage(activateError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles['license-gate']}>
      <div className={styles['license-panel']}>
        <img className={styles['license-logo']} src={memfitLogo} alt="AI Senso" />
        <div className={styles['license-heading']}>
          <h1>产品授权</h1>
          <p>完成授权后才会加载 AI SenSo 工作台。</p>
        </div>

        <Spin spinning={loading} tip="正在验证授权…">
          <div className={styles['license-field']}>
            <div className={styles['license-label']}>
              <span>授权申请码</span>
              <YakitButton type="text" size="small" disabled={!licenseRequest} onClick={handleCopy}>
                复制申请码
              </YakitButton>
            </div>
            <YakitInput.TextArea value={licenseRequest} readOnly rows={5} isShowResize={false} />
          </div>

          <div className={styles['license-field']}>
            <div className={styles['license-label']}>授权码</div>
            <YakitInput.TextArea
              value={licenseActivation}
              rows={6}
              isShowResize={false}
              placeholder="请输入与当前设备申请码对应的授权码"
              onChange={(event) => setLicenseActivation(event.target.value)}
            />
          </div>

          {error && <div className={styles['license-error']}>{error}</div>}

          <YakitButton
            type="primary"
            size="large"
            className={styles['license-submit']}
            disabled={!licenseRequest}
            onClick={handleActivate}
          >
            验证并进入
          </YakitButton>
        </Spin>
      </div>
    </div>
  )
}
