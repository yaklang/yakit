import {PopconfirmProps} from "antd"

export interface YakitPopconfirmProp extends Omit<PopconfirmProps, "title"> {
    title: React.ReactNode
}
