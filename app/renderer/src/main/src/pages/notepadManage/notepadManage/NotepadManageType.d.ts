import {YakitHintProps} from "@/components/yakitUI/YakitHint/YakitHintType"
import {API} from "@/services/swagger/resposeType"
import {UserInfoProps} from "@/store"
import {PageNodeItemProps} from "@/store/pageInfo"
import {ReactNode} from "react"

export interface NotepadManageProps {}

export interface NotepadActionProps {
    record: API.GetNotepadList
    notepadPageList?: PageNodeItemProps[]
    userInfo: UserInfoProps
    onSingleDownAfter: (res: SaveDialogResponse) => void
    onShareAfter: () => void
    onSingleRemoveAfter: () => void
}
