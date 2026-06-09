# LFP-C001：Life Simulation First Playable State Machine and Registry

目标：建立人生模拟首版可玩流程的数据 Registry、State Machine 与校验脚本。

硬约束：
- 不修改 `src/sim/**`。
- 不接真实 DeepSeek API。
- 不进入域外战场正式战斗。
- 不恢复 generated PNG 控件方案。

任务：
1. 接入 `data/life_playable/*.json`。
2. 新增或合并 `LifeSimulationPlayableState` 类型。
3. 建立 LifePlayableRegistry。
4. 建立 UI state machine：initializing / playing_months / major_choice_pending / interlude_prompt / stage_summary / adult_node_pending 等。
5. 新增 `scripts/validate_life_playable_data.mjs` 或接入现有 validate:data。
6. 增加测试：数据可加载、状态机转移合法、age 216 能进入 adult_node_pending。

验收：
- npm run typecheck
- npm test
- npm run build
- npm run validate:data
- 如新增 script，能运行并通过

最终回复：修改文件、测试结果、下一步建议。
