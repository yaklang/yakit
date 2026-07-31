import { type API } from '@/services/swagger/resposeType'
import { type UserInfoProps } from '@/store'
import type { SaveDialogResponse } from './utils'

export interface NotepadManageProps {}

export interface NotepadActionProps {
  record: API.GetNotepadList
  userInfo: UserInfoProps
  onSingleDownAfter: (res: SaveDialogResponse) => void
  onShareAfter: () => void
  onSingleRemoveAfter: () => void
}
