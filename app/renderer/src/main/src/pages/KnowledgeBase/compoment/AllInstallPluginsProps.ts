interface ExecResult {
    Progress: number
    IsMessage: boolean
    Message?: Uint8Array
}

interface BinaryInfo {
    Name: string
    InstallPath: string
    installToken: string
    Description: string
}

interface AllInstallPluginsProps {
    onInstallPlug: (installPlug: boolean) => void
    binariesToInstall: BinaryInfo[] | undefined
    binariesToInstallRefreshAsync: () => Promise<any[]>
}

export type {ExecResult, BinaryInfo, AllInstallPluginsProps}
