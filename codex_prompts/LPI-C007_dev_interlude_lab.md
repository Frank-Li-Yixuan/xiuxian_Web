# LPI-C007：/dev/life-interlude-lab

目标：建立玩法插曲调试页，方便验证触发与回写。

任务：
1. 创建 /dev/life-interlude-lab。
2. 提供预设角色：
   - 雷灵根天妒
   - 药铺丹修
   - 道观问心
   - 祖玉阵法
   - 废灵逆命
3. 展示：
   - trigger context
   - candidates
   - weights
   - selected candidate
   - generated RunConfig
   - simulated result
   - writeback diff
4. 支持一键生成 36 次半年选择摘要。
5. 支持导出 JSON 调试结果。

验收：
- 开发页可打开。
- 各预设能生成不同插曲倾向。
- 可查看权重原因。
- npm run typecheck
- npm test
