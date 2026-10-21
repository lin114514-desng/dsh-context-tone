# 发版与插件市场投稿

维护者文档。使用者需要的是 [README](./README.md) 与 [INSTALL.md](./INSTALL.md)。

## 一、发版

1. 改 `package.json` 的 `version`，同时更新 README 与 INSTALL 安装命令里的 tag 和文件名。
2. 验证：

   ```bash
   pnpm test
   node --check lib/client.js && node --check lib/index.js
   pnpm pack
   ```

3. 核对安装包内容：

   ```bash
   tar -tzf dsh-context-tone-<版本>.tgz
   ```

   应包含 `package/package.json`、`package/lib/index.js`、`package/lib/client.js`、`package/cordis.patch.yml`、`package/icon.svg`、`package/README.md`、`package/LICENSE`。

4. 提交改动并打 tag：

   ```bash
   git tag -a v<版本> -m "dsh-context-tone <版本>"
   git push origin main --follow-tags
   ```

5. 在 GitHub 建 Release：标题 `v<版本>`，上传 `dsh-context-tone-<版本>.tgz`。

## 二、市场条目

目录在 awesome-dsh-plugin：一个插件一个 YAML，路径 `data/plugins/lin114514-desng__dsh-context-tone.yml`，一个 PR 最多 3 条。

硬性要求：仓库公开、非归档、**创建满 1 天**、有 About 描述与 LICENSE、带 `dsh-plugin` topic；`package.json` 声明 `dsh.bundle`，仓库根有 `cordis.patch.yml`。

```yaml
url: https://github.com/lin114514-desng/dsh-context-tone
name: lin114514-desng/dsh-context-tone
category: ui
description:
  en: Colors the DeepSeek Harness context meter ring and percentage by occupancy tier and appends a tier emoji, with five thresholds, five colors, and six emoji editable in the plugin settings page.
  zh: 按上下文占用档位给官方上下文胶囊改色并在百分比右侧显示 emoji，五个分界值、五档颜色、六档 emoji 可在插件配置页修改。
tarball: https://github.com/lin114514-desng/dsh-context-tone/releases/download/v0.2.1/dsh-context-tone-0.2.1.tgz
```

- 分类固定 `ui`：本包不是皮肤，`theme` 会被当皮肤处理并进主题 Tab。
- `tarball` 钉具体 tag 与带版本的文件名。不用 `latest/download/`，下次发版会 404。
- 走 npm 发布时市场按 `repository` 自动关联下载量，YAML 里不要手写 `npm:`（会被拒）。

## 三、两条上架路线

- **提 PR**：仓库建满一天后，把上面的 YAML 提给 awesome-dsh-plugin。
- **等自动同步**：给仓库打 `dsh-plugin` topic，`dshmarketplace.dev` 会自动收录，不需要 PR。

## 四、截图

仓库根放 `screenshots.json`（与 `package.json` 同级），1–8 张，路径相对仓库根或 GitHub 图链；图片放 `screenshots/` 目录。

## 五、本包的发布形态

GitHub 仓库 + 插件市场，不发 npm：`package.json` 保留 `"private": true`，安装包挂在 GitHub Release 上，市场条目用 `tarball:` 指过去。转 npm 时去掉 `private`，并在此处补 npm 的发布与预发布宿主版本范围说明。
