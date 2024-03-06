import {YakScript} from "@/pages/invoker/schema"
import {ExpandAndRetractExcessiveState} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {PortScanParams} from "@/pages/portscan/PortScanPage"

export interface NewPortScanProps {}

export interface NewPortScanExecuteProps {
    hidden: boolean
    setHidden: (b: boolean) => void
    selectList: YakScript[]
    setSelectList: (s: YakScript[]) => void
}
export interface NewPortScanExecuteContentProps {
    isExpand: boolean
    isExecuting: boolean
    setExecuteStatus: (b: ExpandAndRetractExcessiveState) => void
    selectNum: number
}

export interface NewPortScanExecuteFormProps {
    form: FormInstance<any>
    disabled: boolean
}

export interface PortScanExecuteExtraFormValue extends PortScanParams {}
