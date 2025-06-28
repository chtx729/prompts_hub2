# 点赞计数一致性问题修复

## 🚨 问题描述

**现象**：一次点赞操作在user_likes表中只有一条记录，但prompts表的like_count字段增加了2。

**根本原因**：
1. 前端代码中同时使用了RPC函数和备用方法更新计数
2. 当RPC函数执行成功但返回错误时，备用方法也会执行
3. 导致计数被重复更新

## 🔧 解决方案

### 方案1：使用数据库触发器（推荐）

#### 优势
- **自动维护**：数据库层面自动保证一致性
- **原子性**：触发器与DML操作在同一事务中
- **可靠性**：不依赖应用层逻辑
- **性能好**：减少网络往返

#### 实现步骤

1. **运行触发器创建脚本**
```sql
-- 创建触发器函数
CREATE OR REPLACE FUNCTION update_prompt_like_count_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE prompts 
        SET like_count = COALESCE(like_count, 0) + 1
        WHERE prompt_id = NEW.prompt_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE prompts 
        SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1)
        WHERE prompt_id = OLD.prompt_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER user_likes_count_trigger
    AFTER INSERT OR DELETE ON user_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_like_count_trigger();
```

2. **修复现有不一致数据**
```sql
-- 修复所有不一致的计数
UPDATE prompts 
SET like_count = COALESCE(actual_likes.count, 0)
FROM (
    SELECT prompt_id, COUNT(*) as count
    FROM user_likes 
    GROUP BY prompt_id
) actual_likes
WHERE prompts.prompt_id = actual_likes.prompt_id
  AND prompts.like_count != actual_likes.count;
```

3. **简化前端代码**
```javascript
// 移除手动计数更新
// await this.updatePromptLikeCount(promptId, 1);
```

### 方案2：改进前端逻辑（备选）

如果不想使用触发器，可以改进前端的错误处理逻辑：

```javascript
// 更严格的错误判断
if (error) {
    // 只有在特定错误时才使用备用方法
    if (error.code === '42883' || error.message.includes('function')) {
        return this.updatePromptLikeCountFallback(promptId, increment);
    } else {
        // 其他错误可能意味着函数已执行，不要重复执行
        return { success: false, error: error.message };
    }
}
```

## 📋 修复文件清单

### SQL脚本
1. **`fix_like_count_consistency.sql`** - 完整的一致性修复脚本
   - 检查不一致数据
   - 修复计数错误
   - 创建触发器
   - 验证修复结果

2. **`update_prompt_like_count_function.sql`** - 更新的RPC函数
   - 改进的错误处理
   - 备用函数定义

### 前端代码修改
1. **`js/api.js`** - 改进的点赞逻辑
   - 更严格的错误判断
   - 详细的调试日志
   - 简化的计数更新

### 测试工具
1. **`test_like_count_accuracy.html`** - 计数准确性测试页面
   - 实时监控计数状态
   - 一致性验证
   - 修复工具

## 🎯 修复步骤

### 步骤1：运行数据库修复脚本
```sql
-- 在Supabase SQL编辑器中运行
\i fix_like_count_consistency.sql
```

### 步骤2：验证修复结果
1. 打开 `test_like_count_accuracy.html`
2. 选择一个测试提示词
3. 执行点赞操作测试
4. 验证计数一致性

### 步骤3：清理现有不一致数据
```sql
-- 检查不一致的数据
SELECT 
    p.prompt_id,
    p.like_count as prompts_count,
    COALESCE(ul.actual_likes, 0) as actual_likes
FROM prompts p
LEFT JOIN (
    SELECT prompt_id, COUNT(*) as actual_likes
    FROM user_likes GROUP BY prompt_id
) ul ON p.prompt_id = ul.prompt_id
WHERE p.like_count != COALESCE(ul.actual_likes, 0);
```

## 🔍 验证方法

### 自动验证
使用测试页面的功能：
- **单次点赞测试**：验证单次操作的准确性
- **切换测试**：验证多次切换的一致性
- **数据比较**：比较所有提示词的计数

### 手动验证
```sql
-- 检查特定提示词的一致性
SELECT 
    (SELECT COUNT(*) FROM user_likes WHERE prompt_id = 1) as user_likes_count,
    (SELECT like_count FROM prompts WHERE prompt_id = 1) as prompts_like_count;
```

## 📊 预期结果

修复后应该实现：

### ✅ 数据一致性
- user_likes表记录数 = prompts表like_count字段
- 所有提示词的计数都准确

### ✅ 操作准确性
- 一次点赞操作只增加1个计数
- 取消点赞只减少1个计数
- 不会出现重复计数

### ✅ 系统稳定性
- 触发器自动维护一致性
- 减少应用层的复杂性
- 提高数据可靠性

## 🚀 后续优化

### 监控机制
- 定期检查数据一致性
- 监控异常的计数变化
- 记录操作日志

### 性能优化
- 使用索引优化查询
- 批量操作的优化
- 缓存策略改进

### 扩展功能
- 支持其他类型的计数（收藏、使用等）
- 历史数据分析
- 用户行为统计

---

**重要提示**：建议优先使用触发器方案，它提供了最可靠的数据一致性保证。如果环境不支持触发器，再考虑使用改进的前端逻辑方案。
