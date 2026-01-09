import React, {useState} from "react"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useMemoizedFn} from "ahooks"

interface ExportAILogsModalProps {
    visible: boolean
    onCancel: () => void
    onOk: (data: {types: string[]; outputPath: string}) => void
    loading?: boolean
}

const ExportTypes = [
    {label: "Checkpoints", value: "checkpoints"},
    {label: "Memory", value: "memory"},
    {label: "Timeline", value: "timeline"},
    {label: "Output Event", value: "output_event"}
]

export const ExportAILogsModal: React.FC<ExportAILogsModalProps> = (props) => {
    const {visible, onCancel, onOk, loading} = props
    const [types, setTypes] = useState<string[]>(["checkpoints", "memory", "timeline", "output_event"])
    // const [outputPath, setOutputPath] = useState<string>("")

    const handleOk = useMemoizedFn(() => {
        onOk({types, outputPath: ""})
    })

    const toggleType = useMemoizedFn((value: string) => {
        if (types.includes(value)) {
            setTypes((old) => old.filter((t) => t !== value))
        } else {
            setTypes((old) => [...old, value])
        }
    })

    return (
        <YakitModal
            title='导出 AI 日志'
            visible={visible}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={loading}
            width={520}
            type='white'
            bodyStyle={{padding: 0}}
        >
            <div
                style={{
                    marginBottom: 16,
                    padding: "8px 24px",
                    fontWeight: 400,
                    fontSize: 12,
                    lineHeight: "16px",
                    color: "var(--Colors-Use-Neutral-Text-1-Title)",
                    backgroundColor: "var(--Colors-Use-Success-Bg)"
                }}
            >
                远程模式下导出后请打开~memfit\yakit-projects\temp路径查看导出文件
            </div>
            <div style={{display: "flex", flexDirection: "column", gap: 24, padding: "8px 16px"}}>
                <div style={{display: "flex", flexDirection: "column", gap: 12}}>
                    <div style={{color: "var(--text-title-color)", fontWeight: 500}}>导出内容</div>
                    <div style={{display: "flex", gap: 16, flexWrap: "wrap"}}>
                        {ExportTypes.map((opt) => (
                            <YakitCheckbox
                                key={opt.value}
                                checked={types.includes(opt.value)}
                                onChange={() => toggleType(opt.value)}
                            >
                                {opt.label}
                            </YakitCheckbox>
                        ))}
                    </div>
                </div>
                {/* <div style={{display: "flex", flexDirection: "column", gap: 12}}>
                    <div style={{color: "var(--text-title-color)", fontWeight: 500}}>
                        导出路径 <span style={{color: "var(--text-sub-color)", fontSize: 12, fontWeight: 400}}>(可选)</span>
                    </div>
                    <YakitInput
                        placeholder='留空则使用默认路径'
                        value={outputPath}
                        onChange={(e) => setOutputPath(e.target.value)}
                    />
                </div> */}
            </div>
        </YakitModal>
    )
}
