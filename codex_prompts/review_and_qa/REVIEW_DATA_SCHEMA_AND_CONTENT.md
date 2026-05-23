# Review Prompt — Data Schema and Content Consistency

请审查 `data/**` 与 ContentRegistry。

## 必须检查
1. 所有 `id` 是否唯一。
2. 跨表引用是否存在。
3. stage、enemy、boss、artifact、treasure、spell、pill、reward、progression、tribulation、outgame 数据是否能加载。
4. 数据是否仍保持“双轨成长”：灵气经验只触发顿悟，修为只触发境界/雷劫。
5. JSON 是否能稳定生成 contentHash。

## 验收命令
```bash
npm run validate:data
npm test -- content-registry
```

## 输出
- 数据问题列表。
- 缺失引用。
- 建议补丁。
