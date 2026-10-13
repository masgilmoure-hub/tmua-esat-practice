# 学生试用部署

本应用只有静态前端，当前已使用 **Codex Sites** 部署，无需数据库或应用服务端密钥。现在线上包含 21 道原创示例与 320 道 TMUA 原卷题，2018–2023 共 240 道题已有本站双语解析与考点；2018–2023 完整原卷提供当年尺度的预估分数。

## 当前 Sites 测试站点

- 名称：`TMUA / ESAT Practice`。
- 网址：<https://tmua-esat-practice-test.tealcreek7.chatgpt.site>。
- 访问模式：公开；平台域名的防护策略仍可能拒绝部分访问，详见下述学生反馈。
- 应用版本：线上主脚本与 CSS 已核对，与 GitHub `main` 的 `5e0538f1f8fe7653e815058b5b3cabbe64587f36` 生产构建字节一致。部署由用户完成，本会话没有 Sites 发布工具。
- 构建：`npm run build`；静态目录：`dist`。

2026-10-13，用户确认部署后重新核验：HTML / JavaScript / CSS 返回成功，主脚本及 CSS 与上述构建完全一致；六份历史分数表在线文件的 SHA-256 全部匹配仓库。6 项针对最新功能的交互验收通过，包括搜索下拉框、历年真题直接开始、2023 两卷 20/40 → 6.2、2018 P2 不限时 11/20 → 6.5、语言切换、刷新记录和手机布局。全部使用真实线上资源，没有以本地产物替代线上响应。

云 Chromium 的原生 HTTPS 导航仍遇到 `ERR_CERT_AUTHORITY_INVALID`；交互测试在该 HTTPS origin 下，由保留 TLS 校验的 curl 获取线上响应后传给浏览器，未关闭验证或修改系统信任。这确认的是线上资源与应用交互，不代表已验证普通学生浏览器的原生 HTTPS / 平台防护策略。之前 2026-10-11 的 12 项上线检查保留在 [验证记录](validation.md)。

更新时请使用此**已有站点**发布新版本，避免重复创建新站点。当前发布是手动执行的，GitHub `main` 更新不会自动替换 Sites 已发布版本。正式更改应用代码后，应先跑构建与测试，再通过 Sites 更新相同网址并复测。记录随网址 origin 保存，尽量保持现有网址稳定。

### 学生访问被拦截（未解决）

2026-10-11 学生反馈页面显示“Sorry, you have been blocked / You are unable to access chatgpt.site”。这是托管域名的安全拦截页，尚未进入应用；不能仅据此确定地区、IP 或浏览器是哪一项触发规则。同一时段从当前云环境以默认请求和桌面浏览器 User-Agent 获取该网址均为 HTTP 200、应用标题正确，未复现拦截。

后续已确认：学生不在中国大陆，能打开 `chatgpt.com`，Safari 与 Chrome 均出现相同拦截。两个域名使用不同访问及防护策略，能访问 `chatgpt.com` 不证明该 Sites 网址可达；当前不能归因于大陆网络或单一浏览器。

已收到截图确认的 **Cloudflare Ray ID：`a48c86aabdf94b09`**。出错的精确时间/时区与更换网络后的结果尚未提供。平台应通过该 Ray ID 核查具体防护规则；不根据一个拦截截图推测地区封锁或确定为某类 IP 问题。

已更新平台事件报告 `/workspace/tmua-sites-access-report.md`，并准备英文支持请求 `/workspace/tmua-sites-support-request.txt`；**尚未发送支持请求**。需要由可使用平台支持入口的站点所有者提交，当前会话无平台支持或防护管理工具。再次验收应以受影响学生实际打开并完成一题为准。

若仍被拦截，需要 Sites 平台核查该访问请求的防护规则，或迁移至经学生真实网络验证可访问的托管网址；当前会话未提供 Sites 管理/防护设置工具，不能直接解除此拦截。当前无可用的替代公网部署凭据，迁移尚未执行。

临时电脑试用可用已生成的自包含 HTML 文件：在项目运行 `npm run preview:standalone`，下载 `dist/tmua-esat-preview.html`，通过电脑浏览器打开。它不请求 `chatgpt.site` 或 CDN，保持现有完整练习功能；文件协议下的本地存储取决于浏览器，不代替稳定的线上托管或跨设备同步。

## GitHub Pages（手动备用）

仓库已于 2026-10-13 由用户改为 Public，API 和未登录网页访问均已核实。此前私有仓库的套餐显示“Upgrade or make this repository public to enable Pages”；公开后可另外配置此备用部署路线。当前 Pages 尚未启用（has_pages=false），现有测试网站仍使用 Sites。工作流仅支持手动触发，不随每次 GitHub 提交自动部署。

1. 打开仓库 **Settings → Pages**。
2. 在 **Build and deployment → Source** 选择 **GitHub Actions**。如果没有此选项，检查仓库管理员权限、组织策略及当前 GitHub 方案是否支持该仓库的 Pages。
3. 打开 **Actions → Validate and deploy student preview → Run workflow**，选择 `main`。每次需要更新备用 Pages 网站时手动运行。
4. 工作流通过逻辑测试、题库校验、TypeScript/生产构建和 Chromium 浏览器测试后才部署。以工作流 `deploy` 的实际 `page_url` 和 Settings → Pages 公布的网址为准。

此仓库默认的候选地址是 `https://masgilmoure-hub.github.io/tmua-esat-practice/`。**仅配置文件或成功推送代码不代表网站已上线。** 必须确认部署成功，再打开实际网址验收。私有源码仓库能否使用 Pages 取决于 GitHub 方案；普通 Pages 网站可能公开可访问，不要将真实学生身份或私密数据写入源码。

Vite 使用相对资源路径，可直接部署到仓库子目录，也可将 `dist/` 上传到其他静态托管服务。当前界面导航不改变 URL，刷新不会依赖服务器路由回退。

## 上线验收

- 在最终 HTTPS 网址打开题库，检查九维筛选及细分考点搜索、中英切换，无空白页和资源 404。
- 练习 `TMUA-P1-001`，选择 C，标记待检查并刷新；答案和标记应保留。
- 交卷应显示 `1 / 1`、`100%`，可切换解析语言；刷新后在练习记录找到结果。
- 从“历年真题”直接开始 2018–2023 单卷 / 两卷，核对独立计时、原始分和预估分数的年份 / 范围；再试做缩短版 TMUA / ESAT 示例模考，确认示例不显示历史换算分数；查看手机布局。
- 使用另一浏览器验证记录独立，确认学生理解“尚未跨设备同步”。

本机已对生产构建的 `/tmua-esat-practice/` 子目录进行浏览器验收。GitHub Pages 工作流执行、仓库 Pages 设置和 Pages 公网地址仍未验证；上述 Sites 站点是独立部署，不代表 GitHub Pages 已启用。

## 更新与回退

Sites：修复后保存到 GitHub，构建与检查通过，再在已有 Sites 站点发布新版本；回退时使用经过验证的旧版本重新发布。GitHub Pages 备用路线：手动运行工作流会检查并更新 Pages 网址，检查失败不会进入部署步骤。已有浏览器练习记录不自动删除。

本地开发网址、单文件预览和正式 HTTPS 网址有独立的本地记录。改域名或换浏览器不会迁移旧记录，服务端账号/同步尚未实现。
