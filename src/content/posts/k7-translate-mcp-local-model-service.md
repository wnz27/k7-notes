---
title: "把本地翻译服务接给 Agent：K7 Translate MCP"
published: 2026-11-06
description: "介绍 K7 Translate MCP 如何让 Agent 调用本地翻译模型，包括翻译与状态检查工具、stdio 接入方式、模型地址限制及短文本处理边界。"
tags: ["K7-Translate", "MCP", "本地模型"]
category: "开源项目"
draft: false
---

> 项目时间：2026 年 11 月 6 日，K7 Translate MCP 首次提交到 K7s-Arsenal。本文基于当天的代码，记录它的用途、接入方式和目前的边界。

之前做的 [K7-Translate 浏览器扩展](/posts/k7-translate-local-browser-translation/)，让网页选文和正文可以交给本地模型翻译。今天我在 K7s-Arsenal 仓库的 `mcps/k7_translater` 目录里加了一个 MCP 服务，让支持 MCP 的 Agent 也能调用本机的翻译模型。阅读英文资料或处理多语言文本时，Agent 可以直接请求翻译，省去在浏览器中手动复制的步骤。

MCP 通过 stdio 接收 Agent 的工具调用，构造翻译提示词，再向本机的 OpenAI 兼容模型服务发送 HTTP 请求。我目前用 Docker 运行 `Index-Translate-2B`，宿主机的 `127.0.0.1:8001` 映射到容器中的 llama.cpp 服务。仓库默认配置使用 8000 端口，接入时需要按实际端口修改。

```text
Agent ──stdio──> K7 Translate MCP ──HTTP 回环地址──> llama.cpp ──> Index-Translate-2B
```

每个 Agent 可以启动自己的 MCP 进程，共用同一个模型服务。MCP 的 Node.js 依赖和模型分别安装，执行 `npm ci` 不会下载模型。

## 翻译与状态检查

MCP 暴露两个工具：

| 工具 | 做什么 |
| --- | --- |
| `k7_translate_text` | 翻译一段文本。`text` 最长 4000 字符，源语言默认 `auto`，目标语言默认 `zh`（简体中文）。 |
| `k7_translate_status` | 请求本机服务的 `/v1/models`，返回连接状态和服务列出的模型 ID。 |

比如，把英文翻成简体中文时，翻译工具接收：

```json
{"text":"Hello, world.","target_language":"zh"}
```

返回值包含译文、配置的模型 ID 和源、目标语言代码。代码为 `zh`、`zh-TW`、`en`、`ja`、`ko`、`fr`、`de`、`es`、`ru` 预设了语言名称；实际译文质量仍取决于使用的模型。我用本机 8001 端口试译 `Hello, world.`，得到「你好，世界。」。

状态工具适合先排查连接问题。它的 `ok: true` 只表示 `/v1/models` 可以访问，不能证明配置的模型 ID 一定可用。接入后还要发起一次真实翻译，检查模型名和响应。

## 接入本机模型

环境需要 Node.js 20 或更新版本，以及支持 stdio MCP 的 Agent。已有 K7s-Arsenal 仓库副本时，在 `mcps/k7_translater` 目录安装依赖：

```bash
cd /path/to/K7s-Arsenal/mcps/k7_translater
npm ci
```

模型服务需要单独启动。已有 OpenAI 兼容服务时，只要它提供 `/v1/models` 和 `/v1/chat/completions`，就可以配置相应的本机端口与模型 ID。使用默认模型时，可以按仓库中的 `mcps/k7_translater/README.md` 安装 llama.cpp、下载模型并启动服务。

下面是 Codex 的配置示例。将路径换成仓库的实际绝对路径；这里使用我本机的 8001 端口：

```toml
[mcp_servers.k7_translater]
command = "node"
args = ["/absolute/path/to/K7s-Arsenal/mcps/k7_translater/src/index.mjs"]

[mcp_servers.k7_translater.env]
K7_TRANSLATE_BASE_URL = "http://127.0.0.1:8001/v1"
K7_TRANSLATE_MODEL = "Index-Translate-2B"
```

保存后按客户端要求重新加载 MCP。先调用 `k7_translate_status`，确认列表里有 `Index-Translate-2B`，再用短句测试 `k7_translate_text`。其他支持 stdio MCP 的客户端也可以接入，配置格式见项目 README。

## 为什么限制模型地址

`K7_TRANSLATE_BASE_URL` 只接受 HTTP 的 `127.0.0.1` 或 `[::1]` 地址。把它误配成远程 API 地址时，MCP 会在启动时拒绝配置。默认请求超时是 60 秒，翻译请求使用非流式响应；服务无法连接、返回非 JSON 或空译文时，工具会给出错误信息。

这个限制约束的是 MCP 到模型服务这一段请求。如果 Agent 本身连接云端模型，输入文本如何传给 Agent 仍由所用客户端和模型服务决定，不能仅凭「本地翻译 MCP」推断整条工作流都在本机完成。

## 目前适合处理什么

现在的实现面向短文本。单次输入上限为 4000 字符，没有文件翻译、自动分段或流式输出。长文需要由调用方分段，并自行处理段落顺序和上下文。切换其他本地模型时，可以修改 `K7_TRANSLATE_MODEL`；若默认的 Index 提示词不合适，还可以把 `K7_TRANSLATE_PROMPT_PRESET` 设为 `simple`。

同一个本地模型服务可以供浏览器扩展和 Agent 使用。浏览器里的阅读交互由扩展负责，Agent 通过 MCP 获取翻译结果与服务状态。源码、完整安装步骤和配置项都在 K7s-Arsenal 的 `mcps/k7_translater` 目录。
