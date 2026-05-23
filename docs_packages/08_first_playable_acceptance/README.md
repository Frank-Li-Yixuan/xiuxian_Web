# 双人雷霆战机修仙版：《v0.1 First Playable 总集成验收文档》

版本：v0.1  
用途：把前序设计文档收束为一个可执行的 First Playable 版本门槛、Codex 实施顺序、集成测试计划和验收清单。

## 本包包含

```text
docs/
  first_playable_integration_acceptance_v0.1.md    # 主文档：范围、门槛、验收标准
  feature_scope_matrix_v0.1.md                     # v0.1 必做 / 可选 / 延后范围矩阵
  codex_execution_order_v0.1.md                    # Codex 开工顺序与任务串联
  end_to_end_playtest_script_v0.1.md               # 从默认存档到第二局的完整试玩脚本
  integration_test_plan_v0.1.md                    # 集成测试、确定性测试、UI/VFX/局外测试
  risk_register_v0.1.md                            # 风险清单和降级策略
  release_candidate_checklist_v0.1.md              # RC 打包前最终检查
  document_index_and_traceability_v0.1.md          # 上游文档与本验收门槛追踪关系

data/acceptance/
  first_playable_gate.v0.1.json                    # 总体 gate 定义
  feature_flags.v0.1.json                          # v0.1 功能开关
  build_milestones.v0.1.json                       # G0-G8 里程碑
  acceptance_checklist.v0.1.json                   # 可机器读取的验收项
  integration_scenarios.v0.1.json                  # 端到端测试场景
  test_matrix.v0.1.json                            # 测试矩阵
  telemetry_targets.v0.1.json                      # 平衡与性能遥测目标

src/types/
  acceptance-types.v0.1.ts                         # TypeScript 类型草案

diagrams/
  first_playable_gate_flow.mmd                     # Mermaid 流程图

templates/
  codex_acceptance_prompt.md                       # 给 Codex 的验收执行 Prompt 模板
  playtest_report_template.md                      # 试玩报告模板
  bug_report_template.md                           # Bug 报告模板

scripts/
  validate_first_playable_bundle.mjs               # JSON 与包结构校验脚本
```

## 核心结论

v0.1 First Playable 的目标不是“做完整游戏”，而是证明以下闭环成立：

```text
默认洞府存档
  → 配置下局 Loadout
  → 进入第一大阶段：青云山·妖潮初临
  → 本地双人 / 单人可玩
  → 自动普攻 + 主动法术 + 丹药炼化
  → 灵气经验触发顿悟三选一
  → 个人修为独立增长，Debug 可触发局内雷劫
  → Boss 青云劫灵三阶段战斗
  → 精血渡魂救援
  → 结算资源带回洞府
  → 炼丹 / 炼器 / 修功 / 研法
  → 生成第二局 RunConfig，开局明显变强
```

只有这条闭环全部可玩，才允许继续扩第二大阶段、更多法宝、完整在线服务或完整局外模拟经营。
