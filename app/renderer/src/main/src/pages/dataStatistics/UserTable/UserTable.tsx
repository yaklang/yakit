import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useInViewport, useMemoizedFn } from 'ahooks'
import { NetWorkApi } from '@/services/fetch'
import { API } from '@/services/swagger/resposeType'
import styles from './UserTable.module.scss'
import { IPTableProps, UserTableProps } from './UserTableType'
import { TableVirtualResize } from '@/components/TableVirtualResize/TableVirtualResize'
import moment from 'moment'
import { OutlineSearchIcon } from '@/assets/icon/outline'
import { ColumnsTypeProps, SortProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import useHttpVirtualTableHook from '@/hook/useHttpVirtualTableHook/useHttpVirtualTableHook'
import ReactResizeDetector from 'react-resize-detector'
import { RangeTimeProps } from '../DataStatistics'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export const UserTable: React.FC<UserTableProps> = React.memo(
  forwardRef((_, ref) => {
    const { t } = useI18nNamespaces(['dataStatistics'])
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const onFirst = useMemoizedFn(() => {
      setIsRefresh(!isRefresh)
    })

    const apiQueryTouristUsedDetail = useMemoizedFn((params: API.TouristUsedDetailRequest) => {
      return NetWorkApi<API.TouristUsedDetailRequest, API.TouristUsedDetailResponse>({
        method: 'post',
        url: 'tourist/used',
        data: {
          ...params,
        },
      })
    })

    // 此处为table的表格数据 使用此hook需满足与后端约定的请求、响应格式
    const tableBoxRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<any>(null)
    const boxHeightRef = useRef<number>(0)
    const [inViewport = true] = useInViewport(tableBoxRef)
    const [tableParams, tableData, tableTotal, pagination, tableLoading, offsetData, debugVirtualTableEvent] =
      useHttpVirtualTableHook<API.TouristUsedDetailRequest, API.TouristUsedDetail, 'Data', 'Id'>({
        tableBoxRef,
        tableRef,
        boxHeightRef,
        grpcFun: apiQueryTouristUsedDetail,
        // initResDataFun,
        onFirst,
      })

    const columns: ColumnsTypeProps[] = useMemo(
      () => [
        {
          title: t('UserTable.userName'),
          dataKey: 'userName',
          filterProps: {
            filterKey: 'name',
            filtersType: 'input',
            filterIcon: <OutlineSearchIcon className={styles['filter-icon']} />,
          },
          render: (text, record) => text || record.ip,
        },
        {
          title: t('UserTable.nickName'),
          dataKey: 'nickName',
          width: 120,
          // filterProps: {
          //   filterKey: 'userName',
          //   filtersType: 'input',
          //   filterIcon: <OutlineSearchIcon className={styles['filter-icon']} />,
          // },
        },
        {
          title: t('UserTable.lastLoginTime'),
          dataKey: 'updated_at',
          ellipsis: true,
          render: (text) => <span>{moment.unix(text).format('YYYY-MM-DD HH:mm')}</span>,
        },
        {
          title: t('UserTable.usageDurationHours'),
          dataKey: 'totalRequestTimes',
        },
        {
          title: t('UserTable.organization'),
          dataKey: 'departmentName',
        },
      ],
      [t],
    )

    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
      let sort = { ...newSort }
      const finalParams = {
        ...tableParams,
        order: sort.order,
        order_by: sort.orderBy,
        ...filter,
      }
      debugVirtualTableEvent.setP(finalParams)
    })

    useImperativeHandle(
      ref,
      () => ({
        debugVirtualTableEvent: debugVirtualTableEvent,
        setRangeTime: (rangeTime: RangeTimeProps) => {
          debugVirtualTableEvent.setP({
            ...tableParams,
            ...rangeTime,
          })
        },
        getTableParams: () => tableParams,
        getTotal: () => tableTotal,
        getColumns: () => columns,
      }),
      [tableParams, tableTotal, columns],
    )

    /**table所在的div大小发生变化 */
    const onTableResize = useMemoizedFn((width, height) => {
      if (!width || !height) {
        return
      }
      //   if (!currentSelectItem?.Id) {
      // 窗口由小变大时 重新拉取数据
      if (boxHeightRef.current && boxHeightRef.current < height) {
        boxHeightRef.current = height
        // updateData()
      } else {
        boxHeightRef.current = height
      }
      //   }
    })
    return (
      <div className={styles['ip-table']} ref={tableBoxRef}>
        <ReactResizeDetector
          onResize={onTableResize}
          handleWidth={true}
          handleHeight={true}
          refreshMode={'debounce'}
          refreshRate={50}
        />
        <TableVirtualResize<API.TouristUsedDetail>
          ref={tableRef}
          query={tableParams}
          loading={tableLoading}
          isRefresh={isRefresh}
          isShowTitle={false}
          renderKey={'id'}
          data={tableData}
          pagination={{
            total: tableTotal,
            limit: pagination.limit,
            page: pagination.page,
            onChange: (page, limit) => {},
          }}
          columns={columns}
          enableDrag={true}
          onChange={onTableChange}
        />
      </div>
    )
  }),
)

