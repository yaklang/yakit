import {Theme} from "@/hook/useTheme"
import {FormInstance} from "antd"
import { languages } from "monaco-editor"

// 自定义代码片段 tag props
type TCodeCustomizeTagProps = {
    value: string[]
    onChange: (val: TCodeCustomizeTagProps["value"]) => TCodeCustomizeTagProps["value"]
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
    Filter: Record<"Name", string[]>
}

// 根据输入 data 推导出单行的类型
type RowOf<T extends Record<string, any[]>> = {
    [K in keyof T as K extends `${infer S}s` ? S : K]: T[K][number]
}

export type {
    TCodeCustomizeTagProps,
    CodeCustomizeModalProps,
    TCustomCodeGeneral,
    TQueryCustomCodeRequest,
    RowOf,
    TCustomEditorCodeGeneral
}
