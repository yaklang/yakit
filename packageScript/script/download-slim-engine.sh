#!/usr/bin/env bash
# 将社区版 Yakit 内置引擎替换为轻量版。
# 本地下载文件名保持 yak_*，保证 zip 内路径仍是 bins/yak_*，解压逻辑不用改。
set -euo pipefail

PLATFORM="${1:-all}"
VERSION="${2:-${ENGINE_VERSION:-}}"
OSS_BASE="${OSS_BASE:-https://yaklang.oss-accelerate.aliyuncs.com}"

if [ -z "$VERSION" ]; then
  echo "ENGINE_VERSION required" >&2
  exit 1
fi

mkdir -p bins
BASE="${OSS_BASE}/yak/${VERSION}"

download_linux() {
  wget -O bins/yak_linux_amd64 "${BASE}/yak-slim_linux_amd64"
  rm -f bins/yak_linux_amd64.zip
  zip -q bins/yak_linux_amd64.zip bins/yak_linux_amd64
  rm -f bins/yak_linux_amd64

  wget -O bins/yak_linux_arm64 "${BASE}/yak-slim_linux_arm64"
  rm -f bins/yak_linux_arm64.zip
  zip -q bins/yak_linux_arm64.zip bins/yak_linux_arm64
  rm -f bins/yak_linux_arm64
}

download_or_fallback() {
  local dest="$1"
  local url="$2"
  local fallback="$3"
  if wget -O "$dest" "$url"; then
    return 0
  fi
  echo "slim artifact missing, fallback: $fallback" >&2
  wget -O "$dest" "$fallback"
}

download_windows() {
  wget -O bins/yak_windows_amd64.exe "${BASE}/yak-slim_windows_amd64.exe"
  rm -f bins/yak_windows_normal_amd64.zip
  zip -q bins/yak_windows_normal_amd64.zip bins/yak_windows_amd64.exe
  rm -f bins/yak_windows_amd64.exe

  # OSS 目前没有 yak-slim_windows_legacy_*，legacy 包回退标准引擎
  download_or_fallback \
    bins/yak_windows_amd64.exe \
    "${BASE}/yak-slim_windows_legacy_amd64.exe" \
    "${BASE}/yak_windows_legacy_amd64.exe"
  rm -f bins/yak_windows_legacy_amd64.zip
  zip -q bins/yak_windows_legacy_amd64.zip bins/yak_windows_amd64.exe
  rm -f bins/yak_windows_amd64.exe
}

download_darwin() {
  wget -O bins/yak_darwin_amd64 "${BASE}/yak-slim_darwin_amd64"
  wget -O bins/yak_darwin_arm64 "${BASE}/yak-slim_darwin_arm64"
  wget -O bins/yak_darwin_amd64.sha256.txt "${BASE}/yak-slim_darwin_amd64.sha256.txt"
  wget -O bins/yak_darwin_arm64.sha256.txt "${BASE}/yak-slim_darwin_arm64.sha256.txt"
}

case "$PLATFORM" in
  all)
    download_linux
    download_windows
    download_darwin
    ;;
  linux) download_linux ;;
  windows) download_windows ;;
  darwin) download_darwin ;;
  *)
    echo "Unknown platform: $PLATFORM (all|linux|windows|darwin)" >&2
    exit 1
    ;;
esac

echo "Replaced bundled engine with slim ${VERSION} (${PLATFORM})"
