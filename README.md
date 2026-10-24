
# 🛡️ Yakit (English Edition)

[![Build & Release English Edition](https://github.com/professoxrmoriarty/yakit/actions/workflows/release-en.yml/badge.svg)](https://github.com/professoxrmoriarty/yakit/actions/workflows/release-en.yml)
[![Sync Upstream & Auto-Translate](https://github.com/professoxrmoriarty/yakit/actions/workflows/sync-upstream.yml/badge.svg)](https://github.com/professoxrmoriarty/yakit/actions/workflows/sync-upstream.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

> **Yakit English Edition** is an automated fork of the powerful cyber security ALL-IN-ONE platform [yaklang/yakit](https://github.com/yaklang/yakit). This repository automatically syncs with the upstream master branch every 6 hours, translates all UI locales (`zh` to `en`), security plugins (`.yak`), and vulnerability PoC YAML metadata into professional English using an advanced glossary-backed translation engine, and delivers fully compiled cross-platform installers.

---

## ✨ Key Features of English Edition

* 🌐 **Full English UI Out of the Box:** The default language (`i18n.ts`) is permanently locked to English (`en`), eliminating Chinese localization barriers.
* 🤖 **Automated Upstream Sync & Translation:** Runs a cron workflow every 6 hours to fetch the latest security tools, vulnerability templates, and engine improvements from upstream without manual intervention.
* 🛡️ **Security Glossary Engine:** Utilizes a specialized mapping dictionary (`security_glossary.json`) to accurately translate Red Team terms (e.g., *免杀* ➔ *AV Evasion*, *内存马* ➔ *MemShell*, *反连平台* ➔ *OOB Reverse Server*, *漏洞检测* ➔ *Vulnerability Detection*).
* 📦 **Automated Cross-Platform Releases:** Fully compiled, ready-to-use binaries for **Windows**, **macOS** (Apple Silicon & Intel), and **Linux** are automatically built and published via GitHub Actions on every upstream release tag.

---

## 📥 Download Installers

Get the latest native application installers directly from the [Releases Page](../../releases/latest):

| Platform | Architecture | File Format | Download Link |
| :--- | :--- | :--- | :--- |
| **Windows** | x64 / x86_64 | `.exe` (NSIS Installer) | [Download Latest (.exe)](../../releases/latest) |
| **macOS** | Apple Silicon (M1/M2/M3/M4) & Intel | `.dmg` | [Download Latest (.dmg)](../../releases/latest) |
| **Linux** | x64 | `.AppImage` | [Download Latest (.AppImage)](../../releases/latest) |

---

## 🚀 Quick Start & Usage

### Running from Source

If you prefer to run the English edition directly from source code:

```bash
# 1. Clone the repository
git clone [https://github.com/professoxrmoriarty/yakit.git](https://github.com/professoxrmoriarty/yakit.git)
cd yakit

# 2. Switch to the English edition branch
git checkout english-edition

# 3. Install dependencies using the unified CLI
yarn cli install

# 4. Start development server or build production bundle
yarn cli start -v yakit

```

---

## 💡 Troubleshooting & Installation Notes

* **Windows SmartScreen Notice:** Because binaries are compiled via automated community CI without commercial EV certificates, Windows Defender SmartScreen may show an unrecognized app warning. Click **More info** ➔ **Run anyway** to proceed.
* **macOS Quarantine Notice:** If macOS marks the app as damaged or from an unidentified developer, run the following command in your Terminal:

```bash
sudo xattr -rd com.apple.quarantine /Applications/Yakit.app

```

---

## 🔄 Upstream Synchronization Policy

This repository automatically tracks [`yaklang/yakit`](https://github.com/yaklang/yakit). All core platform features, vulnerability checks, and script engines remain 100% synchronized with the official release cycles while maintaining a clean English interface layer.

---

## 📜 License

Licensed under the [Apache 2.0 License](https://www.google.com/search?q=LICENSE). Original project developed and maintained by the [Yaklang Team](https://yaklang.io).

---

## Manually Check GitHub Actions Workflows

1. Open the repository on GitHub and select the **Actions** tab.
2. Select **Sync Upstream & Auto-Translate** or **Build & Release English Edition** in the workflow list.
3. Review the latest run. To start a manual run, select **Run workflow** if the button is available, choose the branch, and confirm.
4. Open the run and inspect each job's logs. A successful run shows a green check; investigate any failed step in its log.

The **Run workflow** button is available only when the workflow supports `workflow_dispatch` and the repository permits manual runs. The sync workflow may change repository files, so review its results before merging or publishing them.
