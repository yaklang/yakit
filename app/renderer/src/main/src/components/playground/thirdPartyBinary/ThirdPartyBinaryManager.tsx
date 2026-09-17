import { ipc } from '@/services/ipc'
import type React from 'react'
import { useEffect, useState, useRef } from 'react'
import { AutoCard } from '@/components/AutoCard'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { Table } from 'antd'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { AutoSpin } from '@/components/AutoSpin'
import { Form, Space, Typography, Row, Col, Divider, Progress } from 'antd'
import { useMemoizedFn, useGetState } from 'ahooks'
import { randomString } from '@/utils/randomUtil'
import { failed, success, info } from '@/utils/notification'
import type { ExecResult } from '@/pages/invoker/schema'
import { Uint8ArrayToString } from '@/utils/str'
import styles from './ThirdPartyBinaryManager.module.scss'
import { DownloadOutlined, PlayOutlined, TrashOutlined, RefreshOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitRoute } from '@/enums/yakitRoute'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const { Text } = Typography

export interface ThirdPartyBinary {
  Name: string
  Description: string
  InstallPath: string
}

export interface ThirdPartyBinaryManagerProps {}

// Status component for each binary
const BinaryStatusTag: React.FC<{ binary: ThirdPartyBinary; checkBinaryReady: (name: string) => Promise<boolean> }> = ({
  binary,
  checkBinaryReady,
}) => {
  const { t } = useI18nNamespaces(['components'])
  const [ready, setReady] = useState<boolean | null>(null)

  useEffect(() => {
    if (binary.InstallPath) {
      checkBinaryReady(binary.Name).then(setReady)
    }
  }, [binary, checkBinaryReady])

  if (!binary.InstallPath) {
    return <YakitTag color="red">{t('playground.ThirdPartyBinaryManager.notInstalled')}</YakitTag>
  }

  if (ready === null) {
    return <YakitTag>{t('playground.ThirdPartyBinaryManager.checking')}</YakitTag>
  }

  return ready ? (
    <YakitTag color="green">{t('playground.ThirdPartyBinaryManager.ready')}</YakitTag>
  ) : (
    <YakitTag color="warning">{t('playground.ThirdPartyBinaryManager.abnormal')}</YakitTag>
  )
}

