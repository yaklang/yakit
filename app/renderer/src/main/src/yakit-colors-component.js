// Generates semantic neutral colors based on mode ('light' or 'dark')
export function generateNeutralSemanticColors(mode = "light") {
    const prefix = "--Colors-Use-Neutral-"
    if (mode === "light") {
        return {
            [`${prefix}Bg`]: "var(--yakit-colors-Neutral-10)",
            [`${prefix}Bg-Hover`]: "var(--yakit-colors-Neutral-20)",
            [`${prefix}Border`]: "var(--yakit-colors-Neutral-30)",
            [`${prefix}Disable`]: "var(--yakit-colors-Neutral-50)",
            [`${prefix}Text-4-Help-text`]: "var(--yakit-colors-Neutral-70)",
            [`${prefix}Text-3-Secondary`]: "var(--yakit-colors-Neutral-80)",
            [`${prefix}Text-2-Primary`]: "var(--yakit-colors-Neutral-90)",
            [`${prefix}Text-1-Title`]: "var(--yakit-colors-Neutral-100)"
        }
    } else if (mode === "dark") {
        return {
            [`${prefix}Bg`]: "var(--yakit-colors-Neutral-0)", // 极暗背景色
            [`${prefix}Bg-Hover`]: "var(--yakit-colors-Neutral-20)",
            [`${prefix}Border`]: "var(--yakit-colors-Neutral-30)",
            [`${prefix}Disable`]: "var(--yakit-colors-Neutral-40)",
            [`${prefix}Text-4-Help-text`]: "var(--yakit-colors-Neutral-50)",
            [`${prefix}Text-3-Secondary`]: "var(--yakit-colors-Neutral-60)",
            [`${prefix}Text-2-Primary`]: "var(--yakit-colors-Neutral-70)",
            [`${prefix}Text-1-Title`]: "var(--yakit-colors-Neutral-80)"
        }
    }
    return {}
}

// Generates semantic basic colors based on mode ('light' or 'dark')
export function generateBasicSemanticColors(mode = "light") {
    const prefix = "--Colors-Use-Basic-"
    if (mode === "light") {
        return {
            [`${prefix}White`]: "#FFFFFF",
            [`${prefix}Black`]: "#171717",
            [`${prefix}Shadow`]: "rgba(23,23,23, 0.08)",
            [`${prefix}Modal-bg`]: "rgba(23,23,23, 0.3)",
            [`${prefix}Background`]: "var(--yakit-colors-Neutral-0)"
        }
    } else if (mode === "dark") {
        return {
            [`${prefix}White`]: "#FFFFFF",
            [`${prefix}Black`]: "#171717",
            [`${prefix}Shadow`]: "rgba(0,0,0, 0.8)",
            [`${prefix}Modal-bg`]: "rgba(0,0,0, 0.7)",
            [`${prefix}Background`]: "var(--yakit-colors-Neutral-10)" // 极暗背景色
        }
    }
    return {}
}

// Generates semantic colors for main, error, warning, success based on colorName and mode
export function generateSemanticColors(colorName, mode = "light") {
    const prefix = `--Colors-Use-${colorName}-`
    if (mode === "light") {
        return {
            [`${prefix}Bg`]: `var(--yakit-colors-${colorName}-10)`,
            [`${prefix}Bg-Hover`]: `var(--yakit-colors-${colorName}-20)`,
            [`${prefix}Focus`]: `var(--yakit-colors-${colorName}-30)`,
            [`${prefix}Border`]: `var(--yakit-colors-${colorName}-40)`,
            [`${prefix}Hover`]: `var(--yakit-colors-${colorName}-50)`,
            [`${prefix}Primary`]: `var(--yakit-colors-${colorName}-60)`,
            [`${prefix}Pressed`]: `var(--yakit-colors-${colorName}-70)`,
            [`${prefix}On-Primary`]: `var(--yakit-colors-${colorName}-10)`
        }
    } else if (mode === "dark") {
        const base = {
            [`${prefix}Bg`]: `var(--yakit-colors-${colorName}-10)`,
            [`${prefix}Bg-Hover`]: `var(--yakit-colors-${colorName}-20)`,
            [`${prefix}Focus`]: `var(--yakit-colors-${colorName}-30)`,
            [`${prefix}Border`]: `var(--yakit-colors-${colorName}-40)`,
            [`${prefix}Pressed`]: `var(--yakit-colors-${colorName}-80)`,
            [`${prefix}On-Primary`]: `var(--yakit-colors-${colorName}-100)`
        }
        if (colorName === "Main") {
            base[`${prefix}Hover`] = `var(--yakit-colors-${colorName}-50)`
            base[`${prefix}Primary`] = `var(--yakit-colors-${colorName}-60)`
        } else {
            base[`${prefix}Hover`] = `var(--yakit-colors-${colorName}-60)`
            base[`${prefix}Primary`] = `var(--yakit-colors-${colorName}-70)`
        }
        return base
    }
    return {}
}

