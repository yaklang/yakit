#!/bin/zsh
# 在当前终端执行: source scripts/set-electron-mirror-macos.sh
unset ELECTRON_MIRROR ELECTRON_BUILDER_BINARIES_MIRROR
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
