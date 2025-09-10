import React, {useEffect, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {
    apiCreateSSARiskDisposals,
    apiGetSSARiskDisposal,
    CreateSSARiskDisposalsRequest,
    SSARiskDisposalData
} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/utils"
import {
    AuditResultHistory,
    YakitRiskSelectTag
} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTable"
import {SSARisk} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {RightBugAuditResultHeader} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
export interface HoleDisposeProps {
    RiskHash: string
    info?: SSARisk
}
export const HoleDispose: React.FC<HoleDisposeProps> = (props) => {
    const {RiskHash, info} = props
    const [disposalData, setDisposalData] = useState<SSARiskDisposalData[]>()
    const getSSARiskDisposal = useMemoizedFn((RiskHash) => {
        apiGetSSARiskDisposal({RiskHash}).then((data) => {
            setDisposalData(data.Data || [])
        })
    })

    useEffect(() => {
        setDisposalData(undefined)
        getSSARiskDisposal(RiskHash)
    }, [RiskHash])

    const onCreateTags = useMemoizedFn((params: CreateSSARiskDisposalsRequest) => {
        apiCreateSSARiskDisposals(params).then(() => {
            if (RiskHash) {
                getSSARiskDisposal(RiskHash)
            }
        })
    })

    const onOpenSelect = useMemoizedFn((record: SSARisk) => {
        const m = showYakitModal({
            title: (
                <div className='content-ellipsis'>
                    序号【{record.Id}】- {record.TitleVerbose || record.Title}
                </div>
            ),
            content: <YakitRiskSelectTag ids={[record.Id]} onClose={() => m.destroy()} onCreate={onCreateTags} />,
            footer: null,
            onCancel: () => {
                m.destroy()
            }
        })
    })

    return (
        <div>
            {info && disposalData && (
                <>
                    <RightBugAuditResultHeader
                        info={info}
                        extra={<YakitButton onClick={() => onOpenSelect(info)}>处置</YakitButton>}
                    />
                    {disposalData.length > 0 ? (
                        <AuditResultHistory
                            info={info}
                            disposalData={disposalData}
                            setDisposalData={setDisposalData}
                            style={{padding: "4px 12px 0px"}}
                        />
                    ) : (
                        <YakitEmpty title='暂无漏洞处置信息' />
                    )}
                </>
            )}
        </div>
    )
}
