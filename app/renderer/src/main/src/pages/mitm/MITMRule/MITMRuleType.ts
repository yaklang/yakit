export interface MITMRuleProp {
    visible: boolean
    setVisible: (b: boolean) => void
    getContainer?: HTMLElement | (() => HTMLElement) | false
}
