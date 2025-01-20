const {exec} = require("child_process")
const process = require("process")

console.log("Dynamic Run Scriptsssss", process.argv);
// 命令参数
const args = process.argv.slice(2);
return