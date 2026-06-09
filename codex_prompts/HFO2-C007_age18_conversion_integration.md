执行 HFO2-C007：HFO v0.2 与 18 岁系统觉醒转化集成。

目标：
把隐藏命叙事链与随身物生命周期结果交给 Age18AwakeningResolution。

任务：
1. 构建 Age18OriginFateInputV02。
2. 根据 revealBand、progress、item affinity、key choices、interludes 生成：
   - revealedHiddenFates
   - sealedHiddenFates
   - convertedCarriedItems
   - outerBattlefieldModifiers
   - dongfuHooks
   - longTermTags
3. 转化必须能追溯到人生事件。
4. 如果 18 岁出现法宝/丹药/线索，之前必须有相关随身物或事件记录。
5. 不修改战斗逻辑。

测试：
- 药铺铜炉高 affinity 转化为丹药/丹炉 hook。
- 残破木剑高 affinity 转化为飞剑/剑魄 hook。
- 低 progress hidden fate 不直接 revealed。
- sealed 状态保留线索。
