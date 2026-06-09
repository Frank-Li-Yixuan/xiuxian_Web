# 废弃 Prompt 与保护策略 v0.1

## 1. 已废弃

```text
CC-C001 ~ CC-C006
```

原因：

```text
旧角色创建方案
旧 UI 控件思路
可能恢复 generated PNG 控件
可能恢复左中右立绘布局
```

## 2. 可保留但需覆盖前缀

```text
OAG-Cxxx
DT-Cxxx
HFO-Cxxx
LM-Cxxx
MLC-Cxxx
A18-Cxxx
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
CCUI2-C001 ~ CCUI2-C006
WORLD-C001 ~ WORLD-C003
NPF-C001 ~ NPF-C006
DEM-C001 ~ DEM-C007
LST-C001 ~ LST-C007
LPI-C001 ~ LPI-C008
LSTG-C001 ~ LSTG-C008
ME2-C001 ~ ME2-C008
MC2-C001 ~ MC2-C008
HFO2-C001 ~ HFO2-C008
LLM-C001 ~ LLM-C008
LFP-C001 ~ LFP-C009
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
