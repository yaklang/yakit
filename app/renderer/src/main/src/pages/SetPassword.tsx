import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { Form, Input, Button } from 'antd'
import { warn, failed, success } from '@/utils/notification'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { NetWorkApi } from '@/services/fetch'
import { API } from '@/services/swagger/resposeType'
import { loginOut, refreshToken } from '@/utils/login'
import { UserInfoProps, yakitDynamicStatus } from '@/store'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNetwork, yakitUILayout } from '@/services/electronBridge'

export interface SetPasswordProps {
  userInfo: UserInfoProps
  onCancel: () => any
}

const layout = {
  labelCol: { span: 7 },
  wrapperCol: { span: 17 },
}

const SetPassword: React.FC<SetPasswordProps> = (props) => {
  const { t } = useI18nNamespaces(['core', 'yakitUi'])
  const [form] = Form.useForm()
  const { userInfo, onCancel } = props
  const { getFieldValue } = form
  const [loading, setLoading] = useState<boolean>(false)
  const { dynamicStatus } = yakitDynamicStatus()
  const onFinish = useMemoizedFn((values: API.UpUserInfoRequest) => {
    const { old_pwd, pwd, confirm_pwd } = values
    if (getFieldValue('confirm_pwd') !== getFieldValue('pwd')) {
      warn(t('SetPassword.passwordMismatch'))
    } else {
      NetWorkApi<API.UpUserInfoRequest, API.ActionSucceeded>({
        method: 'post',
        url: 'urm/up/userinfo',
        data: {
          old_pwd,
          pwd,
          confirm_pwd,
        },
      })
        .then((result) => {
          if (result.ok) {
            success(t('SetPassword.updateSuccess'))
            onCancel()
            if (dynamicStatus.isDynamicStatus) {
              yakitNetwork.logoutDynamicControl({ loginOut: true })
            } else {
              loginOut(userInfo)
              yakitUILayout.requestSignOut()
            }
          }
        })
        .catch((err) => {
          setLoading(false)
          failed(t('SetPassword.updateFailed', { error: err }))
        })
        .finally(() => {})
    }
  })
  // 判断输入内容是否通过
  const judgePass = () => [
    {
      validator: (_, value) => {
        let re =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.<>?;:\[\]{}~!@#$%^&*()_+-="])[A-Za-z\d.<>?;:\[\]{}~!@#$%^&*()_+-="]{8,20}/
        if (re.test(value)) {
          return Promise.resolve()
        } else {
          return Promise.reject(t('SetPassword.passwordRule'))
        }
      },
    },
  ]

  return (
    <div>
      <Form {...layout} form={form} onFinish={onFinish}>
        <Form.Item
          name="old_pwd"
          label={t('SetPassword.oldPassword')}
          rules={[{ required: true, message: t('YakitForm.requiredField') }]}
        >
          <YakitInput.Password placeholder={t('SetPassword.inputOldPassword')} allowClear />
        </Form.Item>
        <Form.Item
          name="pwd"
          label={t('SetPassword.newPassword')}
          rules={[{ required: true, message: t('YakitForm.requiredField') }, ...judgePass()]}
        >
          <YakitInput.Password placeholder={t('SetPassword.inputNewPassword')} allowClear />
        </Form.Item>
        <Form.Item
          name="confirm_pwd"
          label={t('SetPassword.confirmPassword')}
          rules={[{ required: true, message: t('YakitForm.requiredField') }, ...judgePass()]}
        >
          <YakitInput.Password placeholder={t('SetPassword.inputConfirmPassword')} allowClear />
        </Form.Item>
        <div style={{ textAlign: 'center' }}>
          <YakitButton type="primary" htmlType="submit" loading={loading}>
            {t('SetPassword.updatePassword')}
          </YakitButton>
        </div>
      </Form>
    </div>
  )
}

export default SetPassword
