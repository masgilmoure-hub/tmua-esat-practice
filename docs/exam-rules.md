# 官方规则与现行考纲核实

核实日期：2026-10-11（北京时间）。通过保留 TLS 证书验证的 HTTPS 请求读取以下官方网页及网页当前链接的 PDF；不按 URL 路径中的 `2024` 推断考纲年份。两份 PDF 封面均写明 **For assessment in October 2026 and January 2027 / © UAT-UK 2026**。

| 来源 | 链接 | 已核实内容 |
| --- | --- | --- |
| TMUA 官方介绍 | https://esat-tmua.ac.uk/about-the-tests/tmua-test/ | 两卷，各 20 道选择题、75 分钟；总时长 150 分钟；无计算器或词典；答错不扣分 |
| ESAT 官方介绍 | https://esat-tmua.ac.uk/about-the-tests/esat-test/ | 五模块；每模块 27 道选择题、40 分钟；所有考生考 Mathematics 1，多数课程还要求两模块；按具体院校课程选择 |
| 官方备考页 | https://esat-tmua.ac.uk/prepare/ | 现行规格 PDF、Notes on Logic and Proof 与数学补充说明入口 |
| TMUA Content Specification | https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/03165619/TMUA_Content_Specification.pdf | 第 2 页：两卷相继进行、每题权重相同、答错无惩罚、无公式手册；P1 要求 Section 1，P2 要求 Sections 1 + 2 |
| ESAT Content Specification | https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/03165424/ESAT_Content_Specification.pdf | 第 2–3 页：模块独立计时，提前完成剩余时间不转移；正确一题得一分、答错不扣分，各模块分别报告 |

下载文件 SHA-256（记录核实时内容，后续官方可能替换同 URL 的文件）：

- TMUA：`4e6ec1c29b795aa5e5002309c60988546bd16b6cfb6d237336bb414b5d5760b8`
- ESAT：`da9e853ec99cc0befcae5c8871e48eedc5776d7b2db07b8d5d9e2492a01452b3`

## 考纲与题库分类

TMUA Section 1 的 AS 内容（MM）包括代数与函数、数列与级数、坐标几何、三角函数、指数与对数、微分、积分、函数图像；Higher GCSE 内容（M）包括单位、数、比与比例、代数、几何、统计、概率。Section 2 包括论证逻辑（Arg）、证明（Prf）与识别证明错误（Err）；Paper 2 同样使用 Section 1 的数学知识，不是仅考逻辑。

ESAT：Mathematics 1 使用 M；Biology 使用 B + M；Chemistry 使用 C + M；Physics 使用 P + M；Mathematics 2 使用 MM + M。生物 B1–B11 涵盖细胞、跨膜运输、细胞分裂、遗传、DNA、基因技术、变异、酶、动物生理、生态系统、植物生理；化学 C1–C17 涵盖原子、周期表、反应、定量计算、氧化还原、键与结构、族化学、分离、酸碱盐、反应速率、能量学、电解、有机化学、金属、粒子理论、检验、空气与水；物理 P1–P7 涵盖电学、磁学、力学、热学、物质、波、放射性。

原型的知识点/细分考点只是已有示例题的标签，不声称完整考纲覆盖。21 道原创示例题较浅，仅用于功能演示和基础解释校验，不代表考试难度。导入前应按照官方考纲代码建立完整映射，并由教师复核。

## 原型的明确边界

- TMUA 默认依次体验两卷；每卷当前仅 3 题，`floor(75 × 60 × 3 / 20) = 675` 秒，即 11:15。
- ESAT 各模块仅 3 题，`floor(40 × 60 × 3 / 27) = 266` 秒，即 04:26。Mathematics 1 必选，其他模块可选，以便体验不同课程组合，不替学生决定报考要求。
- 示例模考仍为缩短流程。新增 TMUA 2016–2023 官方原卷外链与完整 20 题 / 75 分钟答题卡；未复制原卷题干，不是 UAT-UK 官方考试软件，见 [原卷说明](official-papers.md)。
- 已提交的部分不可返回；下一部分重新计时，不携带上一部分剩余时间。超时自动提交，刷新不会重置绝对截止时间。
- 原型在部分之间提供“开始下一部分”过渡页；停留时间不计入答题用时。这是功能体验设计，不代表真实考试可任意暂停或休息。
- 正确率分母包括未答题；未答另计，答错不倒扣。用时累加各部分实际答题时间，超时部分上限为该部分限时。
- 只显示原始答对数、正确率、用时、知识点与模块表现，不换算、预测或伪造官方 1–9 分。

## 参考网站

参考 https://ieltscat.xdf.cn/ 的“按分类找题 → 单项练习 → 做题/模考记录 → 错题本”信息架构。已通过可信 HTTPS 读取入口 HTML 与页面当前引用的应用脚本，确认分科练习、练习记录、模考记录、错题入口及分类参数。参考站浏览器渲染受平台 CA 信任差异限制；向 Chromium 证书库添加 CA 的自动审批被拒绝，因此未修改信任库、未跳过证书验证，也不声称完成参考站视觉克隆。此网站使用独立设计，只借鉴筛选与训练组织逻辑。
