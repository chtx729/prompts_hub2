-- 完整修复脚本：彻底解决所有问题
-- 在Supabase SQL编辑器中运行此脚本

-- 1. 删除所有有问题的触发器和函数
DROP TRIGGER IF EXISTS tr_prompt_derived_fields ON prompts;
DROP FUNCTION IF EXISTS update_prompt_derived_fields();

-- 2. 删除引用不存在表的索引（如果存在）
DROP INDEX IF EXISTS idx_tags_name;
DROP INDEX IF EXISTS idx_tags_slug;
DROP INDEX IF EXISTS idx_tags_use_count;
DROP INDEX IF EXISTS idx_prompt_tags_prompt_id;
DROP INDEX IF EXISTS idx_prompt_tags_tag_id;

-- 3. 删除有问题的视图
DROP VIEW IF EXISTS hot_prompts;
DROP VIEW IF EXISTS user_stats;

-- 4. 修复prompts表结构
-- 添加author信息字段
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT '匿名用户';
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS author_avatar TEXT DEFAULT 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U';

-- 确保category_name字段存在且允许NULL
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompts' AND column_name = 'category_name') THEN
        ALTER TABLE prompts ADD COLUMN category_name TEXT;
    END IF;
    
    -- 移除NOT NULL约束（如果存在）
    ALTER TABLE prompts ALTER COLUMN category_name DROP NOT NULL;
END $$;

-- 5. 重新创建正确的触发器函数
CREATE OR REPLACE FUNCTION update_prompt_derived_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新分类名称（修复字段名：id -> category_id）
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

-- 7. 创建作者信息维护触发器
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

-- 8. 创建作者信息触发器
DROP TRIGGER IF EXISTS tr_update_prompt_author ON prompts;
CREATE TRIGGER tr_update_prompt_author
    BEFORE INSERT ON prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_author_info();

-- 9. 更新现有数据
-- 更新分类名称
UPDATE prompts 
SET category_name = c.name 
FROM categories c 
WHERE prompts.category_id = c.category_id 
AND (prompts.category_name IS NULL OR prompts.category_name = '');

-- 更新作者信息
UPDATE prompts 
SET 
    author_name = COALESCE(u.username, '匿名用户'),
    author_avatar = COALESCE(u.avatar_url, 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U')
FROM users u 
WHERE prompts.user_id = u.user_id
AND (prompts.author_name IS NULL OR prompts.author_name = '');

-- 确保所有记录都有作者信息
UPDATE prompts 
SET 
    author_name = '匿名用户',
    author_avatar = 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U'
WHERE author_name IS NULL OR author_name = '';

-- 10. 更新搜索向量
UPDATE prompts 
SET search_vector = 
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(title, '')), 'A') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(category_name, '')), 'B') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(content, '')), 'C') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(ARRAY_TO_STRING(tags, ' '), '')), 'B')
WHERE search_vector IS NULL;

-- 11. 重新创建正确的视图
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

-- 12. 确保必要的索引存在
CREATE INDEX IF NOT EXISTS idx_prompts_search ON prompts USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_prompts_tags ON prompts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_prompts_author_name ON prompts(author_name);

-- 13. 创建计数器更新函数
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

-- 14. 验证修复结果
DO $$
DECLARE
    prompt_count INTEGER;
    category_count INTEGER;
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO prompt_count FROM prompts;
    SELECT COUNT(*) INTO category_count FROM categories;
    SELECT COUNT(*) INTO user_count FROM users;
    
    RAISE NOTICE '修复完成统计:';
    RAISE NOTICE '- 提示词数量: %', prompt_count;
    RAISE NOTICE '- 分类数量: %', category_count;
    RAISE NOTICE '- 用户数量: %', user_count;
    
    -- 检查数据完整性
    SELECT COUNT(*) INTO prompt_count FROM prompts WHERE author_name IS NOT NULL AND author_name != '';
    RAISE NOTICE '- 有作者信息的提示词: %', prompt_count;
    
    SELECT COUNT(*) INTO prompt_count FROM prompts WHERE category_name IS NOT NULL AND category_name != '';
    RAISE NOTICE '- 有分类信息的提示词: %', prompt_count;
END $$;

-- 15. 测试查询
SELECT 
    prompt_id, 
    title, 
    author_name, 
    category_name,
    array_length(tags, 1) as tag_count
FROM prompts 
WHERE status = 'published' 
LIMIT 3;

-- 完成！所有问题应该已经彻底修复。