export const ThirdPartyBinaryManager: React.FC<ThirdPartyBinaryManagerProps> = (props) => {
  const { t } = useI18nNamespaces(['components', 'yakitUi'])
  const [binaries, setBinaries] = useState<ThirdPartyBinary[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshLoading, setRefreshLoading] = useState(false)

  // Install modal state
  const [installVisible, setInstallVisible] = useState(false)
  const [installForm] = Form.useForm()
  const [installLoading, setInstallLoading] = useState(false)
  const [installToken, setInstallToken] = useState(randomString(50))
  const [installProgress, setInstallProgress] = useState(0)
  const [installLogs, setInstallLogs, getInstallLogs] = useGetState<string[]>([])

  // Start modal state
  const [startVisible, setStartVisible] = useState(false)
  const [startForm] = Form.useForm()
  const [selectedBinary, setSelectedBinary] = useState<ThirdPartyBinary | null>(null)

  // Fetch binaries list
  const fetchBinaries = useMemoizedFn(() => {
    setRefreshLoading(true)
    ipc
      .invoke('grpc', 'ListThirdPartyBinary', {})
      .then((res) => {
        setBinaries(res.Binaries || [])
      })
      .catch((err) => {
        failed(t('playground.ThirdPartyBinaryManager.fetchListFailed', { error: String(err) }))
      })
      .finally(() => {
        setRefreshLoading(false)
      })
  })

  // Check if binary is ready
  const checkBinaryReady = useMemoizedFn(async (name: string) => {
    try {
      const res = await ipc.invoke('grpc', 'IsThirdPartyBinaryReady', { Name: name })
      return res.IsReady
    } catch (err) {
      return false
    }
  })

  const installControllerRef = useRef<AbortController>()
  const startsRef = useRef(new Map<string, AbortController>())
  useEffect(
    () => () => {
      installControllerRef.current?.abort()
      for (const controller of startsRef.current.values()) controller.abort()
      startsRef.current.clear()
    },
    [],
  )
  const handleInstall = useMemoizedFn(async () => {
    installControllerRef.current?.abort()
    const controller = new AbortController()
    installControllerRef.current = controller
    const onError = (error: unknown) => {
      if (controller.signal.aborted) return
      failed(t('YakitNotification.installFailed', { error: String(error) }))
      setInstallLoading(false)
    }
    try {
      const { name, proxy, force } = await installForm.validateFields()
      if (controller.signal.aborted) return
      setInstallProgress(0)
      setInstallLogs([])
      setInstallLoading(true)
      info(t('playground.ThirdPartyBinaryManager.installStarting', { name }))
      await ipc.openStream(
        'grpc',
        'InstallThirdPartyBinary',
        { Name: name, Proxy: proxy || '', Force: force || false },
        {
          token: randomString(50),
          signal: controller.signal,
          onData(data) {
            if (controller.signal.aborted) return
            if (data.Progress > 0) setInstallProgress(Math.ceil(data.Progress))
            else if (data.IsMessage) setInstallLogs((logs) => [...logs, Uint8ArrayToString(data.Message)])
          },
          onError,
          onEnd() {
            if (controller.signal.aborted) return
            info('[InstallThirdPartyBinary] finished')
            setInstallLoading(false)
            fetchBinaries()
            setInstallVisible(false)
            installForm.resetFields()
          },
        },
      )
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      onError(error)
    }
  })

  // Uninstall binary
  const handleUninstall = useMemoizedFn((name: string) => {
    setLoading(true)
    ipc
      .invoke('grpc', 'UninstallThirdPartyBinary', { Name: name })
      .then(() => {
        success(t('playground.ThirdPartyBinaryManager.uninstallSuccess', { name }))
        fetchBinaries()
      })
      .catch((err) => {
        failed(t('YakitNotification.uninstallFailed', { error: String(err) }))
      })
      .finally(() => {
        setLoading(false)
      })
  })

  const handleStart = useMemoizedFn(async () => {
    const binary = selectedBinary
    if (!binary) return
    startsRef.current.get(binary.Name)?.abort()
    const controller = new AbortController()
    startsRef.current.set(binary.Name, controller)
    const onError = (error: unknown) => {
      if (controller.signal.aborted) return
      startsRef.current.delete(binary.Name)
      failed(t('YakitNotification.startFailed', { error: String(error) }))
    }
    try {
      const { args } = await startForm.validateFields()
      if (controller.signal.aborted) return
      await ipc.openStream(
        'grpc',
        'StartThirdPartyBinary',
        { Name: binary.Name, Args: args ? args.split(' ').filter((arg: string) => arg.trim()) : [] },
        {
          token: randomString(50),
          signal: controller.signal,
          onError,
          onEnd() {
            if (!controller.signal.aborted) startsRef.current.delete(binary.Name)
          },
        },
      )
      if (controller.signal.aborted || startsRef.current.get(binary.Name) !== controller) return
      info(t('playground.ThirdPartyBinaryManager.startSuccess', { name: binary.Name }))
      setStartVisible(false)
      startForm.resetFields()
      setSelectedBinary(null)
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      onError(error)
    }
  })
  const cancelInstall = useMemoizedFn(() => {
    installControllerRef.current?.abort()
    setInstallLoading(false)
  })

  // Open start modal
  const openStartModal = useMemoizedFn((binary: ThirdPartyBinary) => {
    setSelectedBinary(binary)
    setStartVisible(true)
    startForm.resetFields()
  })

  useEffect(() => {
    fetchBinaries()
  }, [])

  const columns = [
    {
      title: t('playground.ThirdPartyBinaryManager.name'),
      dataIndex: 'Name',
      key: 'Name',
      width: 150,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: t('playground.ThirdPartyBinaryManager.description'),
      dataIndex: 'Description',
      key: 'Description',
      ellipsis: true,
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
    {
      title: t('playground.ThirdPartyBinaryManager.installPath'),
      dataIndex: 'InstallPath',
      key: 'InstallPath',
      width: 200,
      ellipsis: true,
      render: (text: string) =>
        text || <Text type="secondary">{t('playground.ThirdPartyBinaryManager.notInstalled')}</Text>,
    },
    {
      title: t('playground.ThirdPartyBinaryManager.status'),
      key: 'status',
      width: 100,
      render: (_: any, record: ThirdPartyBinary) => (
        <BinaryStatusTag binary={record} checkBinaryReady={checkBinaryReady} />
      ),
    },
    {
      title: t('YakitTable.action'),
      key: 'action',
      width: 150,
      render: (_: any, record: ThirdPartyBinary) => (
        <Space>
          {record.InstallPath ? (
            <>
              <YakitButton
                type="primary"
                size="small"
                icon={<PlayOutlined color="currentColor" />}
                onClick={() => openStartModal(record)}
                disabled={loading}
              >
                {t('YakitButton.start')}
              </YakitButton>
              <YakitButton
                danger
                size="small"
                icon={<TrashOutlined color="currentColor" />}
                onClick={() => handleUninstall(record.Name)}
                disabled={loading}
              >
                {t('YakitButton.uninstall')}
              </YakitButton>
            </>
          ) : (
            <YakitButton
              type="primary"
              size="small"
              icon={<DownloadOutlined color="currentColor" />}
              onClick={() => {
                setInstallVisible(true)
                installForm.setFieldsValue({ name: record.Name })
              }}
              disabled={loading}
            >
              {t('YakitButton.install')}
            </YakitButton>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className={styles['third-party-binary-manager']}>
      <AutoCard
        title={t('playground.ThirdPartyBinaryManager.title')}
        size="small"
        extra={
          <Space>
            <YakitButton
              type="primary"
              icon={<DownloadOutlined color="currentColor" />}
              onClick={() => setInstallVisible(true)}
              disabled={loading}
            >
              {t('playground.ThirdPartyBinaryManager.installNewTool')}
            </YakitButton>
            <YakitButton
              icon={<RefreshOutlined color="currentColor" />}
              onClick={fetchBinaries}
              loading={refreshLoading}
            >
              {t('YakitButton.refresh')}
            </YakitButton>
          </Space>
        }
        bodyStyle={{ padding: 8 }}
      >
        <AutoSpin spinning={loading}>
          <Table
            dataSource={binaries}
            columns={columns}
            rowKey="Name"
            pagination={{
              pageSize: 10,
              simple: true,
              size: 'small',
            }}
            size="small"
          />
        </AutoSpin>
      </AutoCard>

      {/* Install Modal */}
      <YakitModal
        title={t('playground.ThirdPartyBinaryManager.installModalTitle')}
        open={installVisible}
        onCancel={() => {
          if (!installLoading) {
            setInstallVisible(false)
            installForm.resetFields()
          }
        }}
        width={500}
        footer={[
          <YakitButton
            key="cancel"
            onClick={() => {
              if (installLoading) {
                cancelInstall()
              } else {
                setInstallVisible(false)
                installForm.resetFields()
              }
            }}
          >
            {installLoading ? t('playground.ThirdPartyBinaryManager.cancelInstall') : t('YakitButton.cancel')}
          </YakitButton>,
          <YakitButton
            key="install"
            type="primary"
            loading={installLoading}
            onClick={handleInstall}
            disabled={installLoading}
          >
            {installLoading
              ? t('playground.ThirdPartyBinaryManager.installing')
              : t('playground.ThirdPartyBinaryManager.startInstall')}
          </YakitButton>,
        ]}
        getContainer={
          document.getElementById(`main-operator-page-body-${YakitRoute.Beta_DebugMonacoEditor}`) || undefined
        }
      >
        {installLoading ? (
          <div>
            <Progress
              percent={installProgress}
              format={(percent) => t('YakitProgress.completedPercent', { percent: percent ?? 0 })}
              style={{ marginBottom: 16 }}
            />
            <div
              style={{
                maxHeight: 200,
                overflow: 'auto',
                backgroundColor: 'var(--Colors-Use-Neutral-Bg)',
                padding: 8,
                borderRadius: 4,
                fontSize: 12,
                fontFamily: 'monospace',
              }}
            >
              {installLogs.map((log, index) => (
                <div key={index} style={{ marginBottom: 4 }}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Form form={installForm} layout="vertical">
            <Form.Item
              label={t('playground.ThirdPartyBinaryManager.toolName')}
              name="name"
              rules={[{ required: true, message: t('playground.ThirdPartyBinaryManager.enterToolName') }]}
            >
              <YakitInput placeholder={t('playground.ThirdPartyBinaryManager.enterToolNamePlaceholder')} />
            </Form.Item>

            <Form.Item label={t('playground.ThirdPartyBinaryManager.proxySettings')} name="proxy">
              <YakitInput placeholder={t('playground.ThirdPartyBinaryManager.proxyPlaceholder')} />
            </Form.Item>

            <Form.Item
              label={t('playground.ThirdPartyBinaryManager.forceReinstall')}
              name="force"
              valuePropName="checked"
            >
              <YakitSwitch />
            </Form.Item>
          </Form>
        )}
      </YakitModal>

      {/* Start Modal */}
      <YakitModal
        title={t('playground.ThirdPartyBinaryManager.startModalTitle', { name: selectedBinary?.Name || '' })}
        open={startVisible}
        onCancel={() => {
          setStartVisible(false)
          startForm.resetFields()
          setSelectedBinary(null)
        }}
        width={500}
        footer={[
          <YakitButton
            key="cancel"
            onClick={() => {
              setStartVisible(false)
              startForm.resetFields()
              setSelectedBinary(null)
            }}
          >
            {t('YakitButton.cancel')}
          </YakitButton>,
          <YakitButton key="start" type="primary" onClick={handleStart}>
            {t('YakitButton.start_execution')}
          </YakitButton>,
        ]}
      >
        <Form form={startForm} layout="vertical">
          <Form.Item label={t('playground.ThirdPartyBinaryManager.commandLineArgs')} name="args">
            <YakitInput placeholder={t('playground.ThirdPartyBinaryManager.commandLineArgsPlaceholder')} />
          </Form.Item>

          {selectedBinary && (
            <div>
              <Divider />
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>{t('playground.ThirdPartyBinaryManager.toolName')}: </Text>
                  <br />
                  <Text>{selectedBinary.Name}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>{t('playground.ThirdPartyBinaryManager.installPath')}: </Text>
                  <br />
                  <Text type="secondary" ellipsis>
                    {selectedBinary.InstallPath}
                  </Text>
                </Col>
              </Row>
              <Row style={{ marginTop: 8 }}>
                <Col span={24}>
                  <Text strong>{t('playground.ThirdPartyBinaryManager.description')}: </Text>
                  <br />
                  <Text type="secondary">{selectedBinary.Description}</Text>
                </Col>
              </Row>
            </div>
          )}
        </Form>
      </YakitModal>
    </div>
  )
}
