#!/usr/bin/env node
const {execSync} = require("child_process")
const moment = require("moment")

const time = moment(new Date()).format("MM.DD")
const version = `1.${time}`

try {
    // 生成时间版本号
    execSync(`yarn version --new-version ${version} --no-git-tag-version`, {stdio: "inherit"})
    // 将 package.json 的修改加入暂存区
    execSync("git add .", {stdio: "inherit"})
    // 生成 commit，内容为 Render Version To v<version>
    execSync(`git commit -m "Render Version To v${version}"`, {stdio: "inherit"})
    // 生成 tag，格式为 v<version>-render
    execSync(`git tag v${version}-render`, {stdio: "inherit"})
} catch (err) {
    console.error("执行 git 命令失败:", err)
    process.exit(1)
}
