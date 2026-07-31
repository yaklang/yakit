import type { ColumnsTypeProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import type {
  debugVirtualTableEventProps,
  ParamsTProps,
} from '@/hook/useHttpVirtualTableHook/useHttpVirtualTableHookType'
import type { API } from '@/services/swagger/resposeType'
import type { RangeTimeProps } from '../DataStatistics'

export interface UserTableProps {
  ref: React.ForwardedRef<UserTableRefProps>
}

export interface IPTableProps {
  ref: React.ForwardedRef<IPTableRefProps>
}

export interface UserTableRefProps {
  debugVirtualTableEvent: debugVirtualTableEventProps<API.TouristUsedDetail>
  setRangeTime: (rangeTime: RangeTimeProps) => void
  getTableParams: () => ParamsTProps
  getTotal: () => number
  getColumns: () => ColumnsTypeProps[]
}

export interface IPTableRefProps {
  debugVirtualTableEvent: debugVirtualTableEventProps<API.TouristUsedDetail>
  setRangeTime: (rangeTime: RangeTimeProps) => void
  getTableParams: () => ParamsTProps
  getTotal: () => number
  getColumns: () => ColumnsTypeProps[]
}
