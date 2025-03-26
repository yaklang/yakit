yarn add -D dmg-license

# 新增参数处理逻辑
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 [irify|yakit]"
    exit 1
fi

chmod +x ./packageScript/script/retryScript.sh
chmod +x ./packageScript/script/check-build-package.sh

case "$1" in
    irify)
        chmod +x ./packageScript/script/installIRifyRender.sh
        chmod +x ./packageScript/script/electron-irify-builder.sh
        # 获取渲染端最新版本号
        renderVersion=$(curl -fsL "http://yaklang.oss-accelerate.aliyuncs.com/irify/render/version.txt") || {
            echo "Failed to obtain render version" >&2
            exit 1
        }
        ;;
    yakit)
        chmod +x ./packageScript/script/installRender.sh
        chmod +x ./packageScript/script/electron-builder.sh
        # 获取渲染端最新版本号
        renderVersion=$(curl -fsL "http://yaklang.oss-accelerate.aliyuncs.com/yak/render/version.txt") || {
            echo "Failed to obtain render version" >&2
            exit 1
        }
        ;;
    *)
        echo "Invalid option: $1" >&2
        exit 1
        ;;
esac


# 设置渲染端最新版本号, 用于后续下载
echo "RENDER_VERSION=${renderVersion}" >>$GITHUB_ENV
