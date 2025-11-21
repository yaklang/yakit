#!/usr/bin/env node
const {execSync} = require("child_process")

try {
    const version = process.argv.slice(2)[0]

    if (!version) {
        console.error("Please enter the version number")
        process.exit(1)
    }
    if (version.startsWith("v")) {
        console.error("Version number cannot start with 'v'")
        process.exit(1)
    }

    // 更新远端分支代码
    execSync(`git fetch origin`, {stdio: "inherit"})
    // 生成更新版本号分支
    execSync(`git checkout -b update/memfit-pack-${version} feature/ai-chat-refactor`, {stdio: "inherit"})

    // 生成版本号修改
    execSync(`yarn version --new-version ${version} --no-git-tag-version`, {stdio: "inherit"})
    // 将 package.json 的修改加入暂存区
    execSync("git add .", {stdio: "inherit"})
    // 生成 commit，内容为 Render Version To v<version>
    execSync(`git commit -m "memfit Version To v${version}"`, {stdio: "inherit"})
    // 生成 tag，格式为 v<version>-render
    execSync(`git tag v${version}-memfit`, {stdio: "inherit"})
} catch (err) {
    console.error("执行 memfit 发版命令失败:", err)
    process.exit(1)
}
