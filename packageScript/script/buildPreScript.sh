yarn add -D dmg-license

chmod +x ./packageScript/script/installRender.sh
chmod +x ./packageScript/script/retryScript.sh
chmod +x ./packageScript/script/electron-builder.sh
chmod +x ./packageScript/script/check-build-package.sh

# 获取渲染端最新版本号
renderVersion=$(curl -fsL "http://yaklang.oss-accelerate.aliyuncs.com/yak/render/version.txt") || {
    echo "Failed to obtain render version" >&2
    exit 1
}
# 设置渲染端最新版本号, 用于后续下载
echo "RENDER_VERSION=${renderVersion}" >>$GITHUB_ENV
