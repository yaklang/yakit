import React from 'react'
import classNames from 'classnames'
import { TableCellToColorTag } from '@/components/TableVirtualResize/utils'
import style from './HTTPFlowTable.module.scss'

const tableRowColor = (key: string) => {
  switch (key) {
    case 'RED':
      return 'color-opacity-bg-red color-text-red color-font-weight-red'
    case 'GREEN':
      return 'color-opacity-bg-green color-text-green color-font-weight-green'
    case 'BLUE':
      return 'color-opacity-bg-blue color-text-blue color-font-weight-blue'
    case 'YELLOW':
      return 'color-opacity-bg-yellow color-text-yellow color-font-weight-yellow'
    case 'ORANGE':
      return 'color-opacity-bg-orange color-text-orange color-font-weight-orange'
    case 'PURPLE':
      return 'color-opacity-bg-purple color-text-purple color-font-weight-purple'
    case 'CYAN':
      return 'color-opacity-bg-cyan color-text-cyan color-font-weight-cyan'
    case 'GREY':
      return 'color-opacity-bg-grey color-text-grey color-font-weight-grey'
    default:
      return ''
  }
}

export const availableColors = [
  {
    color: 'RED',
    title: '红色[#F4736B]',
    className: tableRowColor('RED'),
    searchWord: TableCellToColorTag['RED'],
    render: (t) => (
      <div className={classNames(style['history-color-tag'])}>
        <div className={classNames(style['tag-color-display'], 'color-bg-red')}></div>
        {t('YakitTable.red')}
      </div>
    ),
  },
  {
    color: 'GREEN',
    title: '绿色[#56C991]',
    className: tableRowColor('GREEN'),
    searchWord: TableCellToColorTag['GREEN'],
    render: (t) => (
      <div className={classNames(style['history-color-tag'])}>
        <div className={classNames(style['tag-color-display'], 'color-bg-green')}></div>
        {t('YakitTable.green')}
      </div>
    ),
  },
  {
    color: 'BLUE',
    title: '蓝色[#4A94F8]',
    className: tableRowColor('BLUE'),
    searchWord: TableCellToColorTag['BLUE'],
    render: (t) => (
      <div className={classNames(style['history-color-tag'])}>
        <div className={classNames(style['tag-color-display'], 'color-bg-blue')}></div>
        {t('YakitTable.blue')}
      </div>
    ),
  },
  {
    color: 'YELLOW',
    title: '黄色[#FFD583]',
    searchWord: TableCellToColorTag['YELLOW'],
    className: tableRowColor('YELLOW'),
    render: (t) => (
      <div className={classNames(style['history-color-tag'])}>
        <div className={classNames(style['tag-color-display'], 'color-bg-yellow')}></div>
        {t('YakitTable.yellow')}
      </div>
    ),
  },
  {
    color: 'ORANGE',
    title: '橙色[#FFB660]',
    searchWord: TableCellToColorTag['ORANGE'],
    className: tableRowColor('ORANGE'),
    render: (t) => (
      <div className={classNames(style['history-color-tag'])}>
        <div className={classNames(style['tag-color-display'], 'color-bg-orange')}></div>
        {t('YakitTable.orange')}
      </div>
    ),
  },
  {
    color: 'PURPLE',
    title: '紫色[#8863F7]',
    searchWord: TableCellToColorTag['PURPLE'],
    className: tableRowColor('PURPLE'),
    render: (t) => (
      <div className={classNames(style['history-color-tag'])}>
        <div className={classNames(style['tag-color-display'], 'color-bg-purple')}></div>
        {t('YakitTable.purple')}
      </div>
    ),
  },
  {
    color: 'CYAN',
    title: '青色[#35D8EE]',
    searchWord: TableCellToColorTag['CYAN'],
    className: tableRowColor('CYAN'),
    render: (t) => (
      <div className={classNames(style['history-color-tag'])}>
        <div className={classNames(style['tag-color-display'], 'color-bg-cyan')}></div>
        {t('YakitTable.cyan')}
      </div>
    ),
  },
  {
    color: 'GREY',
    title: '灰色[#B4BBCA]',
    searchWord: TableCellToColorTag['GREY'],
    className: tableRowColor('GREY'),
    render: (t) => (
      <div className={classNames(style['history-color-tag'])}>
        <div className={classNames(style['tag-color-display'], 'color-bg-grey')}></div>
        {t('YakitTable.grey')}
      </div>
    ),
  },
]
