type TTaskState = "success" | "error" | "in-progress"

type TAiTemplateHeaderProps = {
    name: string
    type: TTaskState
    describe: string
}

export type {TTaskState, TAiTemplateHeaderProps}
