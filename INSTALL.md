# 安装、核对与回滚

常规安装见 [README](./README.md)。本文给出兼容性核查、装完核对与回滚的完整步骤。

## 前提

- 宿主：DeepSeek Harness `>= 0.2.1-rc.2`，桌面端与 `dsh web` 通用。
- 目标 profile：桌面端为 `desktop`，`dsh web` 启动的档为 `web`。下文用 `<profile>` 表示。
- GUI 端口：每次启动会变，取浏览器地址栏里的实际端口。下文用 `<port>` 表示。

## 兼容体检

| 检查项 | 结论 |
|---|---|
| `dsh.client.inject` 模块清单 | 未声明；启动图里没有第三方模块边，不存在「模块名不在宿主模块表 → 界面卡死」的路径 |
| 客户端 require | 仅 `react`（client baseline seed 模块） |
| 宿主 import | `@deepseek-ai/schemastery` 惰性 try/catch；模块缺失时行 Config 缺席，着色照常 |
| dependencies / peerDependencies / 安装脚本 | 均无 |
| `lib` 是否随包提交 | 是；无构建步骤 |
| engines | `node >=18`、`dsh >=0.2.1-rc.2` |
| bundle patch 内容 | 单条 `insert`，无 `!!js`、无 config 覆盖 |
| 配置页 slot | `plugins.row.config`，key `dsh-context-tone#dsh-context-tone` |

## 一、安装

三条通道任选。

### 1. GitHub 源

```bash
dsh plugin --profile <profile> add github:lin114514-desng/dsh-context-tone
```

### 2. Release 安装包

```bash
dsh plugin --profile <profile> add "https://github.com/lin114514-desng/dsh-context-tone/releases/download/v0.2.1/dsh-context-tone-0.2.1.tgz"
```

### 3. 本地包

改过代码自测时用这条：

```bash
pnpm pack                                    # 在仓库根执行，产出 dsh-context-tone-0.2.1.tgz
cd "<profile 目录>"
pnpm add "<仓库绝对路径>/dsh-context-tone-0.2.1.tgz" --registry=https://registry.npmjs.org --save-exact -w
```

然后编辑该 profile 的 `package.json`，把 `"dsh-context-tone"` 追加进 `dsh.profile.bundles`。

从 GitHub 源安装若停在 `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`，是该 profile 的 pnpm 工作区没有放行依赖构建脚本；本包无安装脚本，把包名加进 `pnpm-workspace.yaml` 的 `allowBuilds` 后重跑即可。

## 二、装完核对

1. `<profile>/node_modules/dsh-context-tone/` 里有 `lib/index.js`、`lib/client.js`、`cordis.patch.yml`、`icon.svg`、`README.md`
2. profile `package.json` 的 `dependencies` 有 `"dsh-context-tone"`
3. profile `package.json` 的 `dsh.profile.bundles` 有 `"dsh-context-tone"`
4. 强刷页面（`Ctrl+Shift+R`）
5. 验收点：
   - 占用低于第一档（默认 < 12%）：胶囊保持官方灰，百分比右侧显示 🥰
   - 占用跨过 12% / 25% / 35% / 50% / 80%：圆环与数字变色，右侧换成对应 emoji
   - 插件页 → 本包 → 行 `dsh-context-tone` → 配置：改分界值/颜色/emoji → 保存 → 胶囊即时变化；离开再进配置页，值仍在
   - 关掉总开关：恢复官方灰、emoji 消失；重新打开后恢复
   - DevTools 抽查：`[data-composer-dock]` 内的胶囊按钮上有 `data-dsh-ctx-tone` 与 `data-dsh-ctx-emoji` 属性
6. 界面异常（白屏/卡死/报错框）：按第四步回滚，并把现象记进 issue。

## 三、热挂载与状态

clone 仓库后可用脚本直接对运行中的 GUI 发回环请求：

```bash
node tools/toggle-dsh-context-tone.mjs status --port <port>   # 查状态
node tools/toggle-dsh-context-tone.mjs on     --port <port>   # 热挂载
node tools/toggle-dsh-context-tone.mjs off    --port <port>   # 热卸载
```

返回体里该包的 `state` 为 `live` 即挂载成功。脚本只连 `127.0.0.1`。

## 四、回滚

1. 插件页停用本包，或执行 `node tools/toggle-dsh-context-tone.mjs off --port <port>`
2. 编辑 profile `package.json`：删掉 `dependencies` 里的 `"dsh-context-tone"` 行与 `dsh.profile.bundles` 里的 `"dsh-context-tone"` 行
3. 删掉 `<profile>/node_modules/dsh-context-tone`
4. 完全退出应用（托盘退出）再重开
5. profile 的 `cordis.patch.yml` 里可能残留 toggle 追加的 `- id: dsh-context-tone` / `disabled: false` 行，删掉即可；本包的功能配置走自己的 bundle patch，不写 profile patch
