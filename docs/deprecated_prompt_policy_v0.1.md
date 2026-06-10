# 废弃 Prompt 与保护策略 v0.1

## 1. 已废弃

```text
CC-C001 ~ CC-C006
LM-C001 ~ LM-C008
MLC-C001 ~ MLC-C007
A18-C001 ~ A18-C008
HFO-C007 ~ HFO-C008
```

原因：

```text
CC-C：旧角色创建方案，可能恢复 generated PNG 控件或左中右立绘布局。
LM/MLC：旧 v0.1 人生模拟/月度/半年选择路线，不读取 LST/LPI/LSTG/ME2/MC2。
A18：硬绑定 18 岁觉醒与域外战场路径，缺少成年节点 path scoring。
HFO-C007/C008：旧 18 岁隐藏身世/随身物转化与测试路径，应由 HFO2 + AdultNode bridge 接管。
```

## 2. 可保留但需覆盖前缀

```text
OAG-Cxxx
DT-Cxxx
HFO-C001 ~ HFO-C006
BAS-Cxxx
STG-Rxxx
```

执行时必须加全局覆盖前缀：

```text
不使用 generated PNG 控件；UI 采用 DOM / React + 本地 ui-system；不恢复旧角色创建布局；除非任务明确要求，不修改 src/sim/**。
```

## 3. 新推荐 Prompt 系列

```text
SIM-C001 ~ SIM-C011
WORLD-C001 ~ WORLD-C003
NPF-C001 ~ NPF-C006
DEM-C001 ~ DEM-C007
HFO2-C001 ~ HFO2-C008
LST-C001 ~ LST-C007
LPI-C001 ~ LPI-C008
LSTG-C001 ~ LSTG-C008
ME2-C001 ~ ME2-C008
MC2-C001 ~ MC2-C008
LLM-C001 ~ LLM-C008
LFP-C001 ~ LFP-C009
```

仍缺失的占位 prompt：

```text
POST-BAS-001
CCUI2-C001 ~ CCUI2-C006
STG-R001 ~ STG-R002
E2E-C001
RC-C001
```

## 4. 每轮 Codex 固定尾部要求

```text
最终回复必须包含：
- 修改文件
- 测试命令与结果
- 是否修改 src/sim/**
- 是否泄露 hidden trueName
- 是否使用 generated PNG 控件
- 手动验证路径
- 已知问题
```
