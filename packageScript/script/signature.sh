# PS: 这个脚本会向系统中导入证书，且用于在 yak 文件中进行代码签名，此处很重要！！！
# 第一个参数，目前仅有 build
MODE="$1"  

# 解码 p12 文件
echo "$CERT_BASE64" | base64 --decode >cert.p12
echo "Run mode: ${MODE:-default}"

# 创建一个临时钥匙串，并导入证书（这里不设置密码）
security create-keychain -p "" build.keychain
security default-keychain -s build.keychain
security unlock-keychain -p "" build.keychain
security import cert.p12 -k build.keychain -P $CERT_PASSWORD -T /usr/bin/codesign

# 设置钥匙链分区列表; 允许这些工具访问: apple-tool:,apple:,codesign:
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "" build.keychain

# 设置超时时间为一小时
security set-keychain-settings -t 3600 -u build.keychain

# 从钥匙串中查找包含 TEAM_ID 的签名证书标识
CERT_ID=$(security find-identity -v -p codesigning | grep "$TEAM_ID" | head -n1 | awk -F\" '{print $2}')
echo "Using certificate: $CERT_ID"

# ===============================
# build 模式：到此结束
# ===============================
if [ "$MODE" = "build" ]; then
  echo "build mode detected, skip codesign engine" 
  exit 0
fi

# 对 yak 可执行文件进行签名（请替换为你的可执行文件路径）
echo "signing mac amd64 engine"
codesign --timestamp --options runtime --sign "$CERT_ID" ./bins/yak_darwin_amd64
zip ./bins/yak_darwin_amd64.zip ./bins/yak_darwin_amd64 && rm ./bins/yak_darwin_amd64
echo "signing mac arm64 engine"
codesign --timestamp --options runtime --sign "$CERT_ID" ./bins/yak_darwin_arm64
zip ./bins/yak_darwin_arm64.zip ./bins/yak_darwin_arm64 && rm ./bins/yak_darwin_arm64
