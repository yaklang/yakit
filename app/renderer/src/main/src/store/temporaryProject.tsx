import { setLocalValue } from "@/utils/kv"
import { RemoteGV } from "@/yakitGV"
import {create} from "zustand"
import {persist} from "zustand/middleware"

interface TemporaryProjectStoreProps {
    temporaryProjectId: string
    temporaryProjectNoPromptFlag: boolean
    setTemporaryProjectId: (id: string) => void
    setTemporaryProjectNoPromptFlag: (flag: boolean) => void
}

export const useTemporaryProjectStore = create<TemporaryProjectStoreProps>()(
    persist(
        (set, get) => ({
            temporaryProjectId: "",
            temporaryProjectNoPromptFlag: false,
            setTemporaryProjectId: (id: string) => {
                set({temporaryProjectId: id})
                setLocalValue(RemoteGV.TemporaryProjectId, id)
            },
            setTemporaryProjectNoPromptFlag: (flag: boolean) => {
                set({temporaryProjectNoPromptFlag: flag})
            }
        }),
        {
            name: "temporary-project"
        }
    )
)