// Generates semantic colors for purple, magenta, blue, lake-blue, cyan, green, red, orange, yellow, grey based on colorName and mode
export function generateTagSemanticColors(colorName, mode = "light") {
    const prefix = `--Colors-Use-${colorName}-`
    if (mode === "light") {
        if (colorName === "Grey") {
            return {
                [`${prefix}Bg`]: "var(--yakit-colors-Neutral-20)",
                [`${prefix}Bg-Hover`]: "var(--yakit-colors-Neutral-30)",
                [`${prefix}Border`]: "var(--yakit-colors-Neutral-40)",
                [`${prefix}Primary`]: "var(--yakit-colors-Neutral-60)",
                [`${prefix}On-Primary`]: "var(--yakit-colors-Neutral-10)"
            }
        } else {
            return {
                [`${prefix}Bg`]: `var(--yakit-colors-${colorName}-20)`,
                [`${prefix}Bg-Hover`]: `var(--yakit-colors-${colorName}-30)`,
                [`${prefix}Border`]: `var(--yakit-colors-${colorName}-40)`,
                [`${prefix}Primary`]: `var(--yakit-colors-${colorName}-60)`,
                [`${prefix}On-Primary`]: `var(--yakit-colors-${colorName}-10)`
            }
        }
    } else if (mode === "dark") {
        if (colorName === "Grey") {
            return {
                [`${prefix}Bg`]: "var(--yakit-colors-Neutral-20)",
                [`${prefix}Bg-Hover`]: "var(--yakit-colors-Neutral-30)",
                [`${prefix}Border`]: "var(--yakit-colors-Neutral-40)",
                [`${prefix}Primary`]: "var(--yakit-colors-Neutral-70)",
                [`${prefix}On-Primary`]: "var(--yakit-colors-Neutral-100)"
            }
        } else {
            return {
                [`${prefix}Bg`]: `var(--yakit-colors-${colorName}-20)`,
                [`${prefix}Bg-Hover`]: `var(--yakit-colors-${colorName}-30)`,
                [`${prefix}Border`]: `var(--yakit-colors-${colorName}-40)`,
                [`${prefix}Primary`]: `var(--yakit-colors-${colorName}-70)`,
                [`${prefix}On-Primary`]: `var(--yakit-colors-${colorName}-100)`
            }
        }
    }
    return {}
}

// Generates semantic status colors based on mode ('light' or 'dark')
export function generateStatusSemanticColors(mode = "light") {
    const prefix = "--Colors-Use-Status-"
    if (mode === "light") {
        return {
            [`${prefix}Serious`]: "var(--yakit-colors-Error-80)",
            [`${prefix}High`]: "var(--yakit-colors-Error-60)",
            [`${prefix}Medium`]: "var(--yakit-colors-Warning-60)",
            [`${prefix}Low`]: "var(--yakit-colors-Yellow-60)",
            [`${prefix}Safe`]: "var(--yakit-colors-Success-60)",
            [`${prefix}Unknown`]: "var(--yakit-colors-Neutral-70)"
        }
    } else if (mode === "dark") {
        return {
            [`${prefix}Serious`]: "var(--yakit-colors-Error-50)",
            [`${prefix}High`]: "var(--yakit-colors-Error-70)",
            [`${prefix}Medium`]: "var(--yakit-colors-Warning-70)",
            [`${prefix}Low`]: "var(--yakit-colors-Yellow-70)",
            [`${prefix}Safe`]: "var(--yakit-colors-Success-70)",
            [`${prefix}Unknown`]: "var(--yakit-colors-Neutral-50)"
        }
    }
    return {}
}
