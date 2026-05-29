# A18-C001：数据 Schema 与 Registry

目标：接入《18 岁系统觉醒与域外战场开局转化 v0.1》的数据、类型和校验脚本。

范围：

- data/age18/*.json
- src/types/age18-awakening-types.ts
- src/age18/Age18AwakeningRegistry.ts
- scripts/validate-age18-data.mjs

任务：

1. 将设计包中的 `data/age18/*.json` 复制到项目 `data/age18/`。
2. 将类型草案整合到项目类型目录，命名可按项目规范调整。
3. 实现 `Age18AwakeningRegistry`：
   - loadAwakeningRules()
   - loadStatConversionTables()
   - loadHiddenFateRevealTables()
   - loadCarriedItemConversion()
   - loadDestinyProjectionRules()
   - loadOuterBattlefieldIntroRunDefinition()
   - loadSystemHomeUnlockDefinition()
4. 实现数据校验脚本：
   - JSON 可解析
   - id 唯一
   - 引用的 modifier、hook、item、hiddenFate id 格式合法
   - scenario phase 时间递增
   - home module id 唯一
5. 不实现实际结算逻辑。
6. 不改 src/sim/**。

验收：

- npm run typecheck
- npm test
- node scripts/validate-age18-data.mjs
- 数据缺字段时校验失败

最终回复：

- 文件改动
- 数据路径
- 测试结果
- 未实现的后续步骤
