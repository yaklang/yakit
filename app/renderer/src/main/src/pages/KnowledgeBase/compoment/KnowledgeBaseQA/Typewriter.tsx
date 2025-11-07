import {useEffect, useState} from "react"

interface TypewriterProps {
    text: string
    speed?: number // 每个字符的间隔时间（默认 20ms）
}

export default function Typewriter({text, speed = 20}: TypewriterProps) {
    const [displayText, setDisplayText] = useState("")

    useEffect(() => {
        let index = 0
        setDisplayText("")

        const timer = setInterval(() => {
            index++
            setDisplayText(text.slice(0, index))

            if (index >= text.length) {
                clearInterval(timer)
            }
        }, speed)

        return () => clearInterval(timer)
    }, [text, speed])

    return <>{displayText}</>
}
