import {API} from "@/services/swagger/resposeType"

export interface NotepadShareModalProps {
    notepadInfo: API.GetNotepadList
    onClose: () => void
}

export interface SelectUserProps {
    id: number
    name: string
}
export interface NotepadCollaboratorInfoProps extends API.CollaboratorInfo {
    imgNode?: ReactNode
}

export interface NotepadRoleProps {
    adminPermission: "admin"
    viewPermission: "view"
    editPermission: "edit"
    removePermission: ""
}

export type NotepadPermissionType = NotepadRoleProps[keyof NotepadRoleProps]
