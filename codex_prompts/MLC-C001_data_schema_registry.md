# MLC-C001：数据 Schema 与 Registry

目标：接入半年重大选择系统的数据表、类型和校验。

必须阅读：
- docs/major_life_choice_system_v0.1.md
- docs/event_taxonomy_schema_v0.1.md
- data/life_choices/*.json
- src/types/major-life-choice-types.v0.1.ts

任务：
1. 将 data/life_choices/ 下的 JSON 接入项目 data registry。
2. 创建 MajorLifeChoiceRegistry。
3. 定义或合并 TypeScript 类型。
4. 加数据校验：
   - 事件 ID 唯一
   - 每事件至少 3 个选项
   - riskTier 合法
   - 每选项有 success outcome
   - modifyHiddenFate 必须 visible=false
5. 添加 npm 脚本或测试集成 validate_major_choices。

禁止：
- 不要实现 UI。
- 不要修改 src/sim/**。
- 不要使用 Math.random。

验收：
- npm run typecheck
- npm test
- node scripts/validate_major_choices.mjs
