export interface PresetKeywordProps {
    content: string
    type: string
}

export const presetList: PresetKeywordProps[] = [
    {
        content: "列举泛微oa的漏洞",
        type: "vuln_info"
    },
    {
        content: "shiro 反序列化漏洞怎么检测",
        type: "vuln_info"
    },
    {
        content: "CVE-2016-4437 有什么参考文章",
        type: "vuln_info"
    },
    {
        content: "在进行php代码审计时,如何发现文件包含漏洞",
        type: "cs_info"
    },
    {
        content: "构造一条nmap命令,对192.168.1.1 进行c段扫描",
        type: "cs_info"
    },
    {
        content: `构建一个fofa搜索语句，查找title内容包含'401'且body包含'<input type="password"'`,
        type: "cs_info"
    },
    {
        content: "用yak发送http请求怎么写",
        type: "cs_info"
    },
    {
        content: `用yak写一个sql注入检测脚本,注入地址是"/index.php",请求方式是"POST",请求参数是"news_id=123&time=091243",注入点是"news_id"`,
        type: "cs_info"
    },
    {
        content: "有哪些可以直接执行代码的 PHP 函数？",
        type: "cs_info"
    },
    {
        content: `用yak扫描192.168.1.1的"1-1000,3306,6379,8000-9000"端口`,
        type: "cs_info"
    },
    {
        content: `sql注入空格限制怎么绕过`,
        type: "cs_info"
    },
    {
        content: `永恒之蓝漏洞怎么修复`,
        type: "cs_info"
    }
]
