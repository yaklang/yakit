export type ThemeMode = "light" | "dark"

export type ThemeColorName =
    | "Main"
    | "Success"
    | "Warning"
    | "Error"
    | "Neutral"
    | "Purple"
    | "Magenta"
    | "Blue"
    | "Lake-blue"
    | "Cyan"
    | "Green"
    | "Red"
    | "Orange"
    | "Yellow"

export type MixDirection = "light" | "dark"

export type MixStep = [string, MixDirection]

export type ColorHex = `#${string}`

export type ThemeColorResult = Record<string, ColorHex>

export const whiteBackgroundColor: ColorHex = "#ffffff"
export const blackBackgroundColor: ColorHex = "#171717"

// Mix steps for light and dark modes
const yakitLightMixSteps: Map<number, MixStep> = new Map([
    [10, ["92%", "light"]],
    [20, ["88%", "light"]],
    [30, ["80%", "light"]],
    [40, ["55%", "light"]],
    [50, ["25%", "light"]],
    [60, ["10%", "light"]],
    [70, ["10%", "dark"]],
    [80, ["25%", "dark"]],
    [90, ["55%", "dark"]],
    [100, ["80%", "dark"]]
])

const yakitDarkMixSteps: Map<number, MixStep> = new Map([
    [10, ["92%", "dark"]],
    [20, ["80%", "dark"]],
    [30, ["70%", "dark"]],
    [40, ["55%", "dark"]],
    [50, ["30%", "dark"]],
    [60, ["10%", "dark"]],
    [70, ["5%", "light"]],
    [80, ["25%", "light"]],
    [90, ["55%", "light"]],
    [100, ["80%", "light"]]
])

export const yakitThemeColors: Record<ThemeColorName, ColorHex> = {
    Main: "#F17F30",
    Success: "#10B981",
    Warning: "#F59E0B",
    Error: "#EF4444",
    Neutral: "#ABB3C2",
    Purple: "#7B51F7",
    Magenta: "#D84ADB",
    Blue: "#2F87FF",
    "Lake-blue": "#18B5CB",
    Cyan: "#26D4EB",
    Green: "#41C484",
    Red: "#F36259",
    Orange: "#FFAE4E",
    Yellow: "#FFC905"
}

// Helper to convert percentage string to number between 0 and 1
const parsePercent = (percent: string | number): number => {
    if (typeof percent === "string" && percent.endsWith("%")) {
        return parseFloat(percent) / 100
    }
    return Number(percent)
}

// Simple color mixing function similar to Sass mix($color1, $color2, $weight)
// weight is how much of color1 to keep (0..1)
function mixColors(color1: ColorHex, color2: ColorHex, weight: string | number): ColorHex {
    // Convert hex color to RGB array
    function hexToRgb(hex: ColorHex): [number, number, number] {
        let c = hex.replace("#", "")
        if (c.length === 3) {
            c = c
                .split("")
                .map((x) => x + x)
                .join("")
        }
        const bigint = parseInt(c, 16)
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
    }

    // Convert RGB array to hex string
    function rgbToHex(rgb: [number, number, number]): ColorHex {
        const hex =
            "#" +
            rgb
                .map((x) => {
                    const h = x.toString(16)
                    return h.length === 1 ? "0" + h : h
                })
                .join("")
        return hex as ColorHex
    }

    const c1 = hexToRgb(color1)
    const c2 = hexToRgb(color2)
    const w = parsePercent(weight)

    const mixed: [number, number, number] = [
        Math.round(c1[0] * w + c2[0] * (1 - w)),
        Math.round(c1[1] * w + c2[1] * (1 - w)),
        Math.round(c1[2] * w + c2[2] * (1 - w))
    ]
    return rgbToHex(mixed)
}

// Get mix percentage with overrides for Neutral color
export function getMixPercent(name: ThemeColorName, mode: ThemeMode, level: number, defaultPercent: string): string {
    if (name === "Neutral" && mode === "dark" && level === 10) {
        return "88%"
    }
    if (name === "Neutral" && mode === "light" && level === 20) {
        return "80%"
    }
    if (name === "Neutral" && mode === "light" && level === 30) {
        return "70%"
    }
    return defaultPercent
}

// Generate single theme color variants as an object of CSS variable keys and color values
// mode: 'light' or 'dark'
// mainColorOverride: optional hex string to override Main color base
export function generateSingleThemeColor(
    name: ThemeColorName,
    mode: ThemeMode = "light",
    mainColorOverride?: ColorHex
): ThemeColorResult {
    // Get base color from theme colors
    let color: ColorHex = yakitThemeColors[name]

    // Override base colors for specific name+mode combos
    if (name === "Neutral" && mode === "dark") {
        color = "#B6C0D2"
    } else if (name === "Yellow" && mode === "dark") {
        color = "#FFD230"
    } else if (name === "Neutral" && mode === "light") {
        color = "#ABB3C2"
    } else if (name === "Yellow" && mode === "light") {
        color = "#FFC905"
    }

    if (!color) {
        throw new Error(`Color "${name}" not found in yakitThemeColors.`)
    }

    if (name === "Main" && mainColorOverride) {
        color = mainColorOverride
    }

    const steps = mode === "light" ? yakitLightMixSteps : yakitDarkMixSteps
    const prefix = `--yakit-colors-${name}-`

    const result: ThemeColorResult = {}

    for (const [level, info] of steps.entries()) {
        const defaultPercent = info[0]
        const direction = info[1]
        const percent = getMixPercent(name, mode, level, defaultPercent)
        const targetBg = direction === "light" ? whiteBackgroundColor : blackBackgroundColor

        const mixedColor = mixColors(targetBg, color, percent)
        result[`${prefix}${level}`] = mixedColor
    }

    // Special extreme values for Neutral
    if (name === "Neutral") {
        if (mode === "light") {
            result[`${prefix}0`] = whiteBackgroundColor
            result[`${prefix}110`] = blackBackgroundColor
        } else if (mode === "dark") {
            result[`${prefix}0`] = blackBackgroundColor
            result[`${prefix}110`] = whiteBackgroundColor
        }
    }

    // Special zero-level for Main color: derive 8% alpha from existing mixed color
    if (name === "Main") {
        const baseLevel = mode === "light" ? 60 : 70
        const baseColor = result[`${prefix}${baseLevel}`]
        if (baseColor) {
            // convert hex color (#RRGGBB) to #RRGGBBAA with 8% alpha
            const alphaHex = Math.round(0.08 * 255)
                .toString(16)
                .padStart(2, "0")
            result[`${prefix}0`] = `${baseColor}${alphaHex}`
        }
    }

    return result
}

// Generate all theme colors variants for a given mode as a single object
// mainColorOverride: optional hex string to override Main base color
export function generateAllThemeColors(mode: ThemeMode = "light", mainColorOverride?: ColorHex): ThemeColorResult {
    const allColors: ThemeColorResult = {}

    for (const name in yakitThemeColors) {
        Object.assign(
            allColors,
            generateSingleThemeColor(name as ThemeColorName, mode, name === "Main" ? mainColorOverride : undefined)
        )
    }

    return allColors
}
