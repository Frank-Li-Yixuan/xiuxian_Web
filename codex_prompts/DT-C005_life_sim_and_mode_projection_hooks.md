# DT-C005：人生模拟与多模式投射 Hook

目标：提供天命影响人生模拟和战斗模式的统一读取接口。

任务：
1. 实现 `getLifeSimDestinyModifiers(draftOrProfile)`。
2. 实现 `getOuterBattlefieldDestinyModifiers(profile)`。
3. 实现 `getModeDestinyModifiers(profile, modeId)`。
4. 不实现完整模式，只提供数据层接口。
5. 为天妒英才、苟道至尊、废灵逆命、丹道奇才等写测试。

验收：
- 天妒英才返回学习/悟道收益、寿元和雷劫修正。
- 苟道至尊返回潜修和战斗收益修正。
- 丹道奇才返回药理、炼丹、丹毒修正。
- 接口不依赖 UI。
