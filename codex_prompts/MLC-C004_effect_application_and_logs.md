# MLC-C004：效果应用与日志

目标：将 MajorChoiceResolution 的效果应用到 LifeSimulationState，并写入人生日志。

任务：
1. 实现 applyMajorChoiceResolution(state, resolution)。
2. 支持效果类型：
   modifyCoreStat、modifyAptitude、modifyLifeSkill、modifyKarma、modifyHeartDemon、addWound、addHeartKnot、addFlag、modifyHiddenFate、modifyCarriedItem、addMajorChoiceHook、addAge18Hook、addModeBiasTag。
3. 写入 MajorChoiceLogEntry。
4. visible=false 效果不应在普通 UI 日志中暴露真名。
5. 接入特殊命格 hook：
   - 废灵逆命失败得逆命点
   - 苟道至尊避战得潜修层数
   - 天妒英才学习收益提高但加天道注视 hook
   - 魔心暗种禁忌收益/心魔变化

测试：
- 效果正确累加。
- 隐藏效果不泄露。
- 特殊命格 hook 生效。
