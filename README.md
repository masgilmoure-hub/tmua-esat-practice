# TMUA / ESAT practice

面向学生的可操作中英双语练习网站原型。题干始终为英文，解析可选中文、英文或中英对照。

**当前只有 21 道原创示例题（每卷 / 模块 3 题），不是官方真题，也不是完整官方模考。** 官方介绍与当前链接的 2026 年 10 月 / 2027 年 1 月考纲已于 2026-10-11 核实，见 [规则与考纲来源](docs/exam-rules.md)。

## 运行

需要 Node.js ≥ 22.12（本环境为 24）和 npm。无需后端、数据库或密钥。

```sh
cd /workspace/tmua-esat-practice
npm ci --cache /workspace/.cache/npm --no-audit --no-fund
npm run dev -- --port 5174 --strictPort
```

开发服务为 `http://localhost:5174`。正式构建可部署到任意静态托管服务：

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

如果云环境未提供可访问的端口转发，也可生成**可直接打开的交互式单文件预览**：

```sh
npm run preview:standalone
# 下载 dist/tmua-esat-preview.html 后，在现代浏览器中打开
```

预览文件内置实际构建产物，不依赖 CDN，不是静态截图。`file://` 存储行为取决于浏览器；稳定保存建议使用 HTTP(S) 服务。同一应用在不同网址、端口、浏览器或设备中使用独立记录。

## 部署学生测试网址

已提供 GitHub Pages 自动验证与部署工作流。仓库管理员首次在 **Settings → Pages → Source** 选择 **GitHub Actions**，再在 Actions 手动运行 `Validate and deploy student preview`；此后推送到 `main` 自动验证并部署。最终网址、上线验收和回退说明见 [部署说明](docs/deployment.md)。成功推送代码不等于网站已经上线。

## 已实现

- 六维题库筛选：考试、试卷/科目、知识点、细分考点、原始来源、做题状态，支持联动重置、分页与空状态。
- 专项训练：当前筛选结果随机抽题，不重复；选择题数、是否限时和分钟数；也能单题练习或重练错题。
- 答题：单选、上一题/下一题、题号导航、待检查标记、交卷确认，提交前不展示解析。
- 缩短版示例模考：TMUA 两卷；ESAT Mathematics 1 必选，其他模块可选。各部分独立计时，提交后锁定；超时自动交卷，剩余时间不转移。
- 结果：答对数、以全部题目为分母的正确率、答题用时、未答数、知识点表现与分卷/模块结果。没有官方 1–9 分换算。
- 复盘：所有选项、正确答案、完整双语步骤、易错点、原始来源和题号；可仅查看错题/未答题。
- 本地记录：自动保存未完成答案、标记、绝对截止时间和题目快照；刷新可续做。按最新一次提交维护错题本，答对后移出；保留最近 200 次提交；清空需确认。
- 存储异常提示：数据损坏或未来版本不会静默覆盖；存储禁用/满时明确说明仅在页面内保留。
- 响应式布局、语义表单、键盘单选、焦点提示和原生可访问确认对话框。

## 检查

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run validate:bank -- examples/question-bank.json
```

Playwright 使用 Chromium。本云环境已有 `/usr/bin/chromium`；其他机器可运行 `npx playwright install chromium`，或通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定现有浏览器。端到端测试启动 **生产构建**的 4173 预览服务，所以需先执行 `npm run build`。测试输出与截图写入 `/tmp/tmua-esat-playwright`。

测试覆盖筛选/空状态、中英切换、题数与随机抽题、答题/标记/导航、刷新恢复、正确率与未答统计、双语解析、记录持久化、错题纠正、超时自动提交、独立模块计时、确认删除、损坏/写满存储和手机布局。测试数量与实际结果见 [验证记录](docs/validation.md)。

## 结构与后续工作

```text
src/data/         官方规则常量、标签、原创示例题
src/features/     题库、模考设置、答题、结果、记录
src/components/   公共界面、导航与确认对话框
src/domain.ts     筛选、组题、计时和成绩逻辑
src/storage.ts    带版本的本地记录校验
tests/            逻辑测试与浏览器交互测试
docs/             官方来源、题库规范、设计与验证说明
scripts/          题库 JSON 校验器、单文件预览构建
```

题库格式、原始来源字段与导入约定见 [题库说明](docs/question-bank.md)。本版没有官方材料上传/PDF 解析功能，没有收费、视频或正式账号。没有跨设备同步、教师成绩面板或作业分发；不用于正式安全考试或官方成绩预测。

部分之间的过渡页仅用于原型体验，不代表真实考试允许随意暂停。题目数量和难度不足以评估完整考纲掌握情况。记录只在单个浏览器存储，不处理多标签页并发冲突；正式学生/教师端需要服务端身份、权限、数据版本和成绩计算。

每个 Codex 云任务已隔离，使用当前 checkout，无需创建额外 Git worktree。
