# TMUA / ESAT Practice

一个面向学生的中英双语练习网站原型，用于验证从筛题、作答、模考到复盘和错题重练的完整流程。当前以 TMUA 历年题为主要内容，ESAT 提供原创示例题与分模块模考演示。

[在线试用](https://tmua-esat-practice-test.tealcreek7.chatgpt.site/)

界面支持中英切换，题目保持英文，解析可选择中文、英文或中英对照。练习记录保存在当前浏览器，尚未跨设备同步。

## 功能

- **题库与专项训练**：按考试、试卷或科目、知识点、细分考点、来源、年份、作答方式、难度和做题状态筛选。细分考点支持中英文搜索；可选择题数和限时方式。
- **历年真题练习**：支持单卷或两卷、题号导航、待检查标记、独立倒计时、自动交卷和刷新续做。文字题直接显示；PDF 题使用站内阅读器保留原题中的公式和图形。
- **答题复盘**：查看答对数、正确率、用时、未答题、知识点表现、双语解析和易错点，继续练习错题或同考点题目。
- **历史分数换算**：2018–2023 年完整 TMUA 原卷按对应年份官方表显示预估分数。单卷和两卷分别查表，历史分数不能直接预测现行官方成绩。
- **本地题库管理**：导入经过复核的 JSON 题目，进行结构和来源校验，支持导出与移除。导入仅影响当前浏览器。

## 当前题库

| 内容 | 题数 | 作答与解析 |
| --- | ---: | --- |
| TMUA 2022、2023，两年各两卷 | 80 | 英文文字与公式、原图、本站双语解析和考点 |
| TMUA 2018–2021，四年各两卷 | 160 | 原卷 PDF 阅读、本站双语解析和考点 |
| TMUA 2016、2017，两年各两卷 | 80 | 原卷 PDF 阅读、答题卡与官方英文详解；本站逐题解析和考点待补齐 |
| TMUA / ESAT 原创示例 | 21 | 验证功能流程，提供双语解析 |

官方资料共 320 个题号，保留原始年份、试卷、题号与来源；其中 240 题已有本站双语解析与考点。2016 的原文件标为 Practice paper，早期样卷尚未导入。ESAT 暂无完整历年题库，示例模考按题量缩短时间。

## 本地运行

需要 Node.js ≥ 22.13 和 npm，无需后端、数据库或密钥。

```sh
git clone https://github.com/masgilmoure-hub/tmua-esat-practice.git
cd tmua-esat-practice
npm ci
npm run dev
```

按终端显示的网址打开应用。生产构建与预览：

```sh
npm run build
npm run preview
```

构建结果位于 `dist/`，可部署到静态托管服务。当前 Sites 站点采用手动发布，GitHub 提交不会自动更新网站。

## 检查

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

端到端测试使用生产构建，覆盖筛选、搜索、答题、独立计时、分数换算、复盘、刷新恢复和存储异常。也可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定已有 Chromium。

题库格式、数学内容审校及分数表来源另见文档。

## 当前边界与后续方向

本项目是已能操作的教学实验原型。记录、错题和个性导入材料保存在浏览器；更换设备、浏览器或网址后不会自动迁移。当前没有正式账号、班级、教师成绩面板或作业分发，也未实现 ESAT 分数换算或现行 TMUA 成绩预测。

后续计划结合学生试用反馈，完善题库与解析，并探索学生账号、跨设备同步和教师作业功能。

## 文档

- [题库格式与导入](docs/question-bank.md)
- [历年材料与阅读器](docs/official-papers.md)
- [历史评分来源与适用条件](docs/tmua-scoring.md)
- [官方规则与考纲](docs/exam-rules.md)
- [运行与部署](docs/deployment.md)
- [验证记录](docs/validation.md)
- [开发与环境说明（归档）](docs/development-notes.md)

## 来源与许可

原卷、官方英文详解和原题图形来自 Cambridge Assessment / Cambridge University Press & Assessment，原始公开入口为 [UAT-UK 历年资料库](https://esat-tmua.ac.uk/tmua-preparation-materials/)。本站双语解析与易错点由项目独立编写，不是官方译文；示例题明确标为原创示例。项目没有官方机构隶属或背书。

本仓库暂未为程序代码指定开源许可证。第三方考试材料保留原作者及各自的使用条件；公开仓库不会改变这些材料的许可。
