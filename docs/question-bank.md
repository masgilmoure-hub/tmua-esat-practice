# 题库结构与后续导入

核心接口位于 `src/types.ts`，当前原创题位于 `src/data/questions.ts`。可导入数据的示例位于 `examples/question-bank.json`。本版未提供上传/PDF 自动识别或官方题目导入界面。

```sh
npm run validate:bank -- examples/question-bank.json
```

导入容器为 `{ "schemaVersion": 1, "questions": [...] }`。校验器检查必填字段、唯一 ID、有效选项/答案下标、双语步骤对应和可访问的来源 URL 格式。不会代替教师进行数学/科学内容审校，也不会自行访问或确认材料的授权。

| 字段 | 约定 |
| --- | --- |
| `id` | 永久唯一的稳定 ID，仅字母、数字、下划线、连字符；不要因排序变化重编号 |
| `exam` | `TMUA` / `ESAT` |
| `moduleId` | `p1`, `p2`, `m1`, `m2`, `biology`, `chemistry`, `physics` |
| `topic` / `subtopic` | 稳定 ID 与 `zh`、`en` 标签；建议另建官方考纲代码映射 |
| `prompt` / `options` | 始终英文；纯文本，支持 Unicode 数学符号，当前不执行 HTML |
| `correctIndex` | 从 0 开始；A = 0，B = 1 |
| `explanation` | `zh`、`en` 分别含步骤数组与易错点，步骤数对应 |
| `source.kind` | `original-demo` / `official-public`，不得将示例改标官方 |
| `source.title` | 原始材料名称，中英标签 |
| `source.url` | 官方原始材料 URL；原创示例为 `null`，官方公开材料必须有 HTTP(S) 链接 |
| `source.originalNumber` | 原始试卷上的题号，原样保留；示例使用 `DEMO-` 前缀 |
| `source.year` | 原始材料年份；示例为 `null` |
| `source.rightsNote` | 材料来源、授权/使用说明；有必要时加入版本信息 |

后续流程：从官方公开入口获取材料，确认使用条件；教师复核转录、答案、双语解析与考纲标签；保留原始来源和题号；运行校验器；通过受控数据入口合并到 `QUESTIONS`。不要为了凑足模考题数重复题目或修改 `originalNumber`。

现阶段只存在原创示例，所以“官方公开材料”筛选显示空状态，并明确说明尚未导入；列表与模考配置的示例标签不能直接用于包含官方题目的正式版本，需要在导入任务中同步改成按来源渲染。

已完成结果保存当时的完整题目快照，避免后续题库更新改变历史题干、正确答案或解析。错题本当前使用当前题库的稳定 ID 匹配；删除/退役题目时应设计历史题目访问及迁移规则。

## 后续账号与教师端

将本地存储层替换为服务端仓库接口：`Student`、`Class`、`Assignment`、`Attempt`、`AttemptAnswer`、`QuestionVersion`。成绩由服务端计算；学生/教师按班级授权访问。教师布置作业需保存题目版本、限时、截止时间、提交策略，避免修改题库导致旧作业成绩变化。客户端原型不是考试安全或防作弊边界，正式版本的答案应在受控交卷后由服务端提供。
