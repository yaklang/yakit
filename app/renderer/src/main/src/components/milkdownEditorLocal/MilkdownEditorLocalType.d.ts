import {CustomMilkdownProps} from "../MilkdownEditor/MilkdownEditorType"

export interface MilkdownEditorLocalProps extends LocalMilkdownProps {}

export interface LocalMilkdownProps extends Omit<CustomMilkdownProps, "collabProps"> {}

export interface MilkdownEditorLocalProps {}