export const IPTable: React.FC<IPTableProps> = React.memo(
  forwardRef((_, ref) => {
    const { t } = useI18nNamespaces(['dataStatistics'])
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const onFirst = useMemoizedFn(() => {
      setIsRefresh(!isRefresh)
    })

    const apiQueryTouristUsedDetail = useMemoizedFn((params: API.TouristUsedDetailRequest) => {
      return NetWorkApi<API.TouristUsedDetailRequest, API.TouristUsedDetailResponse>({
        method: 'post',
        url: 'tourist/used/detail',
        data: {
          ...params,
        },
      })
    })

    // 此处为table的表格数据 使用此hook需满足与后端约定的请求、响应格式
    const tableBoxRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<any>(null)
    const boxHeightRef = useRef<number>(0)
    const [inViewport = true] = useInViewport(tableBoxRef)
    const [tableParams, tableData, tableTotal, pagination, tableLoading, offsetData, debugVirtualTableEvent] =
      useHttpVirtualTableHook<API.TouristUsedDetailRequest, API.TouristUsedDetail, 'Data', 'Id'>({
        tableBoxRef,
        tableRef,
        boxHeightRef,
        grpcFun: apiQueryTouristUsedDetail,
        // initResDataFun,
        onFirst,
      })

    const columns: ColumnsTypeProps[] = useMemo(
      () => [
        {
          title: t('UserTable.userName'),
          dataKey: 'userName',
          filterProps: {
            filterKey: 'name',
            filtersType: 'input',
            filterIcon: <OutlineSearchIcon className={styles['filter-icon']} />,
          },
          render: (text, record) => text || record.ip,
        },
        {
          title: t('UserTable.ipColumn'),
          dataKey: 'ip',
          width: 120,
          filterProps: {
            filterKey: 'ip',
            filtersType: 'input',
            filterIcon: <OutlineSearchIcon className={styles['filter-icon']} />,
          },
        },
        {
          title: t('UserTable.lastLoginTime'),
          dataKey: 'updated_at',
          ellipsis: true,
          render: (text) => <span>{moment.unix(text).format('YYYY-MM-DD HH:mm')}</span>,
        },
        {
          title: t('UserTable.usageDurationHours'),
          dataKey: 'totalRequestTimes',
        },
        {
          title: t('UserTable.organization'),
          dataKey: 'departmentName',
        },
      ],
      [t],
    )

    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
      let sort = { ...newSort }
      const finalParams = {
        ...tableParams,
        order: sort.order,
        order_by: sort.orderBy,
        ...filter,
      }
      debugVirtualTableEvent.setP(finalParams)
    })

    useImperativeHandle(
      ref,
      () => ({
        debugVirtualTableEvent: debugVirtualTableEvent,
        setRangeTime: (rangeTime: RangeTimeProps) => {
          debugVirtualTableEvent.setP({
            ...tableParams,
            ...rangeTime,
          })
        },
        getTableParams: () => tableParams,
        getTotal: () => tableTotal,
        getColumns: () => columns,
      }),
      [tableParams, tableTotal, columns],
    )

    /**table所在的div大小发生变化 */
    const onTableResize = useMemoizedFn((width, height) => {
      if (!width || !height) {
        return
      }
      //   if (!currentSelectItem?.Id) {
      // 窗口由小变大时 重新拉取数据
      if (boxHeightRef.current && boxHeightRef.current < height) {
        boxHeightRef.current = height
        // updateData()
      } else {
        boxHeightRef.current = height
      }
      //   }
    })
    return (
      <div className={styles['ip-table']} ref={tableBoxRef}>
        <ReactResizeDetector
          onResize={onTableResize}
          handleWidth={true}
          handleHeight={true}
          refreshMode={'debounce'}
          refreshRate={50}
        />
        <TableVirtualResize<API.TouristUsedDetail>
          ref={tableRef}
          query={tableParams}
          loading={tableLoading}
          isRefresh={isRefresh}
          isShowTitle={false}
          renderKey={'id'}
          data={tableData}
          pagination={{
            total: tableTotal,
            limit: pagination.limit,
            page: pagination.page,
            onChange: (page, limit) => {},
          }}
          columns={columns}
          enableDrag={true}
          onChange={onTableChange}
        />
      </div>
    )
  }),
)
