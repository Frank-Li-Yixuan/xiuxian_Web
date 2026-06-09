# MIG-C002：Data Registry 统一

目标：将 SIM-REDESIGN v0.2 相关数据纳入统一 Registry。

需要接入的数据目录：

- data/world/
- data/fate_matrix/
- data/destiny_v2/
- data/life_storylines/
- data/life_interludes/
- data/life_stage/
- data/life_sim_v02/
- data/life_choices_v02/
- data/origin_fate_v02/
- data/llm_narrative/
- data/life_playable/

任务：

1. 创建或扩展 SimRedesignContentRegistry。
2. 每类数据都有 loader、schema guard、validate function。
3. 增加 npm script：validate:sim-redesign-data，如适用。
4. 不替换现有 data registry，只做并行接入和桥接。
5. 增加测试：缺文件失败、非法 id 失败、重复 id 失败。

禁止：

- 不改 UI。
- 不改 src/sim/**。
- 不改 gameplay。

运行：

npm run typecheck
npm test
npm run build
npm run validate:data

最终回复：

- 新增 Registry 文件
- 接入的数据表
- 测试结果
