# 🚨 终极修复指南

## 当前问题状态

您遇到的问题：
1. **UUID类型错误**：`invalid input syntax for type uuid: "13"`
2. **API请求失败**：400错误和ERR_NAME_NOT_RESOLVED
3. **提示词获取失败**：右上角显示错误信息

## 🔍 问题根本原因

经过深入分析，问题的根本原因是：

1. **数据库触发器函数错误**：
   - `tables_sql.txt` 第132行：`WHERE id = NEW.category_id` 应该是 `WHERE category_id = NEW.category_id`
   - 引用了不存在的 `tags` 和 `prompt_tags` 表

2. **表结构不完整**：
   - 缺少 `author_name` 和 `author_avatar` 字段
   - 缺少 `category_name` 字段

3. **视图定义错误**：
   - 引用了错误的字段名和不存在的表

## 🛠️ 终极修复方案

### 步骤1：使用调试工具诊断

1. 打开 `debug.html` 文件：
   ```
   http://localhost:8000/debug.html
   ```

2. 点击各个测试按钮，查看具体错误信息

### 步骤2：运行完整修复脚本

在 Supabase SQL 编辑器中运行以下完整脚本：

```sql
-- 终极修复脚本 - 一次性解决所有问题

-- 1. 删除所有有问题的对象
DROP TRIGGER IF EXISTS tr_prompt_derived_fields ON prompts;
DROP FUNCTION IF EXISTS update_prompt_derived_fields();
DROP VIEW IF EXISTS hot_prompts;
DROP VIEW IF EXISTS user_stats;

-- 删除引用不存在表的索引
DROP INDEX IF EXISTS idx_tags_name;
DROP INDEX IF EXISTS idx_tags_slug;
DROP INDEX IF EXISTS idx_tags_use_count;
DROP INDEX IF EXISTS idx_prompt_tags_prompt_id;
DROP INDEX IF EXISTS idx_prompt_tags_tag_id;

-- 2. 修复prompts表结构
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT '匿名用户';
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS author_avatar TEXT DEFAULT 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U';
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS category_name TEXT;

-- 移除可能的NOT NULL约束
ALTER TABLE prompts ALTER COLUMN category_name DROP NOT NULL;

-- 3. 重新创建正确的触发器函数
CREATE OR REPLACE FUNCTION update_prompt_derived_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- 修复字段名：categories.id -> categories.category_id
  IF TG_OP = 'INSERT' OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    NEW.category_name = (SELECT name FROM categories WHERE category_id = NEW.category_id);
  END IF;
  
  -- 使用数组tags字段而不是不存在的表
  NEW.search_vector = 
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.title, '')), 'A') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.category_name, '')), 'B') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.content, '')), 'C') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(ARRAY_TO_STRING(NEW.tags, ' '), '')), 'B');
    
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 重新创建触发器
CREATE TRIGGER tr_prompt_derived_fields
BEFORE INSERT OR UPDATE ON prompts
FOR EACH ROW EXECUTE FUNCTION update_prompt_derived_fields();

-- 5. 创建作者信息触发器
CREATE OR REPLACE FUNCTION update_prompt_author_info()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.user_id IS NOT NULL THEN
            SELECT username, avatar_url
            INTO NEW.author_name, NEW.author_avatar
            FROM users
            WHERE user_id = NEW.user_id;
        END IF;
        
        IF NEW.author_name IS NULL OR NEW.author_name = '' THEN
            NEW.author_name = '匿名用户';
        END IF;
        
        IF NEW.author_avatar IS NULL OR NEW.author_avatar = '' THEN
            NEW.author_avatar = 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_prompt_author ON prompts;
CREATE TRIGGER tr_update_prompt_author
    BEFORE INSERT ON prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_author_info();

-- 6. 更新现有数据
UPDATE prompts 
SET category_name = c.name 
FROM categories c 
WHERE prompts.category_id = c.category_id 
AND (prompts.category_name IS NULL OR prompts.category_name = '');

UPDATE prompts 
SET 
    author_name = COALESCE(u.username, '匿名用户'),
    author_avatar = COALESCE(u.avatar_url, 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U')
FROM users u 
WHERE prompts.user_id = u.user_id
AND (prompts.author_name IS NULL OR prompts.author_name = '');

UPDATE prompts 
SET 
    author_name = '匿名用户',
    author_avatar = 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U'
WHERE author_name IS NULL OR author_name = '';

-- 7. 更新搜索向量
UPDATE prompts 
SET search_vector = 
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(title, '')), 'A') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(category_name, '')), 'B') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(content, '')), 'C') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(ARRAY_TO_STRING(tags, ' '), '')), 'B')
WHERE search_vector IS NULL;

-- 8. 重新创建视图（不引用不存在的表）
CREATE OR REPLACE VIEW hot_prompts AS
SELECT 
    p.*,
    p.category_name,
    p.author_name,
    COALESCE(p.use_count * 0.4 + p.view_count * 0.3 + p.like_count * 0.2 + p.favorite_count * 0.1, 0) as hot_score
FROM prompts p
WHERE p.status = 'published' AND p.is_public = TRUE
ORDER BY hot_score DESC;

CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.user_id,
    u.username,
    COUNT(DISTINCT p.prompt_id) as prompts_count,
    COALESCE(SUM(p.view_count), 0) as total_views,
    COALESCE(SUM(p.use_count), 0) as total_uses,
    COALESCE(SUM(p.like_count), 0) as total_likes
FROM users u
LEFT JOIN prompts p ON u.user_id = p.user_id AND p.status = 'published'
GROUP BY u.user_id, u.username;

-- 9. 创建必要的索引
CREATE INDEX IF NOT EXISTS idx_prompts_search ON prompts USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_prompts_tags ON prompts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_prompts_author_name ON prompts(author_name);

-- 10. 创建计数器函数
CREATE OR REPLACE FUNCTION increment_use_count(prompt_id BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE prompts 
    SET use_count = use_count + 1 
    WHERE prompts.prompt_id = increment_use_count.prompt_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_view_count(prompt_id BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE prompts 
    SET view_count = view_count + 1 
    WHERE prompts.prompt_id = increment_view_count.prompt_id;
END;
$$ LANGUAGE plpgsql;

-- 11. 验证修复
SELECT 
    'prompts' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN author_name IS NOT NULL AND author_name != '' THEN 1 END) as with_author,
    COUNT(CASE WHEN category_name IS NOT NULL AND category_name != '' THEN 1 END) as with_category
FROM prompts;

-- 测试查询
SELECT prompt_id, title, author_name, category_name 
FROM prompts 
WHERE status = 'published' 
LIMIT 3;
```

