import { ipc } from '@/services/ipc'
import { failed } from '@/utils/notification'
import type React from 'react'
import { useEffect, useState } from 'react'
import { Col, Row } from 'antd'
import { YakitPageHeader } from '../../components/YakitPageHeader'
import { YakEditor } from '../../utils/editors'

export interface AnalyzerPageProp {
  isHttps: boolean
  request: string
  response: string
}

export const AnalyzerPage: React.FC<AnalyzerPageProp> = (props) => {
  useEffect(() => {
    const controller = new AbortController()
    void ipc
      .invoke(
        'grpc',
        'HTTPRequestAnalyzer',
        {
          IsHTTPS: props.isHttps,
          Request: props.request,
          Response: props.response,
        },
        { signal: controller.signal },
      )
      .catch((error) => {
        if (!controller.signal.aborted) failed(String(error))
      })
    return () => controller.abort()
  }, [props.isHttps, props.request, props.response])

  return (
    <div>
      <YakitPageHeader title={'HTTP 模糊测试分析器'} />
      <Row gutter={8}>
        <Col span={12}>
          <div style={{ height: 500 }}>
            <YakEditor value={props.request} readOnly={true} />
          </div>
        </Col>
        <Col span={12}>
          <div style={{ height: 500 }}>
            <YakEditor value={props.response} readOnly={true} />
          </div>
        </Col>
      </Row>
    </div>
  )
}
