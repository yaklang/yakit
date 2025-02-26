import {CustomMilkdownProps} from "@/components/MilkdownEditor/MilkdownEditorType"

export interface MilkdownDiffEditorProps extends DiffMilkdownProps {}

export interface DiffMilkdownProps extends Omit<CustomMilkdownProps, "collabProps" | "onSaveContentBeforeDestroy"> {
    ref?: React.ForwardedRef<MilkdownDiffRefProps>
}

export interface MilkdownDiffRefProps {
    onVersionComparison: (version, perVersion) => void
}
