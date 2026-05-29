# HFO-C005：创建角色页集成

目标：将身世、隐藏预兆、随身物接入角色创建页。

## 任务

1. 角色创建 Draft 中加入 originFate。
2. 重 Roll 时重新生成 originFate，除非相应槽位被锁定。
3. 页面显示：
   - 表面身世名称和描述
   - 隐藏预兆 1–2 条
   - 异动等级
   - 风险提示
   - 随身物列表
   - 模糊转化提示
4. 禁止显示隐藏命 trueName 和 exactProgress。
5. 确认此生时将 originFate 写入 Profile 草稿。

## 验收

- 创建页能看到身世和随身物。
- 隐藏命不被剧透。
- 锁定身世/随身物后重 Roll 保留。
- UI 没有显示 hiddenFate.id / trueName。
