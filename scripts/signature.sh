# 解码 p12 文件
echo "$CERT_BASE64" | base64 --decode >cert.p12

# 将证书路径和密码设置为环境变量, 供打包使用
echo "CSC_LINK=$(pwd)/cert.p12" >>$GITHUB_ENV
echo "CSC_KEY_PASSWORD=$CERT_PASSWORD" >>$GITHUB_ENV

ls -la cert.p12

# 创建一个临时钥匙串，并导入证书（这里不设置密码）
security create-keychain -p "" build.keychain
security default-keychain -s build.keychain
security unlock-keychain -p "" build.keychain
security import cert.p12 -k build.keychain -P $CERT_PASSWORD -T /usr/bin/codesign

# 设置钥匙链分区列表; 允许这些工具访问: apple-tool:,apple:,codesign:
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "" build.keychain
# 是否能找到你的 Developer ID Application 证书
security find-identity -v -p codesigning

# 从钥匙串中查找包含 TEAM_ID 的签名证书标识
CERT_ID=$(security find-identity -v -p codesigning | grep "$TEAM_ID" | head -n1 | awk -F\" '{print $2}')
echo "Using certificate: $CERT_ID"

# 对 yak 可执行文件进行签名（请替换为你的可执行文件路径）
codesign --timestamp --options runtime --sign "$CERT_ID" ./bins/yak_darwin_amd64
zip ./bins/yak_darwin_amd64.zip ./bins/yak_darwin_amd64 && rm ./bins/yak_darwin_amd64

codesign --timestamp --options runtime --sign "$CERT_ID" ./bins/yak_darwin_arm64
zip ./bins/yak_darwin_arm64.zip ./bins/yak_darwin_arm64 && rm ./bins/yak_darwin_arm64
