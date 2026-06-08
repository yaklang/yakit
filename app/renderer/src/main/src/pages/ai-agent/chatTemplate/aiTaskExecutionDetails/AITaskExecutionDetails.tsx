import React from 'react'
import classNames from 'classnames'
import {
  AITaskActionItemProps,
  AITaskExecutionDetailsCardProps,
  AITaskExecutionDetailsProps,
  AITaskStatisticsStatusProps,
} from './type'
import { OutlinePresentationchartbarIcon, OutlineTrashIcon } from '@/assets/icon/outline'
import styles from './AITaskExecutionDetails.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { AIDeleteNodeIcon, AIDoingNodeIcon, AIDoneNodeIcon, AIPendingNodeIcon, AISkippedNodeIcon } from './icon'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'

export const AITaskExecutionDetails: React.FC<AITaskExecutionDetailsProps> = React.memo((props) => {
  return (
    <div className={styles['ai-task-execution-details-container']}>
      {/* 头部 */}
      <div className={styles['header']}>
        <div className={styles['header-title']}>
          <OutlinePresentationchartbarIcon className={styles['header-icon']} />
          <span className={styles['title-text']}>任务执行详情</span>
        </div>
        <div className={styles['header-subtitle']}>这里是任务名这里是任务名这里是任务名这里是任务名</div>
      </div>

      <div className={styles['content-body']}>
        {/* 上半部分：左侧目标与意图 + 右侧统计 */}
        <div className={styles['top-section']}>
          <div className={styles['top-left']}>
            <AITaskExecutionDetailsCard title="任务目标">
              这里是任务目标信息，这里是任务目标信息这里是任务目标信息，这里是任务目标信息。
            </AITaskExecutionDetailsCard>
            <AITaskExecutionDetailsCard title="意图感知">
              这里是意图感知信息。
              <br />
              这里是意图感知信息，这里是意图感知信息这里是意图感知信息。
              这里是意图感知信息，这里是意图感知信息这里是意图感知信息。
              这里是意图感知信息，这里是意图感知信息这里是意图感知信息。
              这里是意图感知信息，这里是意图感知信息这里是意图感知信息。
              <br />
              这里是意图感知信息这里是意图感知。
            </AITaskExecutionDetailsCard>
          </div>
          <div className={styles['task-statistics']}>
            <div className={styles['stats-header']}>
              <span className={styles['title']}>任务统计</span>
              <span className={styles['progress-text']}>
                进度<span className={styles['progress-number']}>35/42</span>
              </span>
              <div className={styles['progress-bar']}>
                <div className={styles['progress-fill']} style={{ width: '80%' }} />
              </div>
            </div>
            {/* 状态统计区块 */}
            <AITaskStatisticsStatus
              list={[
                {
                  key: 'pending',
                  color: 'neutral-with-border',
                  title: '待处理',
                  footerLeft: '7',
                  footerRight: <AIPendingNodeIcon />,
                },
                {
                  key: 'pending',
                  color: 'main',
                  title: '待处理',
                  footerLeft: '7',
                  footerRight: <AIDoingNodeIcon />,
                },
                {
                  key: 'pending',
                  color: 'green',
                  title: '待处理',
                  footerLeft: '7',
                  footerRight: <AIDoneNodeIcon />,
                },
                {
                  key: 'pending',
                  color: 'neutral',
                  title: '待处理',
                  footerLeft: '7',
                  footerRight: <AISkippedNodeIcon />,
                },
                {
                  key: 'pending',
                  color: 'red',
                  title: '待处理',
                  footerLeft: '7',
                  footerRight: <AIDeleteNodeIcon />,
                },
              ]}
            />
            <div className={styles['stats-content']}>
              {/* 待办列表区块 */}
              <div className={styles['todo-list-wrapper']}>
                <div className={styles['todo-list-header']}>
                  <span className={styles['todo-title']}>待办</span>
                  <YakitTag border={false} fullRadius size="small">
                    7
                  </YakitTag>
                </div>
                <div className={styles['todo-list']}>
                  <div className={classNames(styles['todo-item'], styles['running'])}>
                    <span className={styles['icon-placeholder']} />
                    <span>这里是正在执行的任务</span>
                  </div>
                  <div className={classNames(styles['todo-item'], styles['running'])}>
                    <span className={styles['icon-placeholder']} />
                    <span>这里是正在执行，的任务这里是正在执行的任务这里是正在执行的任务</span>
                  </div>
                  <div className={styles['todo-item']}>
                    <span className={styles['icon-placeholder']} />
                    <span>这里是待执行的任务</span>
                  </div>
                  <div className={styles['todo-item']}>
                    <span className={styles['icon-placeholder']} />
                    <span>这里是待执行的任务这里是待执行的任务</span>
                  </div>
                </div>
              </div>
              {/* 已结束 */}
              <div className={styles['todo-list-wrapper']}>
                <div className={styles['todo-list-header']}>
                  <span className={styles['todo-title']}>已结束</span>
                  <YakitTag border={false} fullRadius size="small">
                    7
                  </YakitTag>
                </div>
                <div className={styles['todo-list']}>
                  <div className={classNames(styles['todo-item'], styles['running'])}>
                    <span className={styles['icon-placeholder']} />
                    <span>这里是正在执行的任务</span>
                  </div>
                  <div className={classNames(styles['todo-item'], styles['running'])}>
                    <span className={styles['icon-placeholder']} />
                    <span>这里是正在执行，的任务这里是正在执行的任务这里是正在执行的任务</span>
                  </div>
                  <div className={styles['todo-item']}>
                    <span className={styles['icon-placeholder']} />
                    <span>这里是待执行的任务</span>
                  </div>
                  <div className={styles['todo-item']}>
                    <span className={styles['icon-placeholder']} />
                    <span>这里是待执行的任务这里是待执行的任务</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 下半部分：技能、工具、插件三列 */}
        <div className={styles['bottom-section']}>
          {['技能', '工具', '插件'].map((colTitle, idx) => (
            <div key={colTitle} className={styles['section-card']}>
              <div className={styles['section-card-title']}>{colTitle}</div>

              {/* 固定加载 */}
              <div className={styles['plugin-group']}>
                <div className={styles['plugin-group-header']}>
                  <div className={styles['plugin-group-title']}>
                    固定加载
                    <YakitTag border={false} fullRadius size="small">
                      2
                    </YakitTag>
                  </div>
                </div>
                <div className={styles['plugin-list']}>
                  {Array.from({ length: 2 }).map((_, index) => (
                    <AITaskActionItem key={index} title={`这里是${index}名称`} />
                  ))}
                </div>
              </div>

              {/* 动态加载 */}
              <div className={styles['plugin-group']}>
                <div className={styles['plugin-group-header']}>
                  <div className={styles['plugin-group-title']}>
                    动态加载
                    <YakitTag border={false} fullRadius size="small">
                      5
                    </YakitTag>
                  </div>
                  <YakitButton type="text" className={styles['add-btn']}>
                    添加
                  </YakitButton>
                </div>
                <div className={styles['plugin-list']}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <AITaskActionItem
                      key={index}
                      title={`这里是${index}名称`}
                      description={'用户正在处理一个Yaklang代码编写任务,开发...'}
                      titleExtra={
                        <YakitPopconfirm title={'确定删除嘛?'} onConfirm={() => {}}>
                          <YakitButton isHover icon={<OutlineTrashIcon />} type="secondary2" colors="danger" />
                        </YakitPopconfirm>
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

const AITaskActionItem: React.FC<AITaskActionItemProps> = React.memo((props) => {
  const { title, description, titleExtra } = props
  return (
    <div className={classNames(styles['plugin-item'])}>
      <div className={styles['plugin-item-heard']}>
        <div className={styles['plugin-item-title']}>{title}</div>
        {titleExtra && <div className={styles['plugin-item-actions']}>{titleExtra}</div>}
      </div>
      {description && <div className={styles['plugin-item-desc']}>{description}</div>}
    </div>
  )
})

const AITaskExecutionDetailsCard: React.FC<AITaskExecutionDetailsCardProps> = React.memo((props) => {
  const { title, children, className } = props
  return (
    <div className={classNames(styles['card'], className)}>
      <div className={styles['card-title']}>{title}</div>
      <div className={styles['card-content']}>{children}</div>
    </div>
  )
})

const AITaskStatisticsStatus: React.FC<AITaskStatisticsStatusProps> = React.memo((props) => {
  const { list } = props
  return (
    <div className={styles['stats-overview']}>
      {list.map((item) => (
        <div key={item.key} className={classNames(styles['stat-box'], styles[`stat-${item.color}`])}>
          <div className={styles['stat-label']}>{item.title}</div>
          <div className={styles['stat-footer']}>
            <div className={styles['stat-footer-left']}>{item.footerLeft}</div>
            <div className={styles['stat-footer-right']}> {item.footerRight} </div>
          </div>
        </div>
      ))}
    </div>
  )
})
