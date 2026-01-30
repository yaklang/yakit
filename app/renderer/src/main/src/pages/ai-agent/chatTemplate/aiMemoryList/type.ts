export interface AIMemoryListProps {}
export interface AIMemoryScoreEchartsProps extends AIMemoryEchartsProps{}
export interface AIMemoryEchartsProps extends React.HTMLAttributes<HTMLDivElement> {
    data: {
        xData: string[]
        yData: number[]
    }
}
