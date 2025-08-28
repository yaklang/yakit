import { Theme } from "@/hook/useTheme"
import { FormInstance } from "antd"

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
}

export type {TCodeCustomizeTagProps, CodeCustomizeModalProps}