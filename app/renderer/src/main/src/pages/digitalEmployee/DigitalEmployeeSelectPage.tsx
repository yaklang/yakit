import React, { useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'
import {
  OutlineAcademiccapIcon,
  OutlineBookopenIcon,
  OutlineBrainCircuitIcon,
  OutlineBrainIcon,
  OutlineChartbarIcon,
  OutlineChevronleftIcon,
  OutlineChevronrightIcon,
  OutlineDatabaseIcon,
  OutlineGlobealtIcon,
  OutlinePuzzleIcon,
  OutlineRobotIcon,
  OutlineSearchcircleIcon,
  OutlineSearchIcon,
  OutlineShieldcheckIcon,
  OutlineShieldexclamationIcon,
} from '@/assets/icon/outline'
import { SolidBadgecheckIcon } from '@/assets/icon/solid'
import aiSenSoLogo from '@/assets/newAssets/ai-senpike-logo-transparent-v2.png'
import { YakitRoute } from '@/enums/yakitRoute'
import { useDigitalEmployee } from './DigitalEmployeeContext'
import styles from './DigitalEmployeeSelectPage.module.scss'

const QuickNavigation = [
  { key: 'agent', title: '智能体广场', route: YakitRoute.AI_Forge, icon: <OutlineRobotIcon /> },
  { key: 'knowledge', title: '知识库', route: YakitRoute.AI_REPOSITORY, icon: <OutlineBookopenIcon /> },
  { key: 'memory', title: '记忆库', route: YakitRoute.AI_Memory, icon: <OutlineBrainCircuitIcon /> },
  { key: 'tool', title: '工具库', route: YakitRoute.AI_Tool, icon: <OutlinePuzzleIcon /> },
  { key: 'plugin', title: '插件仓库', route: YakitRoute.Plugin_Hub, icon: <OutlineShieldcheckIcon /> },
  { key: 'database', title: '流量历史', route: YakitRoute.DB_HTTPHistory, icon: <OutlineDatabaseIcon /> },
]

const EMPLOYEES_PER_PAGE = 8

export interface DigitalEmployeeSelectPageProps {
  onQuickNavigation: (route: YakitRoute) => void
}

const getEmployeeBadgeIcon = (employeeId: string) => {
  switch (employeeId) {
    case 'threat-analyst':
      return <OutlineSearchcircleIcon />
    case 'penetration-tester':
      return <OutlineGlobealtIcon />
    case 'operations-manager':
      return <OutlineChartbarIcon />
    case 'digital-hunter':
      return <OutlineSearchIcon />
    case 'intelligence-officer':
      return <OutlineBrainIcon />
    case 'ciso':
      return <OutlineShieldcheckIcon />
    case 'digital-teacher':
      return <OutlineAcademiccapIcon />
    case 'incident-responder':
      return <OutlineShieldexclamationIcon />
    default:
      return <OutlineShieldcheckIcon />
  }
}

export const DigitalEmployeeSelectPage: React.FC<DigitalEmployeeSelectPageProps> = ({ onQuickNavigation }) => {
  const { employees, selectedEmployee, loading, error, confirmSelection, switchEmployee, retry } = useDigitalEmployee()
  const carouselRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const employeePages = useMemo(() => {
    const pages: (typeof employees)[] = []
    for (let index = 0; index < employees.length; index += EMPLOYEES_PER_PAGE) {
      pages.push(employees.slice(index, index + EMPLOYEES_PER_PAGE))
    }
    return pages
  }, [employees])

  const pageCount = employeePages.length

  useEffect(() => {
    if (pageCount === 0 || currentPage < pageCount) return
    setCurrentPage(pageCount - 1)
  }, [currentPage, pageCount])

  const goToPage = (page: number) => {
    if (pageCount === 0) return
    const nextPage = Math.max(0, Math.min(page, pageCount - 1))
    setCurrentPage(nextPage)
    const carousel = carouselRef.current
    if (!carousel) return
    const nextLeft = carousel.clientWidth * nextPage
    if (typeof carousel.scrollTo === 'function') {
      carousel.scrollTo({ left: nextLeft, behavior: 'smooth' })
    } else {
      carousel.scrollLeft = nextLeft
    }
  }

  const handleCarouselScroll = () => {
    const carousel = carouselRef.current
    if (!carousel || carousel.clientWidth === 0) return
    const nextPage = Math.round(carousel.scrollLeft / carousel.clientWidth)
    setCurrentPage(Math.max(0, Math.min(nextPage, pageCount - 1)))
  }

  return (
    <main className={styles['employee-selection']}>
      <div className={styles['selection-stage']}>
        <header className={styles['brand-header']}>
          <img src={aiSenSoLogo} alt="AI Senso" />
        </header>

        <section className={styles['selection-content']}>
          <h1 className={styles['page-heading']}>
            <span className={styles['heading-title-row']}>
              <span className={styles['heading-decoration']} aria-hidden="true" />
              <span className={styles['heading-title']}>选择你的数字员工</span>
              <span className={styles['heading-decoration']} aria-hidden="true" />
            </span>
            <span className={styles['heading-subtitle']}>登录后请选择一位数字员工，开启你的智能安全工作</span>
          </h1>

          <div
            ref={carouselRef}
            className={styles['employee-carousel']}
            aria-busy={loading}
            onScroll={handleCarouselScroll}
          >
            {employeePages.map((pageEmployees, pageIndex) => (
              <div className={styles['employee-page']} key={pageIndex} aria-label={`数字员工第 ${pageIndex + 1} 页`}>
                {pageEmployees.map((employee) => {
                  const selected = selectedEmployee?.id === employee.id
                  return (
                    <button
                      type="button"
                      key={employee.id}
                      className={classNames(styles['employee-card'], {
                        [styles['employee-card-selected']]: selected,
                      })}
                      onClick={() => switchEmployee(employee.id)}
                      aria-pressed={selected}
                      aria-label={`选择并进入${employee.name}`}
                    >
                      <span className={styles['portrait-wrapper']}>
                        <img src={employee.portrait} alt={employee.name} />
                      </span>
                      <span className={styles['employee-badge']} style={{ color: employee.accent }} aria-hidden="true">
                        {getEmployeeBadgeIcon(employee.id)}
                      </span>
                      {selected && (
                        <span className={styles['selected-state']}>
                          <SolidBadgecheckIcon />
                          当前选择
                        </span>
                      )}
                      <span className={styles['card-details']}>
                        <span className={styles['card-order']}>{employee.order}</span>
                        <span className={styles['card-copy']}>
                          <strong>{employee.name}</strong>
                          <small>{employee.cardDescription}</small>
                        </span>
                      </span>
                      <span className={styles['card-action']}>
                        <span>选择 TA / 进入</span>
                        <span className={styles['card-action-arrows']} aria-hidden="true">
                          <span className={styles['card-action-arrow']}>
                            <OutlineChevronrightIcon />
                          </span>
                          <span className={styles['card-action-arrow']}>
                            <OutlineChevronrightIcon />
                          </span>
                          <span className={styles['card-action-arrow']}>
                            <OutlineChevronrightIcon />
                          </span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {pageCount > 1 && (
            <nav className={styles['carousel-controls']} aria-label="数字员工翻页">
              <button
                type="button"
                className={styles['carousel-arrow']}
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                aria-label="上一页"
              >
                <OutlineChevronleftIcon />
              </button>
              <div className={styles['carousel-dots']}>
                {employeePages.map((_, pageIndex) => (
                  <button
                    type="button"
                    key={pageIndex}
                    className={classNames(styles['carousel-dot'], {
                      [styles['carousel-dot-active']]: pageIndex === currentPage,
                    })}
                    onClick={() => goToPage(pageIndex)}
                    aria-label={`切换到第 ${pageIndex + 1} 页`}
                    aria-current={pageIndex === currentPage ? 'page' : undefined}
                  />
                ))}
              </div>
              <button
                type="button"
                className={styles['carousel-arrow']}
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === pageCount - 1}
                aria-label="下一页"
              >
                <OutlineChevronrightIcon />
              </button>
            </nav>
          )}

          <section className={styles['quick-navigation']} aria-label="快速导航">
            <div className={styles['quick-title']}>
              <span />
              <strong>快速导航</strong>
              <span />
            </div>
            <div className={styles['quick-list']}>
              {QuickNavigation.map((item) => (
                <button
                  type="button"
                  className={styles['quick-item']}
                  key={item.key}
                  title={`打开${item.title}`}
                  aria-label={`打开${item.title}`}
                  onClick={() => onQuickNavigation(item.route)}
                >
                  <span className={styles['quick-icon']} aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </section>

          <footer className={styles['selection-footer']}>
            <div className={styles['footer-tip']}>不同数字员工擅长不同领域，可随时在 AI Agent 左侧切换</div>
            <div className={styles['footer-action-group']}>
              {error && (
                <button type="button" className={styles['retry-button']} onClick={retry}>
                  重新加载技能库
                </button>
              )}
              <button
                type="button"
                className={styles['confirm-button']}
                disabled={!selectedEmployee}
                onClick={confirmSelection}
              >
                <span aria-hidden="true">✓</span>
                确认选择，开启智能安全工作
              </button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  )
}
