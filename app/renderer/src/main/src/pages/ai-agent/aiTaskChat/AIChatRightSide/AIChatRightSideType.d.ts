import {AIChatMessage} from "../../type/aiChat"

export interface AIChatRightSideProps {
    expand: boolean
    setExpand: Dispatch<SetStateAction<boolean>>
    systemOutputs: AIChatMessage.AIChatSystemOutput[]
}
