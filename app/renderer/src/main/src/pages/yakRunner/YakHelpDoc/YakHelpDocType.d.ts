import {YakURLResource,YakURL} from "../../yakURLTree/data"
export interface YakHelpDocProps {}

export interface DataProps {
    title: string
    key: string
    data: YakURLResource
    isLeaf: boolean
}

export interface YakHelpDocItemLoadProps {
    info: DataProps
}