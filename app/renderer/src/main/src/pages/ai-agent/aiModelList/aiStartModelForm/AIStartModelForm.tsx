import React, { useEffect, useRef, useState } from 'react'
import { Form } from 'antd'
import { useCreation, useMemoizedFn } from 'ahooks'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import styles from './AIStartModelForm.module.scss'
import { yakitNotify } from '@/utils/notification'
import { ipc } from '@/services/ipc'
import type { StartLocalModelRequest } from '../../type/aiModel'
import type { AIStartModelFormProps } from './AIStartModelFormType'

export const AIStartModelForm: React.FC<AIStartModelFormProps> = React.memo((props) => {
  const { item, token, signal, onSuccess } = props
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)
  const [form] = Form.useForm<Omit<StartLocalModelRequest, 'token'>>()
  useEffect(() => {
    mountedRef.current = true
    // The list item owns startup, so closing this form only detaches its UI.
    return () => {
      mountedRef.current = false
    }
  }, [])
  const handleSubmit = useMemoizedFn(async () => {
    const value = await form.validateFields()
    setLoading(true)
    const onError = (error: unknown) => {
      if (!mountedRef.current || signal.aborted) return
      yakitNotify('error', `[StartLocalModel] error: ${error}`)
      setLoading(false)
    }
    try {
      await ipc.openStream('grpc', 'StartLocalModel', value, {
        token,
        signal,
        onError,
        onEnd() {
          if (!mountedRef.current || signal.aborted) return
          setLoading(false)
          onSuccess()
        },
      })
    } catch (error) {
      onError(error)
    }
  })
  const initialValues = useCreation(() => {
    return {
      ModelName: item.Name,
      Host: '127.0.0.1',
      Port: item.DefaultPort || 8080,
    }
  }, [])
  return (
    <div>
      <Form
        form={form}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
        initialValues={initialValues}
        className={styles['ai-start-model-form']}
      >
        <Form.Item label="模型名称" name="ModelName">
          <YakitInput disabled />
        </Form.Item>

        <Form.Item label="主机地址" name="Host">
          <YakitInput />
        </Form.Item>

        <Form.Item label="端口" name="Port">
          <YakitInputNumber min={1} max={65535} />
        </Form.Item>
      </Form>
      <div className={styles['button-group']}>
        <YakitButton type="primary" htmlType="submit" loading={loading} onClick={handleSubmit}>
          立即启动
        </YakitButton>
      </div>
    </div>
  )
})
