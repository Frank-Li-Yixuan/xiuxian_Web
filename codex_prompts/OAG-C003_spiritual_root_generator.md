# OAG-C003：灵根生成器

## 目标

实现灵根分类、元素向量、纯度/稳定/冲突/广度、标签输出。

## 前置

OAG-C001、OAG-C002 已完成。

## 任务

1. 根据命盘类型修正灵根分类权重。
2. 生成灵根类型：
   - 单灵根
   - 双灵根
   - 三灵根
   - 杂灵根
   - 天灵根
   - 异灵根
   - 隐灵根
   - 闭塞灵根
   - 混沌灵根
3. 生成元素向量：
   - metal / wood / water / fire / earth / thunder / yin
4. 实现五行相生相克判断。
5. 实现特殊关系：
   - 雷火
   - 雷水
   - 阴水
   - 阴火
6. 计算：
   - purity
   - stability
   - conflict
   - breadth
7. 输出标签：
   - destinyBiasTags
   - lifeEventBiasTags
   - modeBiasTags
   - hiddenFateBiasTags
8. 支持锁定：
   - spiritualRootCategory
   - spiritualRootElements
   - spiritualRootFull

## 测试

1. 天灵根出现率在合理范围。
2. 灵根异象命盘提高特殊灵根概率。
3. 废柴逆骨提高闭塞/隐灵根概率。
4. 木火双灵根输出相生标签。
5. 水火双灵根输出相克/冲突标签。
6. 雷灵根输出雷法、雷雨、雷劫相关标签。
7. 锁定灵根后重 Roll 灵根不变。

## 禁止

- 不要实现完整人生模拟。
- 不要实现完整 UI。
- 不要改战斗 sim。
