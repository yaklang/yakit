import React, { useEffect, useState } from 'react'
import classNames from 'classnames'
import emiter from '@/utils/eventBus/eventBus'
import { ReActChatEventEnum } from '@/pages/ai-agent/defaultConstant'
import { OutlineChevronleftIcon, OutlineChevronrightIcon } from '@/assets/icon/outline'
import aiSenPikeLogo from '@/assets/newAssets/ai-senpike-logo-transparent-v2.png'
import { useDigitalEmployee } from './DigitalEmployeeContext'
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
            <span>数字员工切换</span>
            <small>AI SenPike</small>
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
  const { selectedEmployee } = useDigitalEmployee()

  if (!selectedEmployee) return null

  const description = selectedEmployee.forge?.Description || selectedEmployee.description
  const tags = selectedEmployee.forge?.Tag?.length ? selectedEmployee.forge.Tag : selectedEmployee.skills

  return (
    <section className={styles['employee-profile']}>
      <div className={styles['profile-brand-lockup']}>
        <img src={aiSenPikeLogo} alt="AI SenPike" />
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
        <p>{description}</p>
        <div className={styles['profile-skills']}>
          {tags.slice(0, 6).map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      </div>
      <div className={styles['profile-meta']}>
        <span className={styles['online-dot']} />
        技能已就绪
      </div>
    </section>
  )
}
