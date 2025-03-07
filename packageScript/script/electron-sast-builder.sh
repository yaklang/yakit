yarn add -D dmg-license

chmod +x ./packageScript/script/installRender.sh
chmod +x ./packageScript/script/retryScript.sh

# 获取渲染端最新版本号
renderVersion=$(curl -fsL "http://yaklang.oss-accelerate.aliyuncs.com/yak/render/sast/version.txt") || {
    echo "Failed to obtain render version" >&2
    exit 1
}
# 设置渲染端最新版本号, 用于后续下载
export RENDER_VERSION="${renderVersion}"

versions=("ce" "ee") # 打包的版本集合
for item in "${versions[@]}"; do
    rm -rf ./app/renderer/pages

    ./packageScript/script/installRender.sh ${item} || { exit 1; }

    yarn remove electron && yarn add electron@27.0.0 --dev
    cp ./bins/yak_windows_normal_amd64.zip ./bins/yak_windows_amd64.zip
    if [ "${item}" = "ce" ]; then
        # ./packageScript/script/retryScript.sh "yarn pack-win" || { exit 1; }
        # ./packageScript/script/retryScript.sh "yarn pack-linux" || { exit 1; }
        ./packageScript/script/retryScript.sh "yarn pack-mac" || { exit 1; }
    elif [ "${item}" = "ee" ]; then
        # ./packageScript/script/retryScript.sh "yarn pack-win-ee" || { exit 1; }
        # ./packageScript/script/retryScript.sh "yarn pack-linux-ee" || { exit 1; }
        ./packageScript/script/retryScript.sh "yarn pack-mac-ee" || { exit 1; }
    else
        echo "Unknown packaged version: ${item}" >&2
        exit 1
    fi

    yarn remove electron && yarn add electron@22.3.27 --dev
    cp ./bins/yak_windows_legacy_amd64.zip ./bins/yak_windows_amd64.zip
    if [ "${item}" = "ce" ]; then
        # ./packageScript/script/retryScript.sh "yarn pack-win-legacy" || { exit 1; }
        # ./packageScript/script/retryScript.sh "yarn pack-linux-legacy" || { exit 1; }
        ./packageScript/script/retryScript.sh "yarn pack-mac-legacy" || { exit 1; }
    elif [ "${item}" = "ee" ]; then
        # ./packageScript/script/retryScript.sh "yarn pack-win-ee-legacy" || { exit 1; }
        # ./packageScript/script/retryScript.sh "yarn pack-linux-ee-legacy" || { exit 1; }
        ./packageScript/script/retryScript.sh "yarn pack-mac-ee-legacy" || { exit 1; }
    else
        echo "Unknown packaged version: ${item}" >&2
        exit 1
    fi
done
