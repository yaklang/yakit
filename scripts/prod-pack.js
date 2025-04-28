#!/usr/bin/env node
const {execSync} = require("child_process")

try {
    // 用户手动输入的版本号 例: 1.4.1-0430
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
    execSync(`git checkout -b update/pack-${version} origin/master`, {stdio: "inherit"})
    // 生成版本号、tag、commit
    execSync(`yarn version --new-version ${version}`, {stdio: "inherit"})
} catch (err) {
    console.error("执行 yakit 发版命令失败:", err)
    process.exit(1)
}
