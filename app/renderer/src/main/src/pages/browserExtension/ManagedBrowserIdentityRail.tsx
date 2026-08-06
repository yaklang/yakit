import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChromeOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { showYakitModal, YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { yakitManagedBrowser } from '@/services/electronBridge'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { info, success, yakitFailed } from '@/utils/notification'
import styles from './ManagedBrowserIdentityRail.module.scss'

type ManagedProfileStatus = 'running' | 'detached' | 'stopped'
type ManagedProfileSlot = 'left' | 'right'

interface ManagedBrowserProfile {
  version: 1
  id: string
  slotHint: ManagedProfileSlot
  name: string
  status: ManagedProfileStatus
  userDataDir: string
  extensionPath: string
  chromePath: string
  startingUrl: string
  createdAt: number
  updatedAt: number
  lastStartedAt?: number
  installationId?: string
  pid?: number
}

interface ManagedBrowserProfileDefaults {
  version: 1
  chromePath: string
  extensionPath: string
  profileRoot: string
  maximumProfiles: number
}

interface ManagedBrowserIdentityRailProps {
  targetUrl?: string
  devices?: Array<{
    id: string
    name: string
    installationId: string
  }>
  onAssignIdentity?: (slot: ManagedProfileSlot, deviceId: string) => void
  onPreparePairing?: () => void | Promise<void>
  onRefreshDevices?: () => void | Promise<void>
}

interface ManagedProfileCreateFormProps {
  defaults?: ManagedBrowserProfileDefaults
  defaultSlot: ManagedProfileSlot
  defaultName: string
  targetUrl?: string
  onPreparePairing?: () => void | Promise<void>
  onCreated: () => void | Promise<void>
  onCancel: () => void
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : `${error}`
}

function pathTail(value: string): string {
  const normalized = value.replace(/[\\/]+$/, '')
  const segments = normalized.split(/[\\/]/)
  return segments[segments.length - 1] || normalized
}

function statusCopy(status: ManagedProfileStatus): {
  label: string
  detail: string
} {
  if (status === 'running') {
    return {
      label: '运行中',
      detail: '独立浏览器窗口正在运行',
    }
  }
  if (status === 'detached') {
    return {
      label: '上次会话',
      detail: '请在浏览器中关闭窗口后刷新',
    }
  }
  return {
    label: '已停止',
    detail: '登录态和站点数据仍保留在独立目录',
  }
}

const ManagedProfileCreateForm: React.FC<ManagedProfileCreateFormProps> = ({
  defaults,
  defaultSlot,
  defaultName,
  targetUrl,
  onPreparePairing,
  onCreated,
  onCancel,
}) => {
  const [name, setName] = useState(defaultName)
  const [startingUrl, setStartingUrl] = useState(targetUrl || '')
  const [extensionPath, setExtensionPath] = useState(defaults?.extensionPath || '')
  const [chromePath, setChromePath] = useState(defaults?.chromePath || '')
  const [creating, setCreating] = useState(false)

  const chooseExtension = async () => {
    const result = await handleOpenFileSystemDialog({
      title: '选择 Yakit Browser Agent Chromium 构建目录',
      defaultPath: extensionPath || undefined,
      properties: ['openDirectory'],
    })
    if (!result.canceled && result.filePaths[0]) setExtensionPath(result.filePaths[0])
  }

  const chooseChrome = async () => {
    const result = await handleOpenFileSystemDialog({
      title: '选择 Chromium 或 Chrome for Testing 可执行文件',
      defaultPath: chromePath || undefined,
      properties: ['openFile'],
    })
    if (!result.canceled && result.filePaths[0]) setChromePath(result.filePaths[0])
  }

  const create = async () => {
    if (!name.trim()) {
      yakitFailed('请输入测试身份名称')
      return
    }
    if (!extensionPath.trim()) {
      yakitFailed('请选择 Yakit Browser Agent 的 Chromium 构建目录')
      return
    }
    setCreating(true)
    let profile: ManagedBrowserProfile | undefined
    try {
      const created = await yakitManagedBrowser.create({
        slotHint: defaultSlot,
        name: name.trim(),
        extensionPath: extensionPath.trim(),
        chromePath: chromePath.trim() || undefined,
        startingUrl: startingUrl.trim() || undefined,
      })
      profile = created
      try {
        await yakitManagedBrowser.launch(created.id)
        await onPreparePairing?.()
        success(`${created.name} 已启动；完成插件安装与配对后即可选择该浏览器身份`)
      } catch (error) {
        info(`${created.name} 已创建，但浏览器尚未启动：${errorMessage(error)}`)
      }
      await onCreated()
      onCancel()
    } catch (error) {
      yakitFailed(errorMessage(error))
      if (profile) await onCreated()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={styles['create-form']}>
      <div className={styles['create-intro']}>
        <span className={styles['create-letter']}>{defaultSlot === 'left' ? 'A' : 'B'}</span>
        <span>
          <strong>创建完全独立的浏览器 Profile</strong>
          <small>Cookie、Storage、IndexedDB、Service Worker 与 HTTP Auth 都不会和另一个身份共用。</small>
        </span>
      </div>

      <label>
        <span>身份名称</span>
        <YakitInput
          value={name}
          maxLength={80}
          placeholder="例如：普通用户 / 管理员"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        <span>登录页面</span>
        <YakitInput
          value={startingUrl}
          placeholder="可选，例如 https://target.example/login"
          onChange={(event) => setStartingUrl(event.target.value)}
        />
      </label>
      <label>
        <span>插件目录</span>
        <div className={styles['path-input']}>
          <YakitInput
            value={extensionPath}
            placeholder="选择 .output/chrome-mv3-dev 或正式 Chromium 构建"
            onChange={(event) => setExtensionPath(event.target.value)}
          />
          <YakitButton type="outline2" icon={<FolderOpenOutlined />} onClick={() => void chooseExtension()}>
            选择
          </YakitButton>
        </div>
      </label>
      <label>
        <span>浏览器程序</span>
        <div className={styles['path-input']}>
          <YakitInput
            value={chromePath}
            placeholder="留空自动查找 Chromium"
            onChange={(event) => setChromePath(event.target.value)}
          />
          <YakitButton type="outline2" icon={<FolderOpenOutlined />} onClick={() => void chooseChrome()}>
            选择
          </YakitButton>
        </div>
      </label>

      <div className={styles['install-note']}>
        <SettingOutlined />
        <span>
          首次启动会同时打开扩展管理页。官方 Chrome 137+ 可能忽略命令行加载， 这种情况下只需在该 Profile
          中手动“加载已解压的扩展程序”一次。
        </span>
      </div>

      <div className={styles['create-actions']}>
        <YakitButton type="outline2" disabled={creating} onClick={onCancel}>
          取消
        </YakitButton>
        <YakitButton loading={creating} icon={<PlayCircleOutlined />} onClick={() => void create()}>
          创建并启动
        </YakitButton>
      </div>
    </div>
  )
}

export const ManagedBrowserIdentityRail: React.FC<ManagedBrowserIdentityRailProps> = ({
  targetUrl,
  devices = [],
  onAssignIdentity,
  onPreparePairing,
  onRefreshDevices,
}) => {
  const [profiles, setProfiles] = useState<ManagedBrowserProfile[]>([])
  const [defaults, setDefaults] = useState<ManagedBrowserProfileDefaults>()
  const [loading, setLoading] = useState(false)
  const [busyKey, setBusyKey] = useState('')

  const load = useCallback(
    async (notifyDevices = false) => {
      setLoading(true)
      try {
        const [nextProfiles, nextDefaults] = await Promise.all([
          yakitManagedBrowser.list(),
          yakitManagedBrowser.defaults(),
        ])
        setProfiles(nextProfiles)
        setDefaults(nextDefaults)
        if (notifyDevices) await onRefreshDevices?.()
      } catch (error) {
        yakitFailed(errorMessage(error))
      } finally {
        setLoading(false)
      }
    },
    [onRefreshDevices],
  )

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      void yakitManagedBrowser
        .list()
        .then((next) => setProfiles(next))
        .catch(() => undefined)
    }, 3_000)
    return () => window.clearInterval(timer)
  }, [load])

  const defaultSlot = useMemo<ManagedProfileSlot>(() => {
    const leftCount = profiles.filter((profile) => profile.slotHint === 'left').length
    const rightCount = profiles.length - leftCount
    return leftCount <= rightCount ? 'left' : 'right'
  }, [profiles])

  const openCreator = () => {
    const name = defaultSlot === 'left' ? '身份 A' : '身份 B'
    const modal = showYakitModal({
      width: 620,
      title: '新建独立测试身份',
      footer: null,
      content: (
        <ManagedProfileCreateForm
          defaults={defaults}
          defaultSlot={defaultSlot}
          defaultName={name}
          targetUrl={targetUrl}
          onPreparePairing={onPreparePairing}
          onCancel={modalDestroy}
          onCreated={() => load(true)}
        />
      ),
    })
    function modalDestroy() {
      modal.destroy()
    }
  }

  const runAction = async (profile: ManagedBrowserProfile, action: 'launch' | 'setup' | 'stop') => {
    const key = `${action}:${profile.id}`
    setBusyKey(key)
    try {
      if (action === 'stop') {
        await yakitManagedBrowser.stop(profile.id)
        success(`${profile.name} 已停止，登录态仍保留`)
      } else {
        if (action === 'setup') await onPreparePairing?.()
        await yakitManagedBrowser.launch(profile.id, {
          showExtensionPage: action === 'setup',
        })
        if (action === 'setup') info('配对窗口已准备，并在该独立 Profile 中打开扩展管理页')
        else success(`${profile.name} 已启动`)
      }
      await load(true)
    } catch (error) {
      yakitFailed(errorMessage(error))
    } finally {
      setBusyKey('')
    }
  }

  const confirmRemove = (profile: ManagedBrowserProfile) => {
    const modal = YakitModalConfirm({
      width: 460,
      title: `清理“${profile.name}”`,
      content:
        '将永久删除这个独立 Profile 中的 Cookie、Storage、Service Worker、浏览历史和插件配对信息。此操作不可撤销。',
      onOkText: '永久清理身份',
      showConfirmLoading: true,
      onOk: async () => {
        setBusyKey(`remove:${profile.id}`)
        try {
          await yakitManagedBrowser.remove(profile.id)
          success(`${profile.name} 已清理`)
          await load(true)
          modal.destroy()
        } catch (error) {
          yakitFailed(errorMessage(error))
        } finally {
          setBusyKey('')
        }
      },
    })
  }

  const assignDevice = async (profile: ManagedBrowserProfile, deviceId: string) => {
    const device = devices.find((candidate) => candidate.id === deviceId)
    if (!device) return
    const key = `bind:${profile.id}`
    setBusyKey(key)
    try {
      await yakitManagedBrowser.bind(profile.id, device.installationId)
      onAssignIdentity?.(profile.slotHint, device.id)
      success(`${profile.name} 已关联到 ${device.name}`)
      await load(true)
    } catch (error) {
      yakitFailed(errorMessage(error))
    } finally {
      setBusyKey('')
    }
  }

  const deviceOptions = devices.map((device) => ({
    value: device.id,
    label: `${device.name} · ${device.installationId.slice(0, 8)}`,
  }))

  return (
    <section className={styles['profile-rail']} data-empty={!profiles.length}>
      <header>
        <div className={styles['rail-heading']}>
          <span className={styles['rail-icon']}>
            <ChromeOutlined />
          </span>
          <span>
            <strong>独立 Chromium 身份</strong>
            <small>为复杂登录态创建完全隔离的 Profile；插件配对后会出现在下面的浏览器身份列表。</small>
          </span>
        </div>
        <div className={styles['rail-actions']}>
          <YakitButton type="outline2" icon={<ReloadOutlined />} loading={loading} onClick={() => void load(true)}>
            刷新
          </YakitButton>
          <YakitButton
            icon={<PlusOutlined />}
            disabled={Boolean(defaults && profiles.length >= defaults.maximumProfiles)}
            onClick={openCreator}
          >
            新建独立身份
          </YakitButton>
        </div>
      </header>

      {profiles.length ? (
        <div className={styles['profile-list']}>
          {profiles.map((profile) => {
            const status = statusCopy(profile.status)
            const boundDevice = devices.find((device) => device.installationId === profile.installationId)
            return (
              <div className={styles['profile-row']} data-status={profile.status} key={profile.id}>
                <span className={styles['profile-letter']}>{profile.slotHint === 'left' ? 'A' : 'B'}</span>
                <span className={styles['profile-copy']}>
                  <strong>{profile.name}</strong>
                  <small title={profile.userDataDir}>
                    {status.detail} · {pathTail(profile.extensionPath)}
                  </small>
                </span>
                <span className={styles['profile-status']}>
                  <i />
                  {status.label}
                </span>
                <span className={styles['profile-device']}>
                  <YakitSelect
                    value={boundDevice?.id}
                    loading={busyKey === `bind:${profile.id}`}
                    options={deviceOptions}
                    placeholder={profile.installationId ? '已关联设备离线' : '关联配对浏览器'}
                    onChange={(deviceId) => void assignDevice(profile, deviceId)}
                  />
                </span>
                <span className={styles['profile-actions']}>
                  <YakitButton
                    size="small"
                    type="outline2"
                    icon={<SettingOutlined />}
                    loading={busyKey === `setup:${profile.id}`}
                    onClick={() => void runAction(profile, 'setup')}
                  >
                    安装 / 配对
                  </YakitButton>
                  {profile.status === 'stopped' ? (
                    <YakitButton
                      size="small"
                      type="outline2"
                      icon={<PlayCircleOutlined />}
                      loading={busyKey === `launch:${profile.id}`}
                      onClick={() => void runAction(profile, 'launch')}
                    >
                      启动
                    </YakitButton>
                  ) : profile.status === 'running' ? (
                    <YakitButton
                      size="small"
                      type="outline2"
                      icon={<StopOutlined />}
                      loading={busyKey === `stop:${profile.id}`}
                      onClick={() => void runAction(profile, 'stop')}
                    >
                      停止
                    </YakitButton>
                  ) : null}
                  <YakitButton
                    size="small"
                    type="outline2"
                    icon={<DeleteOutlined />}
                    disabled={profile.status !== 'stopped'}
                    loading={busyKey === `remove:${profile.id}`}
                    onClick={() => confirmRemove(profile)}
                  />
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className={styles['rail-empty']}>
          <span>
            普通 + 无痕不适用时，用两个独立 Profile 登录不同账号；不需要手写 <code>--user-data-dir</code>。
          </span>
        </div>
      )}
    </section>
  )
}
