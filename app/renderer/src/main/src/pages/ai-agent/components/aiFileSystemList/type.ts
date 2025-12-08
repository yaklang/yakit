import { UseYakExecResultState } from "@/pages/ai-re-act/hooks/type";

export enum TabKey {
    FileTree = "file-tree",
    OperationLog = "operation-log"
}
export interface AIFileSystemListProps {
    execFileRecord:UseYakExecResultState["execFileRecord"]
    activeKey?: TabKey
}
