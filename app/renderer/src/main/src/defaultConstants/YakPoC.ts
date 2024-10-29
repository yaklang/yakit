import {PocPageInfoProps} from "@/store/pageInfo"

export const defaultPocPageInfo: PocPageInfoProps = {
    selectGroup: [],
    selectGroupListByKeyWord: [],
    formValue: {},
    https: false,
    httpFlowIds: [],
    request: new Uint8Array(),
    runtimeId: "",
    hybridScanMode: "new",
    defGroupKeywords: ""
}
