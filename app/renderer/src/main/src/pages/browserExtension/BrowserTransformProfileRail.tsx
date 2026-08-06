import type React from 'react'
import {
  CheckCircleOutlined,
  CodeOutlined,
  DeleteOutlined,
  DownOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import type { PageCallable, TransformProfile } from './browserTransformTypes'
import styles from './BrowserTransformWorkspace.module.scss'

interface BrowserTransformProfileRailProps {
  profiles: TransformProfile[]
  callables: PageCallable[]
  selectedID: string
  loading: boolean
  running: boolean
  confirmDeleteCallableID: string
  callableReferences: Map<string, number>
  isProfileReady: (profile: TransformProfile) => boolean
  onCreate: () => void
  onSelectProfile: (profile: TransformProfile) => void
  onConfirmDeleteCallable: (callableID: string) => void
  onDeleteCallable: (callable: PageCallable) => void
  onReload: () => void
}

export const BrowserTransformProfileRail: React.FC<BrowserTransformProfileRailProps> = ({
  profiles,
  callables,
  selectedID,
  loading,
  running,
  confirmDeleteCallableID,
  callableReferences,
  isProfileReady,
  onCreate,
  onSelectProfile,
  onConfirmDeleteCallable,
  onDeleteCallable,
  onReload,
}) => (
  <aside className={styles['profile-pane']}>
    <header>
      <span>
        转换配置 <strong>{profiles.length}</strong>
      </span>
      <YakitButton type="text2" icon={<PlusOutlined />} onClick={onCreate} />
    </header>
    <div>
      {profiles.map((profile) => (
        <button
          key={profile.id}
          className={selectedID === profile.id ? styles.selected : ''}
          onClick={() => onSelectProfile(profile)}
        >
          <LinkOutlined />
          <span>
            <strong>{profile.name}</strong>
            <small>
              {profile.match.methods.join(' / ') || 'ANY'} · {profile.match.urlPattern}
            </small>
          </span>
          {isProfileReady(profile) ? <CheckCircleOutlined /> : <WarningOutlined />}
        </button>
      ))}
      {!profiles.length && (
        <div className={styles['profile-empty']}>
          <LinkOutlined />
          <strong>没有转换配置</strong>
          <YakitButton size="small" onClick={onCreate}>
            新建 Pipeline
          </YakitButton>
        </div>
      )}
    </div>
    <footer>
      <details className={styles['callable-menu']}>
        <summary className={callables.length ? styles.ready : ''}>
          <i />
          {callables.length} 个页面函数
          <DownOutlined />
        </summary>
        <div className={styles['callable-popover']}>
          <header>
            <span>
              <strong>当前文档页面函数</strong>
              <small>页面刷新或导航后自动失效</small>
            </span>
            <em>{callables.length}</em>
          </header>
          {!callables.length ? (
            <div className={styles['callable-empty']}>
              <CodeOutlined />
              <span>还没有可管理的页面函数</span>
            </div>
          ) : (
            <div className={styles['callable-list']}>
              {callables.map((callable) => {
                const references = callableReferences.get(callable.id) || 0
                const confirming = confirmDeleteCallableID === callable.id
                return (
                  <section key={callable.id}>
                    <div>
                      <span>
                        <strong>{callable.name}</strong>
                        <small>
                          {callable.kind === 'recorded-call'
                            ? '录制调用'
                            : callable.kind === 'business-closure'
                              ? '业务闭包'
                              : callable.kind === 'request-transaction'
                                ? '请求事务'
                                : '全局函数'}{' '}
                          · {callable.algorithm || callable.operation}
                        </small>
                      </span>
                      <YakitButton
                        type="text2"
                        icon={<DeleteOutlined />}
                        disabled={loading || running}
                        onClick={() => onConfirmDeleteCallable(callable.id)}
                      />
                    </div>
                    {confirming && (
                      <aside>
                        <span>
                          {references
                            ? `${references} 个网关节点正在引用，删除后会显示“页面函数缺失”。`
                            : '这个页面函数将从当前文档中移除。'}
                        </span>
                        <div>
                          <YakitButton type="text" size="small" onClick={() => onConfirmDeleteCallable('')}>
                            取消
                          </YakitButton>
                          <YakitButton
                            danger
                            size="small"
                            disabled={loading || running}
                            onClick={() => onDeleteCallable(callable)}
                          >
                            确认删除
                          </YakitButton>
                        </div>
                      </aside>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </details>
      <YakitButton type="text2" icon={<ReloadOutlined spin={loading} />} onClick={onReload} />
    </footer>
  </aside>
)
