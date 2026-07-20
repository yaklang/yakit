import React from 'react'
import type { DebouncedFunc } from 'lodash'
import classNames from 'classnames'
import { CheckCircleIcon, ArrowCircleRightSvgIcon, ChromeFrameSvgIcon } from '@/assets/newIcon'
import { OutlineSearchIcon, OutlineSelectorIcon, OutlineStarIcon } from '@/assets/icon/outline'
import { SolidStarIcon } from '@/assets/icon/solid'
import { YakQueryHTTPFlowRequest } from '@/utils/yakQueryHTTPFlow'
import { ColumnsTypeProps, FiltersItemProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import { isCellRedSingleColor, getSingleColorType } from '@/components/TableVirtualResize/utils'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { formatTimestamp } from '@/utils/timeUtil'
import { formatHTTPFlowPathSuffix } from './HTTPFlowPathSuffix'
import { contentType, HTTP_FLOW_FAVORITE_TAG } from './HTTPFlowTable.constants'
import type { ColumnAllInfoItem, HTTPFlow } from './HTTPFlowTable.constants'
import { isHTTPFlowFavorite, onConvertBodySizeByUnit } from './HTTPFlowTable.utils'
import { RangeInputNumberTableWrapper } from './components'
import style from './HTTPFlowTable.module.scss'
import { buildColumnOrderMap, compareByColumnOrder } from '@/utils/sortByColumnOrder'
import { defalutColumnsOrder } from '@/pages/hTTPHistoryAnalysis/HTTPHistory/HTTPHistoryFilter'

/** 需要完全排除的列字段，表格不可能出现的列 */
export const noColumnsKey: string[] = ['Payloads']

/** 不需要参与自定义的列（不需要存进缓存） */
export const excludeCustomColumnsKey: string[] = ['Payloads']

export const isHTTPFlowSpecialCustomColumn = (key: string) => {
  return excludeCustomColumnsKey.includes(key) || noColumnsKey.includes(key)
}

export const getHTTPFlowDefaultColumnsOrder = () => {
  return defalutColumnsOrder.filter((key) => !noColumnsKey.includes(key))
}

export interface HTTPFlowTableColumnActionHandlers {
  onToggleFavorite: (e: React.MouseEvent, rowData: HTTPFlow, favorite: boolean) => void
  onOpenInBrowser: (e: React.MouseEvent, rowData: HTTPFlow) => void
  onExpand: (e: React.MouseEvent, rowData: HTTPFlow) => void
}

export interface BuildHTTPFlowTableColumnsContext {
  t: (...args: any[]) => any
  idFixed: boolean
  suffixList: FiltersItemProps[]
  checkBodyLength: boolean
  onCheckThan0: DebouncedFunc<(check: boolean) => void>
  getAfterBodyLength: () => number | undefined
  setAfterBodyLength: (value?: number) => void
  getBeforeBodyLength: () => number | undefined
  setBeforeBodyLength: (value?: number) => void
  getBodyLengthUnit: () => 'B' | 'K' | 'M'
  setBodyLengthUnit: (value: 'B' | 'K' | 'M') => void
  setParams: (updater: (prev: YakQueryHTTPFlowRequest) => YakQueryHTTPFlowRequest) => void
  actionHandlers: HTTPFlowTableColumnActionHandlers
  comBuiltinTagList: FiltersItemProps[]
}

export interface ResolveHTTPFlowTableColumnsOptions {
  columnArr: ColumnsTypeProps[]
  columnsOrder: string[]
  excludeColumnsKey: string[]
  setIdFixed: (fixed: boolean) => void
}

export interface ResolveHTTPFlowTableColumnsResult {
  columns: ColumnsTypeProps[]
  configColumns: ColumnAllInfoItem[]
}

/** 构建 HTTP 流量表格全部列定义（含 Id / action 固定列） */
export const buildHTTPFlowTableColumnArr = (ctx: BuildHTTPFlowTableColumnsContext): ColumnsTypeProps[] => {
  const {
    t,
    idFixed,
    suffixList,
    checkBodyLength,
    onCheckThan0,
    getAfterBodyLength,
    setAfterBodyLength,
    getBeforeBodyLength,
    setBeforeBodyLength,
    getBodyLengthUnit,
    setBodyLengthUnit,
    setParams,
    actionHandlers,
    comBuiltinTagList,
  } = ctx

  return [
    {
      title: t('YakitTable.order'),
      dataKey: 'Id',
      fixed: idFixed ? 'left' : undefined,
      ellipsis: false,
      width: 96,
      enableDrag: false,
      sorterProps: {
        sorter: true,
      },
    },
    {
      title: t('HTTPFlowTable.method'),
      dataKey: 'Method',
      width: 100,
      filterProps: {
        filterKey: 'Methods',
        filtersType: 'select',
        filterMultiple: true,
        filters: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'HEAD', value: 'HEAD' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
          { label: 'PATCH', value: 'PATCH' },
        ],
      },
    },
    {
      title: t('HTTPFlowTable.statusCode'),
      dataKey: 'StatusCode',
      width: 120,
      filterProps: {
        filterKey: 'StatusCode',
        filtersType: 'input',
        filterIcon: <OutlineSearchIcon className={style['filter-icon']} />,
        filterInputProps: {
          placeholder: t('YakitInput.supportInputFormat'),
          wrapperStyle: { width: 270 },
          onRegular: (value) => value.replace(/[^0-9,-]/g, ''),
        },
      },
      render: (text, rowData) => (
        <div
          className={classNames({
            [style['status-code']]: !isCellRedSingleColor(rowData.cellClassName),
          })}
        >
          {text}
        </div>
      ),
    },
    {
      title: 'URL',
      dataKey: 'Url',
      width: 400,
      filterProps: {
        filterKey: 'SearchURL',
        filtersType: 'input',
        filterIcon: <OutlineSearchIcon className={style['filter-icon']} />,
      },
    },
    {
      title: 'Host',
      dataKey: 'Host',
      width: 200,
    },
    {
      title: 'Path',
      dataKey: 'Path',
      width: 400,
    },
    {
      title: t('HTTPFlowTable.fromPlugin'),
      dataKey: 'FromPlugin',
      width: 200,
      filterProps: {
        filterKey: 'FromPlugin',
        filtersType: 'input',
        filterIcon: <OutlineSearchIcon className={style['filter-icon']} />,
      },
    },
    {
      title: 'Tags',
      dataKey: 'Tags',
      width: 150,
      render: (text) =>
        text
          ? `${text}`
              .split('|')
              .filter(
                (i) =>
                  !i.startsWith('YAKIT_COLOR_') &&
                  i !== HTTP_FLOW_FAVORITE_TAG &&
                  comBuiltinTagList.every(({ value }) => value !== i),
              )
              .join(', ')
          : '',
    },
    {
      title: 'IP',
      dataKey: 'IPAddress',
      width: 200,
    },
    {
      title: t('HTTPFlowTable.bodyLength'),
      dataKey: 'BodyLength',
      width: 130,
      filterProps: {
        filterKey: 'bodyLength',
        filterIcon: <OutlineSelectorIcon className={style['filter-icon']} />,
        filterRender: (closePopover: () => void) => (
          <RangeInputNumberTableWrapper
            checkBodyLength={checkBodyLength}
            onCheckThan0={onCheckThan0}
            minNumber={getAfterBodyLength()}
            setMinNumber={setAfterBodyLength}
            maxNumber={getBeforeBodyLength()}
            setMaxNumber={setBeforeBodyLength}
            onReset={() => {
              setParams((prev) => ({
                ...prev,
                AfterBodyLength: checkBodyLength ? 1 : undefined,
                BeforeBodyLength: undefined,
              }))
              setBeforeBodyLength(undefined)
              setAfterBodyLength(undefined)
              setBodyLengthUnit('B')
              setTimeout(() => {
                closePopover()
              }, 50)
            }}
            onSure={() => {
              const afterBodyLen = getAfterBodyLength()
              const beforeBodyLen = getBeforeBodyLength()
              setParams((prev) => ({
                ...prev,
                AfterBodyLength:
                  checkBodyLength && !afterBodyLen
                    ? 1
                    : afterBodyLen
                      ? onConvertBodySizeByUnit(afterBodyLen, getBodyLengthUnit())
                      : undefined,
                BeforeBodyLength: beforeBodyLen
                  ? onConvertBodySizeByUnit(beforeBodyLen, getBodyLengthUnit())
                  : undefined,
              }))
              setTimeout(() => {
                closePopover()
              }, 50)
            }}
            extra={
              <YakitSelect
                value={getBodyLengthUnit()}
                onSelect={(val) => {
                  setBodyLengthUnit(val)
                }}
                wrapperClassName={style['unit-select']}
                size="small"
              >
                <YakitSelect value="B">B</YakitSelect>
                <YakitSelect value="K">K</YakitSelect>
                <YakitSelect value="M">M</YakitSelect>
              </YakitSelect>
            }
          />
        ),
      },
      render: (_, rowData) => (
        <>
          {rowData.BodyLength !== -1 && (
            <div
              className={classNames({
                [style['body-length-text-red']]:
                  rowData.BodyLength > 1000000 && !isCellRedSingleColor(rowData.cellClassName),
              })}
            >
              {rowData.BodyLength}
              {rowData.BodySizeVerbose && rowData.BodyLength > 1024 ? `（${rowData.BodySizeVerbose}）` : ''}
            </div>
          )}
        </>
      ),
    },
    {
      title: 'Title',
      dataKey: 'HtmlTitle',
      width: 200,
    },
    {
      title: t('HTTPFlowTable.params'),
      dataKey: 'GetParamsTotal',
      width: 130,
      filterProps: {
        filterKey: 'HaveParamsTotal',
        filtersType: 'select',
        filtersSelectAll: {
          isAll: true,
        },
        filters: [
          {
            label: t('HTTPFlowTable.have'),
            value: 'true',
          },
          {
            label: t('HTTPFlowTable.none'),
            value: 'false',
          },
        ],
      },
      render: (_, rowData) => (
        <div className={style['check-circle']}>
          {(rowData.GetParamsTotal > 0 || rowData.PostParamsTotal > 0) && (
            <CheckCircleIcon
              className={classNames({
                [style['check-circle-icon']]: !isCellRedSingleColor(rowData.cellClassName),
              })}
            />
          )}
        </div>
      ),
    },
    {
      title: t('HTTPFlowTable.contentType'),
      dataKey: 'ContentType',
      width: 150,
      render: (text) => {
        let contentTypeFixed =
          text
            .split(';')
            .map((el: string) => el.trim())
            .filter((i: string) => !i.startsWith('charset'))
            .join(',') || '-'
        if (contentTypeFixed.includes('/')) {
          const contentTypeFixedNew = contentTypeFixed.split('/').pop()
          if (contentTypeFixedNew) {
            contentTypeFixed = contentTypeFixedNew
          }
        }
        return <div>{contentTypeFixed === 'null' ? '' : contentTypeFixed}</div>
      },
      filterProps: {
        filtersType: 'select',
        filterMultiple: true,
        filterSearchInputProps: {
          size: 'small',
        },
        filters: contentType,
      },
    },
    {
      title: t('HTTPFlowTable.pathSuffix'),
      dataKey: 'PathSuffix',
      width: 100,
      filterProps: {
        filterKey: 'IncludeSuffix',
        filtersType: 'select',
        filterMultiple: true,
        filterSearchInputProps: { size: 'small' },
        filters: suffixList,
      },
      render: (_, rowData) => <div>{formatHTTPFlowPathSuffix(rowData.Path || '', rowData.PathSuffix)}</div>,
    },
    {
      title: t('HTTPFlowTable.durationMs'),
      dataKey: 'DurationMs',
      width: 120,
      render: (text, rowData) => {
        const timeMs = parseInt(text)
        return (
          <div
            className={classNames({
              [style['duration-ms']]: !isCellRedSingleColor(rowData.cellClassName),
            })}
          >
            {timeMs}
          </div>
        )
      },
    },
    {
      title: t('HTTPFlowTable.updatedAt'),
      dataKey: 'UpdatedAt',
      filterProps: {
        filterKey: 'UpdatedAt',
        filtersType: 'dateTime',
      },
      width: 200,
      render: (text) => <div title={formatTimestamp(text)}>{text === 0 ? '-' : formatTimestamp(text)}</div>,
    },
    {
      title: t('HTTPFlowTable.requestSizeVerbose'),
      dataKey: 'RequestSizeVerbose',
      enableDrag: false,
      width: 120,
      render: (text, { RequestLength }) =>
        `${RequestLength || text.slice(0, -1)}${RequestLength > 1024 ? `（${text}）` : ''}`,
    },
    {
      title: t('YakitTable.action'),
      dataKey: 'action',
      width: 104,
      fixed: 'right',
      render: (_, rowData) => {
        if (!rowData.Hash) return <></>
        const colorType = getSingleColorType(rowData.cellClassName)
        const favorite = isHTTPFlowFavorite(rowData)
        return (
          <div
            className={classNames(style['action-btn-group'], {
              [style[`hover-${colorType}-row`]]: !!colorType,
            })}
          >
            {favorite ? (
              <SolidStarIcon
                className={classNames(style['favorite-icon-active'], style['icon-hover'])}
                onClick={(e) => actionHandlers.onToggleFavorite(e, rowData, false)}
              />
            ) : (
              <OutlineStarIcon
                className={classNames(style['favorite-icon'], style['icon-hover'], {
                  [style['icon-style']]: !colorType,
                })}
                onClick={(e) => actionHandlers.onToggleFavorite(e, rowData, true)}
              />
            )}
            <div className={style['divider-style']} />
            <ChromeFrameSvgIcon
              className={classNames(style['icon-hover'], {
                [style['icon-style']]: !colorType,
              })}
              onClick={(e) => actionHandlers.onOpenInBrowser(e, rowData)}
            />
            <div className={style['divider-style']}></div>
            <ArrowCircleRightSvgIcon
              className={classNames(style['icon-hover'], {
                [style['icon-style']]: !colorType,
              })}
              onClick={(e) => actionHandlers.onExpand(e, rowData)}
            />
          </div>
        )
      },
    },
  ]
}

