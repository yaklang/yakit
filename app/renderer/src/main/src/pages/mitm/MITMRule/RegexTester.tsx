import React, {useEffect, useState} from "react"
import {useDebounceEffect, useMemoizedFn} from "ahooks"
import {editor} from "monaco-editor"
import * as monaco from "monaco-editor"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import styles from "./RegexTester.module.scss"
import {RegexpInput} from "./MITMRuleFromModal"
import {StringToUint8Array} from "@/utils/str"
import {yakitFailed} from "@/utils/notification"
import {OutlinePositionIcon} from "@/assets/icon/outline"

const {ipcRenderer} = window.require("electron")

interface RegexTesterProps {
    onSave: (pattern: string) => void
    defaultCode?: string
}

interface MatchResult {
    fullMatch: string
    index: number
    length: number
}

export const RegexTester: React.FC<RegexTesterProps> = React.memo((props) => {
    const {onSave, defaultCode = ""} = props
    const {t} = useI18nNamespaces(["mitm", "webFuzzer"])

    const [regexPattern, setRegexPattern] = useState("")
    const [testText, setTestText] = useState(defaultCode)
    const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor>()
    const [matches, setMatches] = useState<MatchResult[]>([])
    const [decorations, setDecorations] = useState<string[]>([])
    const [matchedRegexp, setMatchedRegexp] = useState("")
    const [selectedText, setSelectedText] = useState("")
    const [activeMatchIndex, setActiveMatchIndex] = useState<number>()

    useEffect(() => {
        if (!editorInstance) return

        const disposable = editorInstance.onDidChangeCursorSelection(() => {
            const selection = editorInstance.getSelection()
            const model = editorInstance.getModel()
            if (selection && model) {
                setSelectedText(model.getValueInRange(selection))
            }
        })

        return () => disposable.dispose()
    }, [editorInstance])

    useDebounceEffect(
        () => {
            if (!selectedText || !testText) return

            ipcRenderer
                .invoke("GenerateExtractRule", {
                    Data: StringToUint8Array(testText),
                    Selected: StringToUint8Array(selectedText)
                })
                .then((result: {SelectedRegexp: string}) => {
                    setMatchedRegexp(result.SelectedRegexp)
                })
                .catch((e) => {
                    yakitFailed(`${t("ExtractRegular.cannot_generate_data_extraction_rule")}${e}`)
                })
        },
        [selectedText, testText],
        {wait: 500}
    )

    const clearDecorations = useMemoizedFn(() => {
        if (editorInstance && decorations.length > 0) {
            editorInstance.deltaDecorations(decorations, [])
            setDecorations([])
        }
    })

    useDebounceEffect(
        () => {
            if (!regexPattern || !testText || !editorInstance) {
                setActiveMatchIndex(undefined)
                setMatches([])
                clearDecorations()
                return
            }

            const model = editorInstance.getModel()
            if (!model) return

            try {
                const regex = new RegExp(regexPattern, "g")
                const matchResults: MatchResult[] = []
                const newDecorations: editor.IModelDeltaDecoration[] = []

                let match
                let matchIndex = 0
                while ((match = regex.exec(testText)) !== null) {
                    matchResults.push({
                        fullMatch: match[0],
                        index: match.index,
                        length: match[0].length
                    })

                    const startPos = model.getPositionAt(match.index)
                    const endPos = model.getPositionAt(match.index + match[0].length)
                    const isActive = activeMatchIndex === matchIndex

                    newDecorations.push({
                        range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                        options: {
                            className: isActive ? "regex-match-highlight-active" : "regex-match-highlight"
                        }
                    })

                    matchIndex++
                    if (match.index === regex.lastIndex) {
                        regex.lastIndex++
                    }
                }

                setMatches(matchResults)
                const newDecorationIds = editorInstance.deltaDecorations(decorations, newDecorations)
                setDecorations(newDecorationIds)
            } catch (e) {
                setMatches([])
                clearDecorations()
            }
        },
        [regexPattern, testText, editorInstance, activeMatchIndex],
        {wait: 300}
    )

    const scrollToMatch = useMemoizedFn((match: MatchResult, index: number) => {
        setActiveMatchIndex(index)
        if (!editorInstance) return

        const model = editorInstance.getModel()
        if (!model) return

        const startPos = model.getPositionAt(match.index)
        const endPos = model.getPositionAt(match.index + match.length)
        const range = new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column)

        // 清除选中并滚动到目标位置
        editorInstance.setSelection(new monaco.Selection(0, 0, 0, 0))
        editorInstance.revealRangeInCenter(range, monaco.editor.ScrollType.Smooth)
    })

    const handleRegexSave = useMemoizedFn((val: string) => {
        setActiveMatchIndex(undefined)
        setRegexPattern(val)
        onSave(val)
    })

    return (
        <div className={styles["regex-tester"]}>
            <div className={styles["regex-tester-left"]}>
                <div className={styles["regex-input-section"]}>
                    <div className={styles["section-title"]}>{t("MatcherCollapse.regex")}：</div>
                    <YakitInput
                        value={regexPattern}
                        onChange={(e) => {
                            setActiveMatchIndex(undefined)
                            setRegexPattern(e.target.value)
                        }}
                    />
                </div>

                <div className={styles["test-text-section"]}>
                    <div className={styles["section-title"]}>{t("RegexTester.test_content")}：</div>
                    <div className={styles["editor-wrapper"]}>
                        <YakitEditor value={testText} setValue={setTestText} editorDidMount={setEditorInstance} />
                    </div>
                </div>

                <div className={styles["regexp-input-wrapper"]}>
                    <RegexpInput
                        regexp={matchedRegexp}
                        tagSize='large'
                        showCheck={true}
                        onSave={handleRegexSave}
                        onSure={(val) => {
                            setMatchedRegexp(val)
                            handleRegexSave(val)
                        }}
                    />
                </div>
            </div>

            <div className={styles["regex-tester-right"]}>
                <div className={styles["section-title"]}>{t("RegexTester.matching_results")}：</div>
                <div className={styles["matches-list"]}>
                    {matches.map((match, idx) => (
                        <div
                            key={idx}
                            className={classNames(styles["match-row"], {
                                [styles["match-row-active"]]: activeMatchIndex === idx
                            })}
                        >
                            <span className={styles["match-label"]}>Match {idx + 1}</span>
                            <span className={styles["match-position"]}>
                                {match.index}-{match.index + match.length}
                            </span>
                            <span className={styles["match-value"]}>{match.fullMatch}</span>
                            <OutlinePositionIcon
                                className={classNames(styles["position-icon"], {
                                    [styles["position-icon-active"]]: activeMatchIndex === idx
                                })}
                                onClick={() => scrollToMatch(match, idx)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
})
