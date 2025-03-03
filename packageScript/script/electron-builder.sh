# yarn add -D dmg-license

chmod +x ./packageScript/script/retryScript.sh
chmod +x ./packageScript/script/installRender.sh

renderVersion=$(curl -fsL "http://example.com/version.txt") || {
    echo "获取版本信息失败" >&2
    exit 1
}
echo "RENDER_VERSION=${renderVersion}" >>$GITHUB_ENV

render_path="./app/renderer/pages"

versions=("ce" "ee") # 打包的版本集合
for item in "${versions[@]}"; do
    rm -rf ./app/renderer/pages

    ./packageScript/script/installRender.sh ${item}

    yarn remove electron && yarn add electron@27.0.0 --dev
    cp ./bins/yak_windows_normal_amd64.zip ./bins/yak_windows_amd64.zip
    if [ "${item}" = "ce" ]; then
        ./packageScript/script/retryScript.sh yarn pack-win
        ./packageScript/script/retryScript.sh yarn pack-linux
        ./packageScript/script/retryScript.sh yarn pack-mac
    elif [ "${item}" = "ee" ]; then
        ./packageScript/script/retryScript.sh yarn pack-win-ee
        ./packageScript/script/retryScript.sh yarn pack-linux-ee
        ./packageScript/script/retryScript.sh yarn pack-mac-ee
    else
        echo "Unknown packaged version: ${item}" >&2
        exit 1
    fi

    yarn remove electron && yarn add electron@22.3.27 --dev
    cp ./bins/yak_windows_legacy_amd64.zip ./bins/yak_windows_amd64.zip
    if [ "${item}" = "ce" ]; then
        ./packageScript/script/retryScript.sh yarn pack-win-legacy
        ./packageScript/script/retryScript.sh yarn pack-linux-legacy
        ./packageScript/script/retryScript.sh yarn pack-mac-legacy
    elif [ "${item}" = "ee" ]; then
        ./packageScript/script/retryScript.sh yarn pack-win-ee-legacy
        ./packageScript/script/retryScript.sh yarn pack-linux-ee-legacy
        ./packageScript/script/retryScript.sh yarn pack-mac-ee-legacy
    else
        echo "Unknown packaged version: ${item}" >&2
        exit 1
    fi
done

exit 0 # 打包完全成功后退出
