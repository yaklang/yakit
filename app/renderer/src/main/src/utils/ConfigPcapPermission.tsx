import React, { useEffect, useState } from 'react'
import { Alert, Form, Tooltip } from 'antd'
import { yakitNotify } from '@/utils/notification'
import { getReleaseEditionName } from './envfile'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { QuestionMarkCircleIcon } from '@/assets/newIcon'
import { yakitHost, yakitSystem } from '@/services/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import i18n from '@/i18n/i18n'

const tOriginal = i18n.getFixedT(null, 'utils')
export interface ConfigPcapPermissionFormProp {
  onClose: () => any
}

export const ConfigPcapPermissionForm: React.FC<ConfigPcapPermissionFormProp> = (props) => {
  const { t, i18n } = useI18nNamespaces(['utils', 'yakitUi'])
  const [response, setResponse] = useState<{
    IsPrivileged: boolean
    Advice: string
    AdviceVerbose: string
  }>({ Advice: 'unknown', AdviceVerbose: t('ConfigPcapPermission.unavailable'), IsPrivileged: false })
  const [platform, setPlatform] = useState('')

  useEffect(() => {
    yakitHost
      .isPrivilegedForNetRaw({})
      .then(setResponse)
      .catch((e) => {
        yakitNotify('error', t('ConfigPcapPermission.fetchStatusFailed', { error: String(e) }))
      })
      .finally(() => {
        yakitSystem
          .fetchSystemAndArch()
          .then((e: string) => setPlatform(e))
          .catch((e) => {
            yakitNotify(
              'error',
              t('ConfigPcapPermission.fetchPlatformFailed', { name: getReleaseEditionName(), error: String(e) }),
            )
          })
      })
  }, [])

  const isWindows = platform.toLowerCase().startsWith('win')

  return (
    <Form
      style={{ paddingTop: 20 }}
      labelCol={{ span: 5 }}
      wrapperCol={{ span: 14 }}
      onSubmitCapture={(e) => {
        e.preventDefault()

        yakitHost
          .promotePermissionForUserPcap({})
          .then(() => {
            if (props?.onClose) {
              props.onClose()
            }
          })
          .catch((e) => {
            yakitNotify('error', t('ConfigPcapPermission.promoteFailed', { error: String(e) }))
          })
      }}
    >
      <Form.Item
        label={' '}
        colon={false}
        help={
          <>
            <Tooltip title={t('ConfigPcapPermission.tooltip')}>
              <YakitButton type={'text'} icon={<QuestionMarkCircleIcon />} />
            </Tooltip>
            {isWindows
              ? t('ConfigPcapPermission.windowsHint', { name: getReleaseEditionName() })
              : t('ConfigPcapPermission.unixHint')}
          </>
        }
      >
        {response.IsPrivileged ? (
          <Alert type={'success'} message={`您可以正常试用 SYN 扫描等功能，无需修复`} />
        ) : (
          <Alert type={'warning'} message={`当前引擎不具有网卡操作权限`} />
        )}
      </Form.Item>
      {response.IsPrivileged ? (
        <Form.Item label={' '} colon={false}>
          {props?.onClose && (
            <YakitButton
              onClick={() => {
                props.onClose()
              }}
            >
              {t('YakitButton.iKnow')}～
            </YakitButton>
          )}
        </Form.Item>
      ) : (
        <Form.Item label={' '} colon={false}>
          <YakitButton htmlType={'submit'} type={'primary'}>
            {t('ConfigPcapPermission.enablePcap')}
          </YakitButton>
          <Tooltip title={`${response.AdviceVerbose}: ${response.Advice}`}>
            <YakitButton type={'text'}>{t('YakitButton.manualFix')}</YakitButton>
          </Tooltip>
        </Form.Item>
      )}
    </Form>
  )
}

export const showPcapPermission = () => {
  const m = showYakitModal({
    type: 'white',
    title: tOriginal('ConfigPcapPermission.modalTitle'),
    width: '50%',
    content: (
      <ConfigPcapPermissionForm
        onClose={() => {
          m.destroy()
        }}
      />
    ),
    footer: null,
  })
}
