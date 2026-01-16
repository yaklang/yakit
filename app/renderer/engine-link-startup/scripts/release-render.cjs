#!/usr/bin/env node
const {execSync} = require("child_process")

/**
 * 生成的 tag 中, 第一位数字版号, 2025年时为1, 按序计算, 2026年则为2
 * 注: 需要开发者根据每年定时将第一位数字版号进行修改, 预防不同年下, 后两位版号相同导致的 tag 冲突
 */

try {
    // 用户手动输入的版本号 例: 2.04.30
    const inputVersion = process.argv.slice(2)[0]

    const now = new Date()
    // 月份需要 +1（因为 getMonth() 返回 0-11）
    const month = String(now.getMonth() + 1).padStart(2, "0")
    // 日期直接获取
    const day = String(now.getDate()).padStart(2, "0")

    const version = inputVersion || `2.${month}.${day}`

    if (version.startsWith("v")) {
        console.error("Version number cannot start with 'v'")
        process.exit(1)
    }

    // 更新远端分支代码
    execSync(`git fetch origin`, {stdio: "inherit"})
    execSync(`git checkout -b update/link-render-${version} origin/master`, {stdio: "inherit"})

    console.log("\x1b[32m%s\x1b[0m", `### Creating render branch: update/link-render-${version} ###`)

    // 生成版本号修改
    execSync(`yarn version --new-version ${version} --no-git-tag-version`, {stdio: "inherit"})
    // 将 package.json 的修改加入暂存区
    execSync("git add .", {stdio: "inherit"})
    // 生成 commit，内容为 Link-Render Version To v<version>
    execSync(`git commit -m "Link-Render Version To v${version}"`, {stdio: "inherit"})
    // 生成 tag，格式为 v<version>-render
    execSync(`git tag v${version}-link-render`, {stdio: "inherit"})

    console.log("\x1b[32m%s\x1b[0m", `### Creating render tag: v${version}-link-render ###`)
} catch (err) {
    console.error("生成 link-render 版本号命令失败:", err)
    process.exit(1)
}
