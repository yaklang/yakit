#!/usr/bin/env bash
# 给 Windows 安装包(.exe)做 Authenticode 代码签名。
# 复用 yaklang 引擎同款 Azure Key Vault + AzureSignTool 方案，可在 macOS/Linux/Windows 本地执行，
# 用于「本地打包后、对外分发前」给安装包外壳补签名。
#
# 用法:
#   ./packageScript/script/sign-windows.sh [目标目录或文件 ...]
#   不带参数时默认签名 ./release 目录下所有 *windows*.exe
#
# 依赖的环境变量(命名与 yaklang 仓库保持一致):
#   AZURE_YAK_CODE_SIGN_KEY_VAULT_URI
#   AZURE_YAK_CODE_SIGN_KEY_VAULT_APPLICATION_ID
#   AZURE_YAK_CODE_SIGN_KEY_VAULT_DIRECTORY_ID
#   AZURE_YAK_CODE_SIGN_KEY_VAULT_CLIENT_SECRET
#   AZURE_YAK_CODE_SIGN_KEY_VAULT_CERT_NAME
#   AZURE_YAK_CODE_SIGN_KEY_VAULT_TIMESTAMP_URL
#
# 前置条件: 已安装 .NET 8 SDK。脚本会在缺少 AzureSignTool 时自动 dotnet tool install。

set -euo pipefail

log() { echo "[sign-windows] $*"; }

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "[sign-windows] ERROR: missing required env: ${name}" >&2
    exit 1
  fi
}

require_env AZURE_YAK_CODE_SIGN_KEY_VAULT_URI
require_env AZURE_YAK_CODE_SIGN_KEY_VAULT_APPLICATION_ID
require_env AZURE_YAK_CODE_SIGN_KEY_VAULT_DIRECTORY_ID
require_env AZURE_YAK_CODE_SIGN_KEY_VAULT_CLIENT_SECRET
require_env AZURE_YAK_CODE_SIGN_KEY_VAULT_CERT_NAME
require_env AZURE_YAK_CODE_SIGN_KEY_VAULT_TIMESTAMP_URL

# 确保 AzureSignTool 可用(优先用已安装的，否则尝试通过 dotnet 安装)
ensure_tool() {
  if command -v AzureSignTool >/dev/null 2>&1; then
    return 0
  fi
  if command -v dotnet >/dev/null 2>&1; then
    log "AzureSignTool not found, installing via dotnet global tool ..."
    dotnet tool install --global AzureSignTool >/dev/null 2>&1 || dotnet tool update --global AzureSignTool >/dev/null 2>&1 || true
    export PATH="${HOME}/.dotnet/tools:${PATH}"
  fi
  if ! command -v AzureSignTool >/dev/null 2>&1; then
    echo "[sign-windows] ERROR: AzureSignTool is not available." >&2
    echo "[sign-windows] Install .NET 8 SDK first, then: dotnet tool install --global AzureSignTool" >&2
    exit 1
  fi
}

ensure_tool
log "using $(AzureSignTool --version 2>/dev/null | head -n 1)"

# 收集待签名文件
declare -a targets=()
if [ "$#" -eq 0 ]; then
  set -- ./release
fi
for p in "$@"; do
  if [ -d "${p}" ]; then
    while IFS= read -r f; do
      targets+=("${f}")
    done < <(find "${p}" -type f -name '*windows*.exe')
  elif [ -f "${p}" ]; then
    targets+=("${p}")
  else
    log "skip non-existent path: ${p}"
  fi
done

if [ "${#targets[@]}" -eq 0 ]; then
  echo "[sign-windows] ERROR: no windows .exe found to sign" >&2
  exit 1
fi

sign_one() {
  local file="$1"
  log "signing: ${file}"
  AzureSignTool sign \
    -kvu "${AZURE_YAK_CODE_SIGN_KEY_VAULT_URI}" \
    -kvi "${AZURE_YAK_CODE_SIGN_KEY_VAULT_APPLICATION_ID}" \
    -kvt "${AZURE_YAK_CODE_SIGN_KEY_VAULT_DIRECTORY_ID}" \
    -kvs "${AZURE_YAK_CODE_SIGN_KEY_VAULT_CLIENT_SECRET}" \
    -kvc "${AZURE_YAK_CODE_SIGN_KEY_VAULT_CERT_NAME}" \
    -tr "${AZURE_YAK_CODE_SIGN_KEY_VAULT_TIMESTAMP_URL}" \
    -td sha256 \
    -v \
    "${file}"
}

for f in "${targets[@]}"; do
  sign_one "${f}"
done

log "done. signed ${#targets[@]} file(s)."
