# HFO-C008：测试与调试输出

目标：补齐本系统的确定性、分布、隐藏显示和转化测试。

## 任务

1. 10000 次分布测试。
2. 同 seed 生成一致测试。
3. 锁定测试。
4. 创建页不显示 trueName 测试。
5. 18 岁转化测试。
6. 可选：添加 /dev/origin-fate-debug，展示候选权重和输出。

## 验收

- npm run typecheck
- npm test
- 分布在 tuning 范围内。
- 隐藏真实名不会泄露到创建页 UI state。
