// Literal, lazy requires preserve registration timing and make all handlers visible to esbuild.
module.exports = {
  api: {
    index: () => require('./api/index'),
    upload: () => require('./api/upload'),
    uploadOSS: () => require('./api/uploadOSS'),
  },
  uiOperate: {
    hardware: () => require('./uiOperate/hardware'),
    index: () => require('./uiOperate/index'),
    networkJudgment: () => require('./uiOperate/networkJudgment'),
    other: () => require('./uiOperate/other'),
    yaklangAndYakit: () => require('./uiOperate/yaklangAndYakit'),
  },
  newUiOperate: {
    hardware: () => require('./newUiOperate/hardware'),
    index: () => require('./newUiOperate/index'),
    other: () => require('./newUiOperate/other'),
    yaklangAndYakit: () => require('./newUiOperate/yaklangAndYakit'),
  },
  utils: {
    clipboard: () => require('./utils/clipboard'),
    download: () => require('./utils/download'),
    fileSystemDialog: () => require('./utils/fileSystemDialog'),
    nodeFiles: () => require('./utils/nodeFiles'),
  },
}
