import {Theme} from "@/hook/useTheme"
import {monaco} from "react-monaco-editor"

/**
 * 提取所有 --Colors-Use- 变量
 */
const getAllYakitColorVars = (): Record<string, string> => {
    const style = getComputedStyle(document.documentElement)
    const seen = new Set<string>()
    const result: Record<string, string> = {}

    for (const sheet of document.styleSheets) {
        let rules: CSSRuleList
        try {
            rules = sheet.cssRules
        } catch {
            continue
        }
        for (const rule of rules) {
            if (rule.type !== CSSRule.STYLE_RULE) continue
            const styleRule = rule as CSSStyleRule
            const styleDecl = styleRule.style
            for (let i = 0; i < styleDecl.length; i++) {
                const prop = styleDecl[i]
                if (prop.startsWith("--Colors-Use-") && !seen.has(prop)) {
                    seen.add(prop)
                    const value = style.getPropertyValue(prop).trim()
                    if (value) {
                        result[prop] = value
                    }
                }
                if (prop.startsWith("--yakit-colors-") && !seen.has(prop)) {
                    seen.add(prop)
                    const value = style.getPropertyValue(prop).trim()
                    if (value) {
                        result[prop] = value
                    }
                }
            }
        }
    }

    return result
}

/**
 * 定义并应用 monaco 编辑器主题
 */
