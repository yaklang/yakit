#!/usr/bin/env node
const {execSync} = require("child_process")

// 示例 yarn release-irify-render 1.0.0-0329
const version = process.argv.slice(2)

try {
    // 生成时间版本号
    execSync(`yarn version --new-version ${version} --no-git-tag-version`, {stdio: "inherit"})
    // 将 package.json 的修改加入暂存区
    execSync("git add .", {stdio: "inherit"})
    // 生成 commit，内容为 Render Version To v<version>
    execSync(`git commit -m "irify Version To v${version}"`, {stdio: "inherit"})
    // 生成 tag，格式为 v<version>-render
    execSync(`git tag v${version}-irify`, {stdio: "inherit"})
} catch (err) {
    console.error("执行 git 命令失败:", err)
    process.exit(1)
}