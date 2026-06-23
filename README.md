# @cnbattle/pi-web

[pi 编程智能体](https://github.com/badlogic/pi-mono) 的网页界面。基于 [@agegr/pi-web](https://github.com/agegr/pi-web) 增强，新增固定目录、工具配置面板等特性。

## 快速开始

**无需安装，直接运行：**

```bash
npx @cnbattle/pi-web@latest
```

**或全局安装后使用：**

```bash
npm install -g @cnbattle/pi-web
pi-web
```

启动后打开 [http://localhost:30141](http://localhost:30141)。

**可选参数：**

```bash
pi-web --port 8080               # 自定义端口
pi-web --hostname 127.0.0.1      # 仅本机访问
pi-web -p 8080 -H 127.0.0.1     # 组合使用

PORT=8080 pi-web                 # 也支持环境变量
```

## 新增特性

- **📌 固定目录** — 在下拉菜单中固定常用工作目录，支持自定义别名
- **🎯 CWD 别名显示** — 固定目录有别名时，按钮上优先显示别名
- **🛠️ ToolsConfig 面板** — 按工具粒度独立开关（内置 + 扩展），替代旧的三档预设
- **🔌 扩展工具可用** — pi-web 新建会话时扩展/package 工具不再被过滤
- **🔗 扩展模型选择** — 扩展注册的 provider 出现在 Web 模型选择器中
- **📜 智能滚动** — 用户滚动离开后不再强制跳到底部，显示「滚动到底部」按钮
- **📊 HTML 表格渲染** — Markdown 中 HTML `<table>` 正常渲染
- **⚡ 大会话优化** — 修复 1000+ 消息会话的栈溢出，增加 TTL 缓存

## 功能介绍

- **会话浏览器** — 按工作目录分组展示所有 pi 会话
- **实时对话** — 通过 SSE 流式输出与智能体实时交互
- **会话分叉** — 从任意用户消息创建独立的新会话分支
- **会话内分支** — 回退到任意节点继续对话，在同一文件内创建分支
- **分支导航器** — 可视化切换同一会话内的各个分支
- **模型切换** — 对话中途随时切换模型
- **工具配置** — 按工具粒度独立开关，支持扩展工具
- **固定目录** — 固定常用目录，支持别名，点击切换
- **压缩会话** — 对长会话进行摘要，节省上下文窗口
- **引导 / 追加** — 打断正在运行的智能体，或在其完成后追加消息

## 注意事项

- **数据目录** — 默认读取 `~/.pi/agent/sessions` 下的会话文件。可通过环境变量 `PI_CODING_AGENT_DIR` 指定其他目录。
- **模型配置** — 从智能体数据目录下的 `models.json` 读取可用模型，可在侧边栏的「Models」面板中编辑。
- **文件浏览** — 侧边栏内置文件浏览器，可在标签页中查看当前工作目录下的文件。

## 开发

```bash
git clone https://github.com/cnbattle/pi-web.git
cd pi-web
npm install
npm run dev   # 端口 30141
```

## 项目结构

```
app/
  api/
    sessions/      # 读写会话文件
    agent/         # 发送命令、SSE 事件流
    files/         # 文件内容读取
    models/        # 可用模型列表与默认模型
    models-config/ # 读写 models.json
    pinned-dirs/   # 固定目录管理 (新增)
    tools/         # 工具配置管理 (新增)
components/        # UI 组件
  SessionSidebar   # 侧边栏（含固定目录）
  ToolsConfig      # 工具配置面板 (新增)
  ChatWindow       # 聊天窗口（含智能滚动）
lib/
  session-reader.ts  # 解析 .jsonl 会话文件
  rpc-manager.ts     # 管理 AgentSession 生命周期（含扩展工具修复）
  normalize.ts       # 规范化 toolCall 字段名
  types.ts
```

会话文件存储路径：`~/.pi/agent/sessions/<编码后的工作目录>/<时间戳>_<uuid>.jsonl`

## 链接

- GitHub: https://github.com/cnbattle/pi-web
- npm: https://www.npmjs.com/package/@cnbattle/pi-web
- 上游项目: https://github.com/agegr/pi-web