const applyYakitMonacoTheme = (themeGlobal: Theme) => {
    if (!monaco) return

    const vars = getAllYakitColorVars()

    const editorIndentGuideSetting: Record<Theme, Record<string, string>> = {
        dark: {
            background: "#474A4F",
            activeBackground: "#f6a317"
        },
        light: {
            background: "#C0C6D1",
            activeBackground: "#f6a317"
        }
    }

    monaco.editor.defineTheme("kurior", {
        base: "vs",
        inherit: true,
        rules: [
            {
                foreground: "#bb73ea",
                token: "operator"
            },
            {
                foreground: "#a826a4",
                token: "basic.type"
            },
            {
                foreground: "#c4652f",
                token: "globals"
            },
            {
                foreground: "#c4652f",
                token: "libFunction"
            },
            {
                foreground: "#ff0000",
                token: "fuzz.tag.inner",
                fontStyle: "bold underline"
            },
            {
                foreground: "#002aff",
                background: "#cc7c22",
                token: "fuzz.tag.second",
                fontStyle: "bold underline"
            },
            {
                background: "#F0F2F5",
                token: ""
            },
            {
                foreground: "#949494e8",
                background: "#dcdcdc8f",
                token: "comment"
            },
            {
                foreground: "#0080ff",
                token: "http.header.danger",
                fontStyle: "bold"
            },
            {
                foreground: "#0080ff",
                token: "http.header.warning",
                fontStyle: "bold"
            },
            {
                foreground: "#0080ff",
                token: "http.header.info"
            },
            {token: "http.header.mime.xml", fontStyle: "bold", foreground: "#b27777"},
            {token: "http.header.mime.json", fontStyle: "bold", foreground: "#3d8e86"},
            {token: "http.header.mime.urlencoded", fontStyle: "bold", foreground: "#6a5b6d"},
            {token: "http.header.mime.form", fontStyle: "bold", foreground: "#814662"},
            {token: "http.method", fontStyle: "bold", foreground: "#d56161"},
            {token: "http.protocol", fontStyle: "bold", foreground: "#038027"},
            {token: "bold-keyword", fontStyle: "bold"},
            {token: "http.path", fontStyle: "bold", foreground: "#01949a"},
            {token: "http.anchor", foreground: "#808184"},
            {token: "http.query.params", fontStyle: "bold", foreground: "#d26900"},
            {token: "http.query.index", fontStyle: "bold", foreground: "#a67eb7"},
            {token: "http.query.index.values", fontStyle: "bold", foreground: "#f57a00"},
            {token: "http.query.values", fontStyle: "bold", foreground: "#930d97"},
            {foreground: "#639300", token: "json.key", fontStyle: "bold"},
            {foreground: "#9C6CFF", token: "json.value", fontStyle: "bold"},
            {
                foreground: "#808184",
                token: "string.value",
                fontStyle: "bold"
            },
            {
                foreground: "#0045e8",
                token: "http.url",
                fontStyle: "underline"
            },
            {
                foreground: "#0045e8",
                token: "http.urlencoded",
                fontStyle: ""
            },
            {
                foreground: "#a54776",
                background: "#e9d6dc85",
                token: "comment.line.region"
            },
            {
                foreground: "#668d68",
                background: "#e9e4be",
                token: "comment.line.marker.php"
            },
            {
                foreground: "#456e48",
                background: "#d9eab8",
                token: "comment.line.todo.php"
            },
            {
                foreground: "#880006",
                background: "#e1d0ca",
                token: "comment.line.fixme.php"
            },
            {
                foreground: "#cd6839",
                token: "constant"
            },
            {
                foreground: "#8b4726",
                background: "#e8e9e8",
                token: "entity"
            },
            {
                foreground: "#a52a2a",
                token: "storage"
            },
            {
                foreground: "#cd3700",
                token: "keyword.control"
            },
            {
                foreground: "#b03060",
                token: "support.function - variable"
            },
            {
                foreground: "#b03060",
                token: "keyword.other.special-method.ruby"
            },
            {
                foreground: "#b83126",
                token: "keyword.operator.comparison"
            },
            {
                foreground: "#b83126",
                token: "keyword.operator.logical"
            },
            {
                foreground: "#639300",
                token: "string"
            },
            {
                foreground: "#007e69",
                token: "string.quoted.double.ruby source.ruby.embedded.source"
            },
            {
                foreground: "#104e8b",
                token: "support"
            },
            {
                foreground: "#883b3b",
                token: "variable"
            },
            {
                foreground: "#fd1732",
                background: "#e8e9e8",
                fontStyle: "italic underline",
                token: "invalid.deprecated"
            },
            {
                foreground: "#fd1224",
                background: "#ff060026",
                token: "invalid.illegal"
            },
            {
                foreground: "#7b211a",
                background: "#77ade900",
                token: "text source"
            },
            {
                foreground: "#005273",
                fontStyle: "italic",
                token: "entity.other.inherited-class"
            },
            {
                foreground: "#417e00",
                background: "#c9d4be",
                token: "string.regexp"
            },
            {
                foreground: "#B05A3C",
                token: "string.escape"
            },
            {
                foreground: "#6A5ACD",
                token: "string.inline.expr"
            },
            {
                foreground: "#808080",
                token: "string.heredoc.delimiter"
            },
            {
                foreground: "#FF0000",
                token: "string.invalid"
            },
            {
                foreground: "#005273",
                token: "support.function"
            },
            {
                foreground: "#cf6a4c",
                token: "support.constant"
            },
            {
                fontStyle: "underline",
                token: "entity.name.type"
            },
            {
                foreground: "#676767",
                fontStyle: "italic",
                token: "meta.cast"
            },
            {
                foreground: "#494949",
                token: "meta.sgml.html meta.doctype"
            },
            {
                foreground: "#494949",
                token: "meta.sgml.html meta.doctype entity"
            },
            {
                foreground: "#494949",
                token: "meta.sgml.html meta.doctype string"
            },
            {
                foreground: "#494949",
                token: "meta.xml-processing"
            },
            {
                foreground: "#494949",
                token: "meta.xml-processing entity"
            },
            {
                foreground: "#494949",
                token: "meta.xml-processing string"
            },
            {
                foreground: "#005273",
                token: "meta.tag"
            },
            {
                foreground: "#005273",
                token: "meta.tag entity"
            },
            {
                foreground: "#005273",
                token: "source entity.name.tag"
            },
            {
                foreground: "#005273",
                token: "source entity.other.attribute-name"
            },
            {
                foreground: "#005273",
                token: "meta.tag.inline"
            },
            {
                foreground: "#005273",
                token: "meta.tag.inline entity"
            },
            {
                foreground: "#b85423",
                token: "entity.name.tag.namespace"
            },
            {
                foreground: "#b85423",
                token: "entity.other.attribute-name.namespace"
            },
            {
                foreground: "#b83126",
                token: "entity.name.tag.css"
            },
            {
                foreground: "#b12e25",
                token: "meta.selector.css entity.other.attribute-name.tag.pseudo-class"
            },
            {
                foreground: "#b8002d",
                token: "meta.selector.css entity.other.attribute-name.id"
            },
            {
                foreground: "#b8002d",
                token: "entity.other.attribute-name.id.css"
            },
            {
                foreground: "#b8012d",
                token: "meta.selector.css entity.other.attribute-name.class"
            },
            {
                foreground: "#b8012d",
                token: "entity.other.attribute-name.class.css"
            },
            {
                foreground: "#005273",
                token: "support.type.property-name.css"
            },
            {
                foreground: "#005273",
                token: "meta.property-name"
            },
            {
                foreground: "#8693a5",
                token: "meta.preprocessor.at-rule keyword.control.at-rule"
            },
            {
                foreground: "#417e00",
                token: "meta.property-value"
            },
            {
                foreground: "#b8860b",
                token: "constant.other.color"
            },
            {
                foreground: "#ee3a8c",
                token: "keyword.other.important"
            },
            {
                foreground: "#ee3a8c",
                token: "keyword.other.default"
            },
            {
                foreground: "#417e00",
                token: "meta.property-value support.constant.named-color.css"
            },
            {
                foreground: "#417e00",
                token: "meta.property-value constant"
            },
            {
                foreground: "#417e00",
                token: "meta.constructor.argument.css"
            },
            {
                foreground: "#9a5925",
                token: "constant.numeric"
            },
            {
                foreground: "#9f5e3d",
                token: "keyword.other"
            },
            {
                foreground: "#1b76b0",
                token: "source.scss support.function.misc"
            },
            {
                foreground: "#f8bebe",
                background: "#82000e",
                fontStyle: "italic",
                token: "meta.diff"
            },
            {
                foreground: "#f8bebe",
                background: "#82000e",
                fontStyle: "italic",
                token: "meta.diff.header"
            },
            {
                foreground: "#f8f8f8",
                background: "#420e09",
                token: "markup.deleted"
            },
            {
                foreground: "#f8f8f8",
                background: "#4a410d",
                token: "markup.changed"
            },
            {
                foreground: "#f8f8f8",
                background: "#253b22",
                token: "markup.inserted"
            },
            {
                foreground: "#cd2626",
                fontStyle: "italic",
                token: "markup.italic"
            },
            {
                foreground: "#8b1a1a",
                fontStyle: "bold",
                token: "markup.bold"
            },
            {
                foreground: "#e18964",
                fontStyle: "underline",
                token: "markup.underline"
            },
            {
                foreground: "#8b7765",
                background: "#fee09c12",
                fontStyle: "italic",
                token: "markup.quote"
            },
            {
                foreground: "#b8012d",
                background: "#bf61330d",
                token: "markup.heading"
            },
            {
                foreground: "#b8012d",
                background: "#bf61330d",
                token: "markup.heading entity"
            },
            {
                foreground: "#8f5b26",
                token: "markup.list"
            },
            {
                foreground: "#578bb3",
                background: "#b1b3ba08",
                token: "markup.raw"
            },
            {
                foreground: "#f67b37",
                fontStyle: "italic",
                token: "markup comment"
            },
            {
                foreground: "#60a633",
                background: "#242424",
                token: "meta.separator"
            },
            {
                foreground: "#578bb3",
                background: "#b1b3ba08",
                token: "markup.other"
            },
            {
                background: "#eeeeee29",
                token: "meta.line.entry.logfile"
            },
            {
                background: "#eeeeee29",
                token: "meta.line.exit.logfile"
            },
            {
                background: "#751012",
                token: "meta.line.error.logfile"
            },
            {
                background: "#dcdcdc8f",
                token: "punctuation.definition.end"
            },
            {
                foreground: "#629f9e",
                token: "entity.other.attribute-name.html"
            },
            {
                foreground: "#79a316",
                token: "string.quoted.double.js"
            },
            {
                foreground: "#79a316",
                token: "string.quoted.single.js"
            },
            {
                foreground: "#488c45",
                fontStyle: "italic",
                token: "entity.name.function.js"
            },
            {
                foreground: "#666666",
                token: "source.js.embedded.html"
            },
            {
                foreground: "#bb3182",
                token: "storage.type.js"
            },
            {
                foreground: "#338fd5",
                token: "support.class.js"
            },
            {
                foreground: "#a99904",
                fontStyle: "italic",
                token: "keyword.control.js"
            },
            {
                foreground: "#a99904",
                fontStyle: "italic",
                token: "keyword.operator.js"
            },
            {
                foreground: "#616838",
                background: "#d7d7a7",
                token: "entity.name.class"
            },
            {
                background: "#968f96",
                token: "active_guide"
            },
            {
                background: "#cbdc2f38",
                token: "highlight_matching_word"
            }
        ],
        colors: {
            "editor.foreground": vars["--Colors-Use-Neutral-Text-1-Title"],
            "editor.background": vars["--Colors-Use-Neutral-Bg-Hover"],
            "editor.selectionBackground": vars["--Colors-Use-Warning-Border"],
            "editor.inactiveSelectionBackground": vars["--Colors-Use-Warning-Border"],
            "editor.lineHighlightBackground": "#f6a31714",
            "editorCursor.foreground": vars["--Colors-Use-Neutral-Text-1-Title"],
            "editorWhitespace.foreground": vars["--Colors-Use-Neutral-Text-4-Help-text"],

            "editorIndentGuide.background": editorIndentGuideSetting[themeGlobal].background,
            "editorIndentGuide.activeBackground": editorIndentGuideSetting[themeGlobal].activeBackground,
            // "editorLineNumber.foreground": "#666666",
            "editorLineNumber.activeForeground": "#f6a317",

            "minimap.background": vars["--Colors-Use-Neutral-Bg-Hover"],
            "minimap.foreground": vars["--Colors-Use-Neutral-Text-1-Title"],
            "scrollbarSlider.background": "#88888866", // 默认状态
            // 滑块悬停时颜色
            "scrollbarSlider.hoverBackground": "#88888899",
            // 滑块被点击（active）时颜色
            "scrollbarSlider.activeBackground": "#888888cc",
            // 编辑器滚动概览（右侧 Overview Ruler 背景）
            "editorOverviewRuler.background": vars["--Colors-Use-Neutral-Bg-Hover"],
            "editorGutter.foldingControlForeground": vars["--Colors-Use-Neutral-Text-3-Secondary"]
        }
    })

    monaco.editor.setTheme("kurior")
}

export {applyYakitMonacoTheme}
