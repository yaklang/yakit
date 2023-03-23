export interface MITMRuleExportProps {
    visible: boolean
    setVisible: (b: boolean) => void
}

export interface MITMRuleImportProps {
    visible: boolean
    setVisible: (b: boolean) => void
    onOk?: () => void
    isUseDefRules?: boolean
}
