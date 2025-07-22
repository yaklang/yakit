const getCssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
// kuriorColors.ts
export const lightColors = {
    foreground: "#363636",
    background: getCssVar("--Colors-Use-Neutral-Bg"),
    selectionBg: "#F5AA0091",
    lineHighlight: "#CBDC2F38",
    cursor: "#202020",
    whitespace: "#0000004A",
    indentGuide: "#775308",
    indentGuideActive: "#FA2828",
    commentFg: "#949494e8",
    commentBg: "#dcdcdc8f"
}

export const darkColors = {
    foreground: "#F8F8F8",
    background: getCssVar("--Colors-Use-Neutral-Bg"),
    selectionBg: "#264f78",
    lineHighlight: "#2A2A2A",
    cursor: "#FFFFFF",
    whitespace: "#4B5263",
    indentGuide: "#3B4048",
    indentGuideActive: "#C5E478",
    commentFg: "#5C6370",
    commentBg: "#2C313C"
}
