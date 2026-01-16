import {Dispatch, SetStateAction} from "react"
import {AIInputEvent} from "../hooks/grpcApi"

export interface AIFocusModeProps {
    value: AIInputEvent["FocusModeLoop"]
    onChange: Dispatch<SetStateAction<AIInputEvent["FocusModeLoop"]>>
}
