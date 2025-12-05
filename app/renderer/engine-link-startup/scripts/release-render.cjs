#!/usr/bin/env node
const {execSync} = require("child_process")

try {
    // 用户手动输入的版本号 例: 1.04.30
    const inputVersion = process.argv.slice(2)[0]

    const now = new Date()
    // 月份需要 +1（因为 getMonth() 返回 0-11）
    const month = String(now.getMonth() + 1).padStart(2, "0")
    // 日期直接获取
    const day = String(now.getDate()).padStart(2, "0")

    const version = inputVersion || `1.${month}.${day}`

    if (version.startsWith("v")) {
        console.error("Version number cannot start with 'v'")
        process.exit(1)
    }

    // 更新远端分支代码
    execSync(`git fetch origin`, {stdio: "inherit"})
    execSync(`git checkout -b update/link-render-${version} origin/perf/ai-chat-ci`, {stdio: "inherit"})

    // 生成版本号修改
    execSync(`yarn version --new-version ${version} --no-git-tag-version`, {stdio: "inherit"})
    // 将 package.json 的修改加入暂存区
    execSync("git add .", {stdio: "inherit"})
    // 生成 commit，内容为 Link-Render Version To v<version>
    execSync(`git commit -m "Link-Render Version To v${version}"`, {stdio: "inherit"})
    // 生成 tag，格式为 v<version>-render
    execSync(`git tag v${version}-link-render`, {stdio: "inherit"})
} catch (err) {
    console.error("生成 link-render 版本号命令失败:", err)
    process.exit(1)
}
