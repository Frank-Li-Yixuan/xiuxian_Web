# LST-C001：人生主线与事件线数据 Schema / Registry

目标：接入 `data/life_storylines/**` 数据，建立 StorylineRegistry 和数据校验。

硬约束：
- 不修改 `src/sim/**`
- 不实现月度事件和半年选择
- 不实现 UI
- 不使用 Math.random
- 只做数据接入、类型和校验

任务：
1. 将 `data/life_storylines/storyline_definitions.v0.1.json`、`event_threads.v0.1.json`、`storyline_scoring_rules.v0.1.json` 接入工程。
2. 创建或迁移 TypeScript 类型。
3. 实现 `LifeStorylineRegistry`：
   - getStoryline(id)
   - getThread(id)
   - listStorylines()
   - listThreadsByStoryline(storylineId)
4. 接入校验脚本 `scripts/validate_life_storylines_data.mjs`，可作为 npm script。
5. 测试：
   - 数据可加载
   - 每条主线引用的 thread 存在
   - 每条 thread 引用的 storyline 存在
   - 错误数据会失败

运行：
- npm run typecheck
- npm test
- npm run build
- node scripts/validate_life_storylines_data.mjs

最终回复：
- 修改文件列表
- 新增 Registry 路径
- 测试结果