### 步骤3：验证修复

1. **在 debug.html 中验证**：
   - 刷新 debug.html 页面
   - 点击"运行诊断"
   - 确认所有测试通过

2. **在主应用中验证**：
   - 刷新主应用页面
   - 检查右上角是否还有UUID错误
   - 确认提示词列表正常显示

### 步骤4：如果问题仍然存在

1. **检查浏览器控制台**：
   - 按F12打开开发者工具
   - 查看Console标签的错误信息
   - 查看Network标签的请求失败信息

2. **检查Supabase日志**：
   - 登录Supabase控制台
   - 查看Logs部分的错误信息

3. **重新初始化数据库**（最后手段）：
   - 删除所有表
   - 重新运行 `tables_sql.txt`
   - 运行上面的修复脚本
   - 运行 `demo_data.sql`

## 🎯 成功标志

修复成功后，您应该看到：

1. ✅ 右上角不再显示UUID错误
2. ✅ 提示词列表正常加载和显示
3. ✅ 浏览器控制台无错误信息
4. ✅ 所有功能（搜索、筛选、详情）正常工作
5. ✅ debug.html中所有测试都通过

## 📞 最后的支持

如果按照这个终极修复指南操作后问题仍然存在，请：

1. 运行 debug.html 并截图所有测试结果
2. 提供浏览器控制台的完整错误信息
3. 提供Supabase项目日志的相关错误信息

这样我们可以进行更深入的诊断和修复。

---

**这个终极修复方案应该能解决所有问题！** 🚀
