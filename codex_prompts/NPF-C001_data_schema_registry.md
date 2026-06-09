执行 NPF-C001：九宫命盘数据 Schema 与 Registry。

目标：
接入九宫属性、三才阴阳五行、天命成立条件、属性事件偏置等数据。

输入数据：
data/fate_matrix/nine_attributes.v0.1.json
data/fate_matrix/three_powers_yinyang_wuxing.v0.1.json
data/fate_matrix/destiny_eligibility_rules.v0.1.json
data/fate_matrix/attribute_correlation_rules.v0.1.json
data/fate_matrix/attribute_event_bias_rules.v0.1.json
data/fate_matrix/generation_algorithm_upgrade_rules.v0.1.json

任务：
1. 创建 NinePalaceRegistry。
2. 创建类型定义或接入 src/types/nine-palace-fate-types.v0.1.ts。
3. 加载并校验数据。
4. 增加脚本 validate:nine-palace-data。
5. 不修改 src/sim/**。
6. 不改 UI。
7. 不改天命生成器逻辑。

验收：
- npm run typecheck
- npm test
- npm run build
- npm run validate:nine-palace-data
