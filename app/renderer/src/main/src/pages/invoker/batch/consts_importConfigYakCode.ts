import {YakScriptParam} from "../schema";
import {YakExecutorParam} from "../YakExecutorParams";

export namespace ImportMenuConfig {
    export const Params: YakScriptParam[] = [
        {
            Field: "config-file", FieldVerbose: "配置文件(zip/json)",
            Required: true, TypeVerbose: "upload-path", DefaultValue: "",
            Help: "用于导入配置文件：配置菜单栏",
        },
        {
            Field: "delete-old", FieldVerbose: "删除旧配置？",
            TypeVerbose: "boolean", DefaultValue: "",
            Help: "师傅删除旧的配置",
        },
    ]
    export const Code = `# YakCode
yakit.AutoInitYakit()
tempDir = yakit.GetHomeTempDir()

targetDir = file.Join(tempDir, "temploaded-config")
defer func{
    os.RemoveAll(targetDir)
}

defer func{
    err := recover()
    if err != nil {
        yakit.Error("Load Yakit Plugin Config Failed: %s", err)
    }
}

yakit.Info("正在获取当前配置信息...")
configFile = cli.String("config-file")
if configFile == "" {
    yakit.Error("config empty")
    return
}

yakit.Info("用户配置文件如下：%v", configFile)
if !file.IsExisted(configFile) {
    yakit.Error("%v 不存在，配置结束", configFile)
    return
}

if str.HasSuffix(str.ToLower(configFile), ".json") {
    yakit.Info("用户配置为 JSON: 直接导入当前配置")
    jsonRaw, _ = file.ReadFile(configFile)
    return
}

yakit.Info("解压配置 ZIP: %v", configFile)
die(zip.Decompress(configFile, targetDir))

yakit.Info("正在加载配置中符合要求的 Schema")
files, err = file.ReadFileInfoInDirectory(targetDir)
die(err)
once := sync.NewOnce()
for _, f := range files {
    if f.IsDir {
        continue
    }
    if str.HasSuffix(f.Name, ".json") {
        yakit.Info("正在加载配置：%v", f.Name)
        jsonRaw, _ = file.ReadFile(f.Path)
        if len(jsonRaw) > 0 && cli.Bool("delete-old") {
            once.Do(func(){ db.DeleteYakitMenuItemAll() })
        }
        err = db.SaveYakitMenuItemByBatchExecuteConfig(jsonRaw)
        if err != nil {
            yakit.Error("加载配置失败[%v] 原因：%v", f.Path, err)
        }
    }
}
`
}