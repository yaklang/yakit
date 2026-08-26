import React, { useEffect, useState } from 'react'
import classNames from 'classnames'
import emiter from '@/utils/eventBus/eventBus'
import { ReActChatEventEnum } from '@/pages/ai-agent/defaultConstant'
import { OutlineChevronleftIcon, OutlineChevronrightIcon } from '@/assets/icon/outline'
import aiSenSoLogo from '@/assets/newAssets/ai-senpike-logo-transparent-v2.png'
import { useDigitalEmployee } from './DigitalEmployeeContext'
import { getVisibleAgentTags } from './roleAssignment'
import styles from './DigitalEmployeeWorkspace.module.scss'

export interface DigitalEmployeeSidebarProps {
  detailActive?: boolean
  onOpenTools: () => void
  toolsOpen: boolean
}

export const DigitalEmployeeSidebar: React.FC<DigitalEmployeeSidebarProps> = ({
  detailActive = false,
  onOpenTools,
  toolsOpen,
}) => {
  const { employees, selectedEmployee, switchEmployee } = useDigitalEmployee()
  const [collapsed, setCollapsed] = useState(detailActive)

  useEffect(() => {
    setCollapsed(detailActive)
  }, [detailActive])

  const handleSwitch = (id: string) => {
    if (selectedEmployee?.id === id) return
    if (!switchEmployee(id)) return
    emiter.emit(
      'onReActChatEvent',
      JSON.stringify({
        type: ReActChatEventEnum.NEW_CHAT,
      }),
    )
  }

  return (
    <aside
      className={classNames(styles['employee-sidebar'], {
        [styles['employee-sidebar-collapsed']]: collapsed,
      })}
    >
      <div className={styles['sidebar-title']}>
        {!collapsed && (
          <div>
            <span>数字员工角色</span>
            <small>AI SenSo</small>
          </div>
        )}
        <button
          type="button"
          className={styles['sidebar-toggle']}
          aria-label={collapsed ? '展开数字员工列表' : '收起数字员工列表'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <OutlineChevronrightIcon /> : <OutlineChevronleftIcon />}
        </button>
      </div>
      <div className={styles['employee-list']}>
        {employees.map((employee) => {
          const active = employee.id === selectedEmployee?.id
          return (
            <button
              type="button"
              key={employee.id}
              className={classNames(styles['employee-list-item'], {
                [styles['employee-list-item-active']]: active,
              })}
              onClick={() => handleSwitch(employee.id)}
              title={collapsed ? `${employee.name}：${employee.description}` : employee.description}
            >
              <span className={styles['avatar']}>
                <img src={employee.portrait} alt="" />
              </span>
              {!collapsed && <span className={styles['employee-name']}>{employee.name}</span>}
              {active && <span className={styles['active-mark']} />}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className={classNames(styles['tool-entry'], {
          [styles['tool-entry-active']]: toolsOpen,
        })}
        onClick={onOpenTools}
        aria-label="会话与设置"
      >
        <span className={styles['tool-entry-icon']}>⋯</span>
        {!collapsed && '会话与设置'}
      </button>
    </aside>
  )
}

export const DigitalEmployeeProfile: React.FC = () => {
  const { selectedEmployee, selectedAgent, roleAgents } = useDigitalEmployee()

  if (!selectedEmployee) return null

  return (
    <section className={styles['employee-profile']}>
      <div className={styles['profile-brand-lockup']}>
        <img src={aiSenSoLogo} alt="AI SenSo" />
      </div>
      <span className={styles['profile-divider']} aria-hidden="true" />
      <div className={styles['profile-portrait']}>
        <img src={selectedEmployee.portrait} alt={selectedEmployee.name} />
      </div>
      <div className={styles['profile-main']}>
        <div className={styles['profile-title-row']}>
          <span>当前数字员工</span>
          <h1>{selectedEmployee.name}</h1>
        </div>
        <p>{selectedEmployee.description}</p>
        <div className={styles['profile-skills']}>
          {selectedEmployee.skills.slice(0, 6).map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      </div>
      <div className={styles['profile-meta']}>
        <span className={styles['online-dot']} />
        {selectedAgent
          ? `当前智能体：${selectedAgent.ForgeVerboseName || selectedAgent.ForgeName}`
          : `${roleAgents.length} 个可用智能体`}
      </div>
    </section>
  )
}

export const DigitalEmployeeAgentSelector: React.FC = () => {
  const { roleAgents, selectedAgent, selectedEmployee, loading, error, unassignedAgents, selectAgent, retry } =
    useDigitalEmployee()

  if (!selectedEmployee) return null

  return (
    <section className={styles['agent-selector']} aria-label={`${selectedEmployee.name}智能体选择`}>
      <div className={styles['agent-selector-header']}>
        <div>
          <strong>选择智能体</strong>
          <span>以下智能体归属于“{selectedEmployee.name}”</span>
        </div>
        <span>{loading ? '加载中…' : `${roleAgents.length} 个`}</span>
      </div>

      {error ? (
        <div className={styles['agent-selector-empty']}>
          <span>{error}</span>
          <button type="button" onClick={retry}>
            重新加载
          </button>
        </div>
      ) : roleAgents.length ? (
        <div className={styles['agent-selector-list']}>
          {roleAgents.map((agent) => {
            const active = agent.Id === selectedAgent?.Id
            const tags = getVisibleAgentTags(agent.Tag)
            return (
              <button
                type="button"
                key={agent.Id}
                className={classNames(styles['agent-selector-item'], {
                  [styles['agent-selector-item-active']]: active,
                })}
                aria-pressed={active}
                onClick={() => selectAgent(agent.Id)}
              >
                <span className={styles['agent-selector-item-title']}>
                  <strong>{agent.ForgeVerboseName || agent.ForgeName}</strong>
                  {active && <small>当前使用</small>}
                </span>
                <span className={styles['agent-selector-item-description']}>
                  {agent.Description || '专业智能分析与执行能力'}
                </span>
                {!!tags.length && (
                  <span className={styles['agent-selector-item-tags']}>
                    {tags.slice(0, 3).map((tag) => (
                      <small key={tag}>{tag}</small>
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <div className={styles['agent-selector-empty']}>
          <strong>该角色暂时没有已分配的智能体</strong>
          <span>请前往智能体广场创建智能体，或编辑现有智能体并选择该数字员工角色。</span>
          {!!unassignedAgents.length && <small>当前另有 {unassignedAgents.length} 个智能体尚未分配角色。</small>}
        </div>
      )}
    </section>
  )
}
