# SIM-C007：半年重大选择 v0.2 升级

## 目标

用 MC2 覆盖旧半年选择系统。

## 任务

1. 实现 SixMonthWindowSummary。
2. 根据最近 6 个月事件生成选择。
3. 支持六类选项：

```text
稳 / 正 / 险 / 凶 / 禁 / 命
```

4. 实现风险判定：

```text
greatFailure / failure / partialSuccess / success / greatSuccess / extremeSuccess / hiddenSuccess
```

5. 实现 HiddenBranchEngine。
6. 支持玩法插曲候选。
7. 支持阶段转化 token。
8. 失败也能被废灵逆命等天命转化为收益。

## 验收

- 无铺垫不会凭空出现后山/雷雨/禁忌选择。
- hiddenBranch 满足条件才显示“命”选项。
- 0–3 岁不出现玩法插曲。
- 失败可写入伤病/心结。
- 不泄露隐藏真名。

## 命令

```text
npm run typecheck
npm test
npm run build
```
