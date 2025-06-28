# 匿名用户点赞外键约束错误修复指南

## 🚨 错误信息
```
点赞操作失败: insert or update on table "user_likes" violates foreign key constraint "user_likes_user_id_fkey"
```

## 🔍 问题原因
匿名用户的UUID不存在于`auth.users`表中，但`user_likes`表的`user_id`字段有外键约束引用`auth.users(id)`，导致插入失败。

## ⚡ 快速修复步骤

### 步骤1：运行SQL修复脚本
在Supabase SQL编辑器中运行以下SQL：

```sql
-- 删除外键约束，允许匿名用户ID
ALTER TABLE user_likes DROP CONSTRAINT IF EXISTS user_likes_user_id_fkey;
ALTER TABLE user_favorites DROP CONSTRAINT IF EXISTS user_favorites_user_id_fkey;

-- 添加索引提高性能
CREATE INDEX IF NOT EXISTS idx_user_likes_user_id ON user_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_prompt_id ON user_likes(prompt_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_user_prompt ON user_likes(user_id, prompt_id);

-- 为字段添加说明
COMMENT ON COLUMN user_likes.user_id IS '用户ID，可以是auth.users中的真实用户ID，也可以是匿名用户的UUID';
```

### 步骤2：验证修复
运行以下查询验证约束已删除：
```sql
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'user_likes'::regclass;
```

### 步骤3：测试功能
1. 打开测试页面 `test_anonymous_user_like.html`
2. 确保未登录状态
3. 点击点赞按钮测试功能

## 📋 完整修复脚本

如果您希望运行完整的修复脚本，请在Supabase SQL编辑器中运行 `fix_anonymous_user_constraints.sql` 文件。

## 🔧 技术说明

### 修复前的数据结构
```sql
-- 有外键约束，限制只能使用auth.users中的ID
user_id UUID REFERENCES auth.users(id)
```

### 修复后的数据结构
```sql
-- 无外键约束，允许任何有效的UUID
user_id UUID
```

### 数据完整性保证
- 应用层验证UUID格式的有效性
- 登录用户仍然使用auth.users中的真实ID
- 匿名用户使用localStorage中生成的UUID
- 通过索引保证查询性能

## 🎯 预期结果

修复后，匿名用户应该能够：
1. ✅ 正常点赞和取消点赞
2. ✅ 点赞记录存储在user_likes表中
3. ✅ prompts表的like_count字段正确更新
4. ✅ 页面刷新后点赞状态保持

## 🔍 故障排除

### 如果仍然出错
1. **检查SQL执行结果**：确认约束删除成功
2. **清除浏览器缓存**：刷新页面重新测试
3. **检查控制台日志**：查看详细的错误信息
4. **验证匿名ID**：确认localStorage中有有效的UUID

### 常见问题
- **Q**: 删除外键约束是否安全？
- **A**: 是的，我们通过应用层逻辑保证数据完整性

- **Q**: 会影响现有的登录用户吗？
- **A**: 不会，登录用户继续使用auth.users中的真实ID

- **Q**: 如何区分匿名用户和真实用户？
- **A**: 可以通过检查user_id是否存在于auth.users表中来区分

## 📊 数据示例

### 修复后的user_likes表数据
```sql
-- 真实用户的点赞记录
user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' (存在于auth.users)
prompt_id: 123

-- 匿名用户的点赞记录  
user_id: '550e8400-e29b-41d4-a716-446655440000' (不存在于auth.users)
prompt_id: 456
```

## 🚀 下一步

修复完成后，您可以：
1. 测试完整的匿名用户点赞流程
2. 验证数据库中的记录正确性
3. 检查prompts表的like_count更新
4. 测试用户登录后的数据一致性

---

**重要提示**：请确保在生产环境中运行此修复前，先在测试环境中验证所有功能正常工作。
