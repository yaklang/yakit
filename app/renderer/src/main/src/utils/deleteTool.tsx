import { failed } from './notification'

interface removeProps<T, R = any> {
  selectedRowKeys: string[] | number[]
  params: T
  interfaceName?: string
  execute: (params: any) => Promise<R>
  isShowError?: boolean
  noEnterQuery?: string[] // 查询条件不需要添加
  selectedRowKeysNmae?: string
}

export const onRemoveToolFC = (props: removeProps<any>) => {
  const {
    params,
    selectedRowKeys = [],
    interfaceName,
    execute,
    isShowError = true,
    noEnterQuery = [],
    selectedRowKeysNmae = 'Ids',
  } = props
  let newParams = {}
  let newNoEnterQuery = ['Pagination', ...noEnterQuery]
  const queryHaveValue = {}
  // 找出有查询条件
  for (const key in params) {
    const objItem = params[key]
    if (!newNoEnterQuery.includes(key) && objItem) {
      queryHaveValue[key] = params[key]
    }
  }
  if (selectedRowKeys.length > 0) {
    // 删除选择的数据
    newParams = {
      [selectedRowKeysNmae]: selectedRowKeys,
    }
  } else if (Object.getOwnPropertyNames(queryHaveValue).length > 0) {
    // 删除带查询条件的数据
    newParams = {
      Filter: {
        ...queryHaveValue,
      },
    }
  } else {
    // 删除所有
    newParams = {
      DeleteAll: true,
    }
  }
  return execute(newParams).catch((e: any) => {
    if (isShowError) failed(`${interfaceName || 'remove'} failed: ${e}`)
    throw e
  })
}
