import {FormInstance} from "antd"
import {PortScanExecuteExtraFormValue} from "../securityTool/newPortScan/NewPortScanType"
import {SimpleDetectExtraParam} from "./SimpleDetectExtraParamsDrawer"

export interface SimpleDetectProps {
    pageId: string
}

export interface SimpleDetectForm {
    Targets: string
    scanType: "基础扫描" | "专项扫描"
    scanDeep: number
    SkippedHostAliveScan: boolean
    pluginGroup: string[]
}
export interface SimpleDetectFormContentProps {
    disabled: boolean
    inViewport: boolean
    form: FormInstance<SimpleDetectForm>
    refreshGroup: boolean
}

export interface SimpleDetectValueProps {
    formValue: SimpleDetectForm | null
    extraParamsValue: SimpleDetectExtraParam | null
}
