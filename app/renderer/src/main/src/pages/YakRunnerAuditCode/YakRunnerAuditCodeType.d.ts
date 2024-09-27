import {AuditYakUrlProps} from "./AuditCode/AuditCodeType"
export interface YakRunnerAuditCodeProps {
}

export interface Selection {
    startLineNumber: number // 开始-行号
    startColumn: number // 开始-字符位置
    endLineNumber: number // 结束-行号
    endColumn: number // 结束-字符位置
}

// 打开文件信息
export interface OpenFileByPathProps {
    params: {
        path: string
        name: string
        parent?: string | null
        highLightRange?: Selection
    }
    // 是否记录历史
    isHistory?: boolean
    // 是否为外部选择打开(用于审计文件树打开)
    isOutside?: boolean
}

export interface AuditEmiterYakUrlProps extends AuditYakUrlProps {
    Body: string
}
