import {MultipleNodeInfo} from "../MainOperatorContentType"

export interface BatchEditGroupProps {
    groupName:string
    /**组内得tab页 */
    groupChildren: MultipleNodeInfo[]
    /**所有得tab页 */
    tabList: MultipleNodeInfo[]
    onFinish: (checkList: MultipleNodeInfo[]) => void
    onCancel: () => void
}
