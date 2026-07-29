import React from 'react'
import classNames from 'classnames'
import emiter from '@/utils/eventBus/eventBus'
import { ReActChatEventEnum } from '@/pages/ai-agent/defaultConstant'
import { useDigitalEmployee } from './DigitalEmployeeContext'
import styles from './DigitalEmployeeWorkspace.module.scss'

export interface DigitalEmployeeSidebarProps {
  onOpenTools: () => void
  toolsOpen: boolean
}

export const DigitalEmployeeSidebar: React.FC<DigitalEmployeeSidebarProps> = ({ onOpenTools, toolsOpen }) => {
  const { employees, selectedEmployee, switchEmployee } = useDigitalEmployee()

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
    <aside className={styles['employee-sidebar']}>
      <div className={styles['sidebar-title']}>
        <span>数字员工切换</span>
        <small>AI SenSo</small>
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
              title={employee.description}
            >
              <span className={styles['avatar']}>
                <img src={employee.portrait} alt="" />
              </span>
              <span className={styles['employee-name']}>{employee.name}</span>
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
      >
        <span className={styles['tool-entry-icon']}>⋯</span>
        会话与设置
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
      <div className={styles['profile-portrait']}>
        <img src={selectedEmployee.portrait} alt={selectedEmployee.name} />
      </div>
      <div className={styles['profile-main']}>
        <div className={styles['profile-brand']}>AI SenSo 数字员工</div>
        <div className={styles['profile-title-row']}>
          <h1>{selectedEmployee.name}</h1>
          <span>当前角色</span>
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
        技能库已连接
      </div>
    </section>
  )
}
