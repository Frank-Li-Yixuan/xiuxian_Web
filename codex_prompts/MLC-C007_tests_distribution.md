> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: legacy MLC tests cover old half-year choice distribution instead of MC2/LPI/LSTG acceptance.
> Replacement route: MIG-C005/SIM-C007, then SIM-C011.

# MLC-C007：测试与分布验收

目标：补齐半年重大选择系统测试。

测试：
1. 数据校验。
2. 同 seed 确定性。
3. 10000 次模拟分类分布。
4. 命格特殊规则：
   - 苟道至尊
   - 废灵逆命
   - 天妒英才
   - 丹道奇才
   - 魔心暗种
5. 隐藏信息泄露测试。
6. 存档恢复测试。
7. 18 岁 hook 保留测试。

验收命令：
- npm run typecheck
- npm test
- node scripts/validate_major_choices.mjs