/** 按用户配置排序、过滤列，并生成高级设置所需的列配置 */
export const resolveHTTPFlowTableColumns = (
  options: ResolveHTTPFlowTableColumnsOptions,
): ResolveHTTPFlowTableColumnsResult => {
  const { columnArr, columnsOrder, excludeColumnsKey, setIdFixed } = options

  let finalColumns: ColumnsTypeProps[] = []

  if (columnsOrder.length) {
    const idColumn = columnArr.find((col) => col.dataKey === 'Id')
    const actionColumn = columnArr.find((col) => col.dataKey === 'action')
    const middleColumns = columnArr.filter((item) => !['Id', 'action', ...noColumnsKey].includes(item.dataKey))
    const orderMap = buildColumnOrderMap(columnsOrder)
    const sortedColumns = [...middleColumns].sort((a, b) => compareByColumnOrder(a.dataKey, b.dataKey, orderMap))

    if (idColumn) finalColumns.push(idColumn)
    sortedColumns.forEach((col) => {
      finalColumns.push(col)
    })
    if (actionColumn) finalColumns.push(actionColumn)
  } else {
    finalColumns = columnArr.slice()
  }

  const configColumns = finalColumns
    .filter((item) => !['Id', 'action', ...noColumnsKey].includes(item.dataKey))
    .map((item) => ({
      dataKey: item.dataKey,
      title: item.title,
      isShow: !excludeColumnsKey.includes(item.dataKey),
    }))

  const columns = finalColumns.filter((ele) => !excludeColumnsKey.includes(ele.dataKey))
  setIdFixed(columns.length !== 2)

  return { columns, configColumns }
}

/** 合并远程列顺序与默认列顺序，补全新增列 */
export const mergeHTTPFlowColumnsOrder = (remoteOrder: string[], defaultOrder: string[]) => {
  const arr2 = remoteOrder.filter((key) => defaultOrder.includes(key))
  defaultOrder.forEach((key, idx) => {
    if (!arr2.includes(key)) {
      const insertIdx = arr2.findIndex((k) => defaultOrder.indexOf(k) > idx)
      if (insertIdx === -1) {
        arr2.push(key)
      } else {
        arr2.splice(insertIdx, 0, key)
      }
    }
  })
  return arr2.filter((key) => !isHTTPFlowSpecialCustomColumn(key))
}
