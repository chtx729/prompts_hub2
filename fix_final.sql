-- 最终修复脚本：解决所有UUID和数据库问题
-- 在Supabase SQL编辑器中运行此脚本

-- 1. 首先删除有问题的索引和触发器（如果存在）
DROP TRIGGER IF EXISTS tr_prompt_derived_fields ON prompts;
DROP FUNCTION IF EXISTS update_prompt_derived_fields();

-- 2. 删除引用不存在表的索引
DROP INDEX IF EXISTS idx_tags_name;
DROP INDEX IF EXISTS idx_tags_slug;
DROP INDEX IF EXISTS idx_tags_use_count;
DROP INDEX IF EXISTS idx_prompt_tags_prompt_id;
DROP INDEX IF EXISTS idx_prompt_tags_tag_id;

-- 3. 修复prompts表的author信息字段
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT '匿名用户';
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS author_avatar TEXT DEFAULT 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U';

-- 4. 确保category_name字段存在且不为NOT NULL（避免错误）
DO $$ 
BEGIN
    -- 先添加字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompts' AND column_name = 'category_name') THEN
        ALTER TABLE prompts ADD COLUMN category_name TEXT;
    END IF;
    
    -- 移除NOT NULL约束（如果存在）
    ALTER TABLE prompts ALTER COLUMN category_name DROP NOT NULL;
END $$;

-- 5. 修复update_prompt_derived_fields函数中的错误
CREATE OR REPLACE FUNCTION update_prompt_derived_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新分类名称（修复字段名错误：id -> category_id）
  IF TG_OP = 'INSERT' OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    NEW.category_name = (SELECT name FROM categories WHERE category_id = NEW.category_id);
  END IF;
  
  -- 更新全文搜索向量（带权重），使用数组tags字段
  NEW.search_vector = 
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.title, '')), 'A') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.category_name, '')), 'B') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.content, '')), 'C') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(ARRAY_TO_STRING(NEW.tags, ' '), '')), 'B');
    
  -- 更新时间戳
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 重新创建触发器
CREATE TRIGGER tr_prompt_derived_fields
BEFORE INSERT OR UPDATE ON prompts
FOR EACH ROW EXECUTE FUNCTION update_prompt_derived_fields();

-- 7. 更新现有数据的作者信息
UPDATE prompts 
SET 
    author_name = COALESCE(u.username, '匿名用户'),
    author_avatar = COALESCE(u.avatar_url, 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U')
FROM users u 
WHERE prompts.user_id = u.user_id
AND (prompts.author_name IS NULL OR prompts.author_name = '');

-- 8. 确保所有记录都有作者信息
UPDATE prompts 
SET 
    author_name = '匿名用户',
    author_avatar = 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U'
WHERE author_name IS NULL OR author_name = '';

-- 9. 更新现有prompts记录的category_name
UPDATE prompts 
SET category_name = c.name 
FROM categories c 
WHERE prompts.category_id = c.category_id 
AND (prompts.category_name IS NULL OR prompts.category_name = '');

-- 10. 创建或更新作者信息维护触发器
CREATE OR REPLACE FUNCTION update_prompt_author_info()
RETURNS TRIGGER AS $$
BEGIN
    -- 当插入新提示词时，自动设置作者信息
    IF TG_OP = 'INSERT' THEN
        IF NEW.user_id IS NOT NULL THEN
            SELECT username, avatar_url
            INTO NEW.author_name, NEW.author_avatar
            FROM users
            WHERE user_id = NEW.user_id;
        END IF;
        
        -- 如果没有找到用户信息，设置默认值
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

-- 11. 创建触发器
DROP TRIGGER IF EXISTS tr_update_prompt_author ON prompts;
CREATE TRIGGER tr_update_prompt_author
    BEFORE INSERT ON prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_author_info();

-- 12. 更新现有记录的搜索向量
UPDATE prompts 
SET search_vector = 
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(title, '')), 'A') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(category_name, '')), 'B') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(content, '')), 'C') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(ARRAY_TO_STRING(tags, ' '), '')), 'B')
WHERE search_vector IS NULL;

-- 13. 确保必要的索引存在
CREATE INDEX IF NOT EXISTS idx_prompts_search ON prompts USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_prompts_tags ON prompts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_prompts_author_name ON prompts(author_name);

-- 14. 修复视图中的错误引用
DROP VIEW IF EXISTS hot_prompts;
CREATE OR REPLACE VIEW hot_prompts AS
SELECT 
    p.*,
    c.name as category_name,
    p.author_name,
    COALESCE(p.use_count * 0.4 + p.view_count * 0.3 + p.like_count * 0.2 + p.favorite_count * 0.1, 0) as hot_score
FROM prompts p
LEFT JOIN categories c ON p.category_id = c.category_id
WHERE p.status = 'published' AND p.is_public = TRUE
ORDER BY hot_score DESC;

DROP VIEW IF EXISTS user_stats;
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

-- 15. 验证修复结果
SELECT 
    'prompts' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN author_name IS NOT NULL AND author_name != '' THEN 1 END) as with_author,
    COUNT(CASE WHEN category_name IS NOT NULL AND category_name != '' THEN 1 END) as with_category,
    COUNT(CASE WHEN array_length(tags, 1) > 0 THEN 1 END) as with_tags
FROM prompts
UNION ALL
SELECT 
    'categories' as table_name,
    COUNT(*) as total_records,
    NULL as with_author,
    NULL as with_category,
    NULL as with_tags
FROM categories;

-- 完成！所有问题应该已经修复。
