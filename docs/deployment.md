# 学生试用部署

本应用只有静态前端，当前已使用 **Codex Sites** 部署，无需数据库或应用服务端密钥。部署的仍是 21 道原创示例题原型。

## 当前 Sites 测试站点

- 名称：`TMUA / ESAT Practice`。
- 网址：<https://tmua-esat-practice-test.tealcreek7.chatgpt.site>。
- 访问：公开可访问，持有链接即可打开。
- 来源：GitHub `main` 的 `228627d9644eebbea222d6c5ebdd4ad794af943e`，部署副本仅添加 `.openai/hosting.json` 静态托管配置，应用源码保持一致。
- 构建：`npm run build`；静态目录：`dist`。

2026-10-11 已确认网址及 HTML/JavaScript/CSS 返回成功，线上资源字节与当前生产构建一致。12 项交互测试在生产网址 origin 下通过；测试使用保留 TLS 验证的 curl 传输线上资源，因为云 Chromium 原生 HTTPS 导航遇到 `ERR_CERT_AUTHORITY_INVALID`。这项限制、覆盖范围及结果详见 [验证记录](validation.md)。普通学生浏览器的原生 HTTPS 打开仍需实际试用确认。

更新时请使用此**已有站点**发布新版本，避免重复创建新站点。当前发布是手动执行的，GitHub `main` 更新不会自动替换 Sites 已发布版本。正式更改应用代码后，应先跑构建与测试，再通过 Sites 更新相同网址并复测。记录随网址 origin 保存，尽量保持现有网址稳定。

## GitHub Pages（手动备用）

当前私有仓库的套餐显示“Upgrade or make this repository public to enable Pages”。该路线暂未启用，不影响上述 Sites 网站使用。工作流仅支持手动触发，避免每次 GitHub 提交都尝试不可用的 Pages 部署。

1. 打开仓库 **Settings → Pages**。
2. 在 **Build and deployment → Source** 选择 **GitHub Actions**。如果没有此选项，检查仓库管理员权限、组织策略及当前 GitHub 方案是否支持该仓库的 Pages。
3. 打开 **Actions → Validate and deploy student preview → Run workflow**，选择 `main`。每次需要更新备用 Pages 网站时手动运行。
4. 工作流通过逻辑测试、题库校验、TypeScript/生产构建和 Chromium 浏览器测试后才部署。以工作流 `deploy` 的实际 `page_url` 和 Settings → Pages 公布的网址为准。

此仓库默认的候选地址是 `https://masgilmoure-hub.github.io/tmua-esat-practice/`。**仅配置文件或成功推送代码不代表网站已上线。** 必须确认部署成功，再打开实际网址验收。私有源码仓库能否使用 Pages 取决于 GitHub 方案；普通 Pages 网站可能公开可访问，不要将真实学生身份或私密数据写入源码。

Vite 使用相对资源路径，可直接部署到仓库子目录，也可将 `dist/` 上传到其他静态托管服务。当前界面导航不改变 URL，刷新不会依赖服务器路由回退。

## 上线验收

- 在最终 HTTPS 网址打开题库，检查六维筛选、中英切换，无空白页和资源 404。
- 练习 `TMUA-P1-001`，选择 C，标记待检查并刷新；答案和标记应保留。
- 交卷应显示 `1 / 1`、`100%`，可切换解析语言；刷新后在练习记录找到结果。
- 试做缩短版 TMUA / ESAT 模考，确认分卷/模块计时和交卷；查看手机布局。
- 使用另一浏览器验证记录独立，确认学生理解“尚未跨设备同步”。

本机已对生产构建的 `/tmua-esat-practice/` 子目录进行浏览器验收。GitHub Pages 工作流执行、仓库 Pages 设置和 Pages 公网地址仍未验证；上述 Sites 站点是独立部署，不代表 GitHub Pages 已启用。

## 更新与回退

Sites：修复后保存到 GitHub，构建与检查通过，再在已有 Sites 站点发布新版本；回退时使用经过验证的旧版本重新发布。GitHub Pages 备用路线：手动运行工作流会检查并更新 Pages 网址，检查失败不会进入部署步骤。已有浏览器练习记录不自动删除。

本地开发网址、单文件预览和正式 HTTPS 网址有独立的本地记录。改域名或换浏览器不会迁移旧记录，服务端账号/同步尚未实现。
