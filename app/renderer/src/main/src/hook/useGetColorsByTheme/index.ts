import {useEffect, useRef} from "react"
import {useTheme} from "../useTheme"
import {getAllYakitColorVars} from "@/utils/monacoSpec/theme"

function useGetColorsByTheme() {
    const colorRef = useRef<Record<string, string>>(getAllYakitColorVars())
    const {theme} = useTheme()
    useEffect(() => {
        colorRef.current = getAllYakitColorVars()
    }, [theme])
    return colorRef.current || {}
}

export default useGetColorsByTheme
