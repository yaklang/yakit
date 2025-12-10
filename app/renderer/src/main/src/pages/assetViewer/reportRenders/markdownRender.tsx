import React, {useMemo} from "react"
import {ReportItem} from "./schema"
import DOMPurify from "isomorphic-dompurify"
import styles from "./markdownRender.module.scss"
import {useTheme} from "@/hook/useTheme"
import classNames from "classnames"

export interface ReportMarkdownBlockProp {
    item: ReportItem
    className?: string
}

export const ReportMarkdownBlock: React.FC<ReportMarkdownBlockProp> = (props) => {
    const {theme} = useTheme()
    
    // 预处理并转换 markdown 内容为 HTML
    const htmlContent = useMemo(() => {
        if (!props.item.content) return ""
        
        let content = props.item.content
        
        // 移除首尾的引号
        content = content.trim()
        if (content.startsWith('"') && content.endsWith('"')) {
            content = content.slice(1, -1)
        }
        
        // 将 <br/> 标签替换为换行符
        content = content.replace(/<br\s*\/?>/gi, '\n')
        
        // 简单的 markdown 转 HTML（处理常见的 markdown 语法）
        let html = content
        
        // 处理标题
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
        
        // 处理粗体和斜体
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
        
        // 处理代码块
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`
        })
        
        // 处理行内代码s
        html = html.replace(/`(.+?)`/g, '<code>$1</code>')
        
        // 处理 Markdown 表格
        const tableRegex = /^\|(.+)\|$/gm
        const lines_temp = html.split('\n')
        const tableLines: string[] = []
        let inTable = false
        let isHeaderRow = true
        
        lines_temp.forEach((line, index) => {
            if (tableRegex.test(line.trim())) {
                // 这是表格行
                const cells = line.trim().slice(1, -1).split('|').map(cell => cell.trim())
                
                // 检查下一行是否是分隔行（如 | :---: | :---: |）
                const nextLine = lines_temp[index + 1]
                const isSeparator = nextLine && /^\|[\s:-]+\|$/gm.test(nextLine.trim())
                
                if (isSeparator && isHeaderRow) {
                    // 这是表头
                    if (!inTable) {
                        tableLines.push('<table>')
                        tableLines.push('<thead>')
                        inTable = true
                    }
                    tableLines.push('<tr>')
                    cells.forEach(cell => {
                        tableLines.push(`<th>${cell}</th>`)
                    })
                    tableLines.push('</tr>')
                    tableLines.push('</thead>')
                    tableLines.push('<tbody>')
                    isHeaderRow = false
                } else if (!isSeparator && inTable && line.trim().startsWith('|')) {
                    // 这是数据行
                    tableLines.push('<tr>')
                    cells.forEach(cell => {
                        tableLines.push(`<td>${cell}</td>`)
                    })
                    tableLines.push('</tr>')
                } else if (!line.trim().startsWith('|') && inTable) {
                    // 表格结束
                    tableLines.push('</tbody>')
                    tableLines.push('</table>')
                    tableLines.push(line)
                    inTable = false
                    isHeaderRow = true
                } else if (!isSeparator) {
                    tableLines.push(line)
                }
            } else if (!line.match(/^\|[\s:-]+\|$/)) {
                // 跳过分隔行
                if (inTable && !line.trim().startsWith('|')) {
                    tableLines.push('</tbody>')
                    tableLines.push('</table>')
                    inTable = false
                    isHeaderRow = true
                }
                tableLines.push(line)
            }
        })
        
        if (inTable) {
            tableLines.push('</tbody>')
            tableLines.push('</table>')
        }
        
        html = tableLines.join('\n')
        
        // 处理列表
        html = html.replace(/^\- (.+)$/gim, '<li>$1</li>')
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        
        // 处理链接
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        
        // 处理段落（将连续的非 HTML 行包装为段落）
        const lines = html.split('\n')
        let inParagraph = false
        const processedLines: string[] = []
        
        lines.forEach(line => {
            const trimmedLine = line.trim()
            
            // 如果是 HTML 标签开头，不处理为段落
            if (trimmedLine.startsWith('<') || trimmedLine === '') {
                if (inParagraph) {
                    processedLines.push('</p>')
                    inParagraph = false
                }
                processedLines.push(line)
            } else {
                // 普通文本行
                if (!inParagraph) {
                    processedLines.push('<p>')
                    inParagraph = true
                }
                processedLines.push(line)
            }
        })
        
        if (inParagraph) {
            processedLines.push('</p>')
        }
        
        html = processedLines.join('\n')
        
        // 使用 DOMPurify 清理 HTML，防止 XSS
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: [
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'p', 'br', 'span', 'div',
                'strong', 'em', 'b', 'i', 'u',
                'ul', 'ol', 'li',
                'table', 'thead', 'tbody', 'tr', 'th', 'td',
                'code', 'pre',
                'a', 'img'
            ],
            ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'style', 'class', 'colspan', 'rowspan']
        })
    }, [props.item.content])
    
    return (
        <div 
            data-color-mode={theme} 
            className={classNames(styles["markdown-block"], props.className)}
            dangerouslySetInnerHTML={{__html: htmlContent}}
        />
    )
}
