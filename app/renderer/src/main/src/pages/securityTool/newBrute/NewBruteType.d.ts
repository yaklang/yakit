export interface NewBruteProps {
    id: string
}

export interface BruteTypeTreeListProps {
    bruteType: React.Key[]
    setBruteType: (v: React.Key[]) => void
}

export interface BruteExecuteProps {
    type: string
}
