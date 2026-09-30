#!/bin/sh
# Cross-platform bytecode cannot be safely produced by a single host.
echo "This cross-platform script has been retired. Use GitHub Actions: Multi-Platform Build Develop (platform=mwl, version=memfit)." >&2
echo "For local builds, use the pack-win-memfit / pack-linux-memfit / pack-mac-memfit command on its matching OS and architecture." >&2
exit 1
