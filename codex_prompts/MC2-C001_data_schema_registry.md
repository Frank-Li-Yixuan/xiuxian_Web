# MC2-C001：数据 Schema 与 Registry

目标：接入半年重大选择 v0.2 的数据结构和校验。

任务：
1. 接入 `data/life_choices_v02/*.json`。
2. 新增/更新 MajorChoiceV02Registry。
3. 加载 choice_archetypes、major_choice_events、choice_generation_rules、outcome_effect_tables、hidden_branch_rules。
4. 校验：
   - event id 唯一
   - option id 在 event 内唯一
   - option archetypeId 存在
   - phaseIds 合法
   - ageMonthRange 合法
   - hiddenBranch 不可直接渲染 internalTrueName
5. 不改 UI。
6. 不改 src/sim/**。

运行：
npm run typecheck
npm test
npm run build
