import { Theme } from '@/hook/useTheme'
import { FormInstance } from 'antd'
import { languages } from 'monaco-editor'

// 自定义代码片段 tag props
type TCodeCustomizeTagProps = {
  value: string[]
  onChange: (val: TCodeCustomizeTagProps['value']) => TCodeCustomizeTagProps['value']
}

// 添加 / 编辑代码片段 弹窗props
type CodeCustomizeModalProps = {
  form: FormInstance<unknown>
  theme: Theme
  visible: boolean
  title: string
  onOk?: () => void
  codeCustomizeModalVisible: () => void
  confirmLoading: boolean
}

// 获取自定义代码片段
type TCustomCodeGeneral<T> = {
  Code: T
  Descriptions: T
  Names: T
  States: T
  Level: any
}

interface TCustomEditorCodeGeneral<T> extends TCustomCodeGeneral<T> {
  Target: T
}

type TQueryCustomCodeRequest = {
  Filter: Record<'Name', string[]>
}

// 根据输入 data 推导出单行的类型
type RowOf<T extends Record<string, any[]>> = {
  [K in keyof T as K extends `${infer S}s` ? S : K]: T[K][number]
}

/** 将「列数组」结构转为行对象数组（与 UI 解耦，供 monacoSpec 等轻量引用） */
export const getAllRows = <T extends Record<string, any[]>>(data: T): RowOf<T>[] => {
  const keys = Object.keys(data) as (keyof T)[]
  const length = Math.max(...keys.map((k) => data[k].length))

  return Array.from({ length }, (_, index) =>
    keys.reduce((obj, key) => {
      const arr = data[key]
      if (Array.isArray(arr) && index < arr.length) {
        // 将 key 末尾的 s 去掉
        const singular = (key as string).replace(/s$/, '')
        ;(obj as any)[singular] = arr[index]
      }
      return obj
    }, {} as RowOf<T>),
  )
}

export type {
  TCodeCustomizeTagProps,
  CodeCustomizeModalProps,
  TCustomCodeGeneral,
  TQueryCustomCodeRequest,
  RowOf,
  TCustomEditorCodeGeneral,
}
