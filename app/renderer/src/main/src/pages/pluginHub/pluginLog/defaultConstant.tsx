import type { PluginLogTabInfo, PluginLogTypeToInfoProps } from './PluginLogType'
import {
  CommentLogColorful,
  CreatedLogColorful,
  DeletedLogColorful,
  InfoLogColorful,
  ModifiedLogColorful,
  RestoredLogColorful,
  ReviewRejectedLogColorful,
  SuccessLogColorful,
} from '@yakit-libs/yakit-ui-icons/colorful'

import styles from './PluginLog.module.scss'

/** 插件日志-所有列表类型和对应名称 */
export const PluginLogTabBars: PluginLogTabInfo[] = [
  {
    key: 'all',
    name: '全部日志',
  },
  {
    key: 'check',
    name: '审核',
  },
  {
    key: 'update',
    name: '修改',
  },
  {
    key: 'comment',
    name: '评论',
  },
]

/** 日志类型-对应展示信息和样式类 */
export const PluginLogTypeToInfo: Record<string, PluginLogTypeToInfoProps> = {
  submit: {
    key: 'submit',
    content: '创建插件',
    className: styles['plugin-log-type-info'],
    icon: <CreatedLogColorful />,
  },
  applyMerge: {
    key: 'applyMerge',
    content: '申请修改插件',
    className: styles['plugin-log-type-info'],
    icon: <ModifiedLogColorful />,
  },
  mergePass: {
    key: 'mergePass',
    content: '已合并',
    className: styles['plugin-log-type-success'],
    icon: <SuccessLogColorful />,
  },
  mergeNoPass: {
    key: 'mergeNoPass',
    content: '驳回',
    className: styles['plugin-log-type-failed'],
    icon: <ReviewRejectedLogColorful />,
  },
  update: {
    key: 'update',
    content: '修改插件',
    className: styles['plugin-log-type-info'],
    icon: <ModifiedLogColorful />,
  },
  checkPass: {
    key: 'checkPass',
    content: '审核通过',
    className: styles['plugin-log-type-success'],
    icon: <SuccessLogColorful />,
  },
  checkNoPass: {
    key: 'checkNoPass',
    content: '审核不通过',
    className: styles['plugin-log-type-failed'],
    icon: <ReviewRejectedLogColorful />,
  },
  delete: {
    key: 'delete',
    content: '删除插件',
    className: styles['plugin-log-type-info'],
    icon: <DeletedLogColorful />,
  },
  recover: {
    key: 'recover',
    content: '恢复插件',
    className: styles['plugin-log-type-info'],
    icon: <RestoredLogColorful />,
  },
  comment: {
    key: 'comment',
    content: '发布评论',
    className: styles['plugin-log-type-comment'],
    icon: <CommentLogColorful />,
  },
  reply: {
    key: 'reply',
    content: '回复',
    className: styles['plugin-log-type-comment'],
    icon: <CommentLogColorful />,
  },
  default: {
    key: 'default',
    content: '未知日志',
    className: styles['plugin-log-type-info'],
    icon: <InfoLogColorful />,
  },
}
