
<div align="center">

# 🛡️ YAKIT — Cyber Security All-in-One Platform (English Edition)

**An Interactive Penetration Testing Workbench Powered by the Yaklang Security Programming Language (CDSL)**

[![Build & Release (English)](https://github.com/professoxrmoriarty/yakit/actions/workflows/release-en.yml/badge.svg)](https://github.com/professoxrmoriarty/yakit/actions/workflows/release-en.yml)
[![Sync Upstream & Translate](https://github.com/professoxrmoriarty/yakit/actions/workflows/sync-upstream.yml/badge.svg)](https://github.com/professoxrmoriarty/yakit/actions/workflows/sync-upstream.yml)
[![Latest Release](https://img.shields.io/github/v/release/professoxrmoriarty/yakit?label=English%20Release)](https://github.com/professoxrmoriarty/yakit/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/professoxrmoriarty/yakit/total)](https://github.com/professoxrmoriarty/yakit/releases)
[![License](https://img.shields.io/github/license/professoxrmoriarty/yakit)](LICENSE.md)

[Download English Installers](https://github.com/professoxrmoriarty/yakit/releases/latest) •
[Whitepaper](https://yaklang.oss-cn-beijing.aliyuncs.com/yakit-technical-white-paper.pdf) •
[Official Website (EN)](https://yaklang.com/en/) •
[Official Documentation](https://yaklang.io/products/intro/) •
[Issue Feedback](https://github.com/professoxrmoriarty/yakit/issues) •
[Architecture](#architecture)

</div>

---

> **Yakit English Edition** is an automated fork of the powerful cyber security ALL-IN-ONE platform [yaklang/yakit](https://github.com/yaklang/yakit). This repository automatically syncs with the upstream master branch every 6 hours, translates all UI locales (`zh` to `en`), security plugins (`.yak`), and vulnerability PoC YAML metadata into professional English using an advanced glossary-backed translation engine, and delivers fully compiled cross-platform installers.

---

## ✨ Key Features of English Edition

* 🌐 **Full English UI Out of the Box:** The default language (`i18n.ts`) is permanently locked to English (`en`), eliminating Chinese localization barriers.
* 🤖 **Automated Upstream Sync & Translation:** Runs a cron workflow every 6 hours to fetch the latest security tools, vulnerability templates, and engine improvements from upstream without manual intervention.
* 🛡️ **Security Glossary Engine:** Utilizes a specialized mapping dictionary (`security_glossary.json`) to accurately translate Red Team terms (e.g., *免杀* ➔ *AV Evasion*, *内存马* ➔ *MemShell*, *反连平台* ➔ *OOB Reverse Server*, *漏洞检测* ➔ *Vulnerability Detection*).
* 📦 **Automated Cross-Platform Releases:** Fully compiled, ready-to-use binaries for **Windows**, **macOS** (Apple Silicon & Intel), and **Linux** are automatically built and published via GitHub Actions on every upstream release tag.

---

## 📥 Download English Edition Installers

Pre-built installers with **English (`en`) enabled by default** (including translated UI, `.yak` plugins, and PoC YAML metadata) are published automatically on the [Releases Page](https://github.com/professoxrmoriarty/yakit/releases/latest):

| Operating System | Architecture | Package Format | Download |
| :--- | :--- | :--- | :--- |
| **Windows** | x64 (`amd64`) | `.exe` (NSIS Installer) | [Latest Windows `.exe`](https://github.com/professoxrmoriarty/yakit/releases/latest) |
| **macOS** | Apple Silicon (`arm64`) & Intel (`x64`) | `.dmg` | [Latest macOS `.dmg`](https://github.com/professoxrmoriarty/yakit/releases/latest) |
| **Linux** | x64 (`amd64`) & `arm64` | `.AppImage` | [Latest Linux `.AppImage`](https://github.com/professoxrmoriarty/yakit/releases/latest) |

---

## Introduction

Security integration represents a major evolution in enterprise security operations and offensive testing workflows.

Built around the concept of unified security engineering, the Yaklang team created **Yaklang**—a vertical Domain-Specific Language (CDSL) purpose-built for cybersecurity:

- For tools that cannot be natively integrated, Yaklang provides clean, high-performance native rewrites.
- For mature open-source security ecosystems, Yaklang directly compiles and integrates them at the engine level.
- For security practitioners who prefer visual workflows without writing code, **Yakit** provides a full-featured graphical workbench connected to the Yaklang engine over gRPC.

<img width="5620" height="2034" alt="Untitled diagram-2026-10-24-230050" src="https://github.com/user-attachments/assets/281c4565-e8be-4092-9df8-8ed1e732d70d" />

---

## Architecture

<img width="8190" height="4289" alt="Untitled diagram-2026-10-24-230442" src="https://github.com/user-attachments/assets/04da4dea-b8e7-4a13-8672-8e06597f5477" />

---

## Core Technologies: CDSL

**CDSL (CyberSecurity Domain-Specific Language)** is a Turing-complete language engineered specifically for security research and automation, backed by a custom stack virtual machine.

By exposing the Yaklang runtime through a platform-agnostic `yak grpc` server, Yakit decouples the user interface from the execution engine—allowing operators to run the engine locally on their workstation or remotely on cloud VPS and internal pivot hosts.

<img width="4804" height="2994" alt="Untitled diagram-2026-10-24-230556" src="https://github.com/user-attachments/assets/1d9197f9-4241-4bcc-a676-f0e06e488337" />

1. **Complete MITM Replacement**: Full request/response interception, certificate generation, HTTP history, and packet editing comparable to Burp Suite.
2. **Passive Vulnerability Scanning**: Friendly visual configuration for real-time MITM passive vulnerability detection.
3. **HotPatch Dynamic Scripting**: Embed Yaklang scripts directly into proxy pipelines to sign, decrypt, or mutate traffic on the fly.
4. **Visual Web Fuzzer**: Interactive HTTP replay and fuzzing without tedious dictionary setup.
5. **Yakit Plugin Store**: Install, manage, and author security extensions across every stage of penetration testing.
6. **Custom Script Execution**: Run standalone `.yak` scripts or full GUI plugins anywhere in the testing lifecycle.

### Overview of Security Capabilities

| Capability Domain | Built-in Modules & Engine Support |
| --- | --- |
| **Web & Traffic Testing** | MITM Proxy, HTTP History, Web Fuzzer, Fuzztag Generator, WebCrawler, Passive Scanner |
| **Reconnaissance & Mapping** | Stateless SYN Scan, Nmap Service Fingerprinting, Subdomain Enumeration, Directory Brute Force |
| **Vulnerability & Exploitation** | Native Nuclei YAML Engine, Yak PoC Framework, SQLi/XSS/SSRF/RCE Checkers, JDK-Free Java Deserialization |
| **Post-Exploitation & OOB** | Single-Port Protocol Multiplexing, Interactive Reverse Shell, OOB Server (HTTP/LDAP/RMI/DNS/ICMP), Intranet Bridge |
| **Engineering & Analysis** | Codec CyberChef-Style Pipeline, Yak SSA & SyntaxFlow Static Analysis, AI-Assisted Scripting |

---

## Specialized Technologies

### MITM Interactive Interception

The MITM Console in Yakit handles TLS certificate installation, live request/response interception, packet modification, history filtering, and one-click forwarding to Web Fuzzer. Beyond standard proxy workflows, it supports **plugin-driven passive scanning**, **HotPatch live traffic mutation**, **auto-replacement rules**, and **traffic tagging**.

Under the hood, Yakit runs a custom HTTP proxy stack that automatically handles Gzip decompression, chunked transfer decoding, and character encoding normalization for clean inspection. During packet replay, Yaklang's custom HTTP library automatically repairs protocol framing—while still allowing deliberate malformed packets when exploiting parser-level vulnerabilities.

<img width="6142" height="2805" alt="Untitled diagram-2026-10-24-230649" src="https://github.com/user-attachments/assets/62dc14e4-70e2-48be-b182-333cc01c9f7b" />

### Web Application Interactive Traffic Replay and Fuzz Testing

The **Web Fuzzer** module accepts raw HTTP requests and automatically repairs protocol mechanics behind the scenes—fixing `CRLF` line endings, completing `Content-Type` headers, handling chunked encoding, adding multipart boundaries, and recalculating `Content-Length` automatically so testers can focus purely on payload logic.

### Fuzztag

Web Fuzzer unifies Intruder-style brute-forcing, Host header collision testing, and directory discovery directly inside raw packets using inline **Fuzztags**:

- **Range & Mutation Tags**: Insert `{{int(1-10)}}` directly into a parameter (e.g., `GET /api/user?id={{int(1-10)}}`) to dynamically generate sequences without configuring separate payload tabs.
- **Multi-Parameter Cartesian Fuzzing**: Place multiple tags across headers, paths, or bodies to automatically execute Cartesian product fuzzing.
- **External Wordlists & Dynamic Scripts**: Load wordlists inline via `{{file(/tmp/username.txt)}}` or invoke live HotPatch Yak functions to generate region-specific IDs, timestamps, or signed tokens on the fly.

```http
POST /api/v1/login HTTP/1.1
Host: target.example.com
Content-Type: application/json

{
  "username": "{{file(/opt/wordlists/users.txt)}}",
  "otp_code": "{{int(000000-999999)}}",
  "signature": "{{yak(signPayload)}}"
}

```

Learn more in the official guide: [Fuzztag Documentation](https://yaklang.com/docs/newforyak/fuzztag)

### Reverse Connection & Port Protocol Multiplexing

Traditional exploitation often requires opening separate public ports for HTTP payload hosting, LDAP/RMI JNDI listeners, and netcat reverse shells. Yaklang's **Port Protocol Multiplexing** allows listening on a **single port** that inspects incoming bytes, identifies the underlying protocol automatically, and routes the connection to the matching handler.

<img width="3679" height="1784" alt="Untitled diagram-2026-10-24-230732" src="https://github.com/user-attachments/assets/2c6f20f8-59be-4142-b09a-7574a86f15b9" />

- **SSH-Like Reverse Shell**: Eliminates classic `nc` terminal issues (broken backspace, arrow keys, or Ctrl+C killing the session) by providing an interactive PTY-like shell experience.
- **Multi-Protocol Exploitation & OOB Detection**: Automatically responds to HTTP, LDAP, RMI, TCP, DNSLog, and ICMP callbacks for blind RCE and SSRF verification.

---

## How to Use

- **English Edition Releases**: Download ready-to-run Windows `.exe`, macOS `.dmg`, and Linux `.AppImage` installers from [GitHub Releases](https://github.com/professoxrmoriarty/yakit/releases/latest).
- **Official Documentation**: Visit the [Yaklang Documentation](https://yaklang.io/products/intro/) and [Official English Site](https://yaklang.com/en/).
- **Technical Resources**:
- [Yakit Technical Methodology](https://yaklang.io/products/article/yakit-technical-study/methodology)
- [Yakit Technical Whitepaper (PDF)](https://yaklang.oss-cn-beijing.aliyuncs.com/yakit-technical-white-paper.pdf)

---

## Development Setup

Prerequisites:

- **Node.js 22.x** (recommended) and **Yarn 1.x**
- **Git**
- Windows, macOS, or Linux

Steps:

1. Install all three workspaces (root Electron + Main renderer + Link renderer):

```bash
yarn cli install

```

1. Launch development mode:

```bash
yarn cli start -v yakit   # starts both renderers (:3000 + :5173)
yarn cli electron         # launch Electron after both ports are ready
# Or run everything in a single command:
yarn cli dev -v yakit

```

1. Build & package unsigned local installers:

```bash
yarn cli build -v yakit
yarn cli pack -s win -v yakit   # options: win | mac | linux | mwl

```

See [`cli/README.md`](cli/README.md) for the complete CLI reference (`install`, `start`, `build`, `pack`, `electron`, `dev`).

---

## Community & Feedback

- **Bug Reports & Feature Requests (English Fork)**: Open an issue in [professoxrmoriarty/yakit/issues](https://github.com/professoxrmoriarty/yakit/issues).
- **Upstream Discussions & Core Engine**: Visit [yaklang/yakit Discussions](https://github.com/yaklang/yakit/discussions).

---

## Stargazers Over Time

---

## Disclaimer

1. This tool is intended strictly for legally authorized enterprise security assessments, defensive research, and personal educational use in isolated lab environments.
2. Before conducting any penetration testing, ensure full compliance with local laws and regulations and obtain explicit written authorization from the target owner. Never scan or test unauthorized targets.
3. Reverse engineering, decompiling, tampering with the software to implant backdoors, or distributing malware using this platform is strictly prohibited.
4. Commercial deployment of Yakit requires official authorization from the upstream copyright holders.

By installing or using this software, you acknowledge that you have read, understood, and agreed to be bound by these terms, and you assume sole legal responsibility for your actions.

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
