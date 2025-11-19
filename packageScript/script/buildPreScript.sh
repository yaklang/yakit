yarn add -D dmg-license

# 新增参数处理逻辑
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 [irify|yakit|memfit]"
    exit 1
fi

chmod +x ./packageScript/script/retryScript.sh
chmod +x ./packageScript/script/check-build-package.sh

case "$1" in
    irify)
        chmod +x ./packageScript/script/installIRifyRender.sh
        chmod +x ./packageScript/script/electron-irify-builder.sh
        # 获取渲染端最新版本号
        linkRenderVersion=$(curl -fsL "http://yaklang.oss-accelerate.aliyuncs.com/link/render/version.txt") || {
            echo "Failed to obtain link render version" >&2
            exit 1
        }
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
        linkRenderVersion=$(curl -fsL "http://yaklang.oss-accelerate.aliyuncs.com/link/render/version.txt") || {
            echo "Failed to obtain link render version" >&2
            exit 1
        }
        # 获取渲染端最新版本号
        renderVersion=$(curl -fsL "http://yaklang.oss-accelerate.aliyuncs.com/yak/render/version.txt") || {
            echo "Failed to obtain render version" >&2
            exit 1
        }
        ;;
    memfit)
        chmod +x ./packageScript/script/installMemfitRender.sh
        chmod +x ./packageScript/script/electron-memfit-builder.sh

        # 渲染端版本号
        renderVersion=$(curl -fsL "http://yaklang.oss-accelerate.aliyuncs.com/memfit/render/version.txt") || {
            echo "Failed to obtain Memfit render version" >&2
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
echo "LINK_RENDER_VERSION=${linkRenderVersion}" >>$GITHUB_ENV
