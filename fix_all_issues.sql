-- 修复所有问题的SQL脚本
-- 在Supabase SQL编辑器中运行此脚本

-- 1. 创建缺失的tags表
CREATE TABLE IF NOT EXISTS tags (
    tag_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20) DEFAULT '#6b7280',
    use_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建缺失的prompt_tags关联表
CREATE TABLE IF NOT EXISTS prompt_tags (
    id BIGSERIAL PRIMARY KEY,
    prompt_id BIGINT NOT NULL REFERENCES prompts(prompt_id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (prompt_id, tag_id)
);

-- 3. 添加缺失的索引
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags (slug);
CREATE INDEX IF NOT EXISTS idx_tags_use_count ON tags (use_count);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_prompt_id ON prompt_tags (prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_tag_id ON prompt_tags (tag_id);

-- 4. 修复prompts表的category_name字段问题
-- 首先检查字段是否存在，如果不存在则添加
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prompts' AND column_name = 'category_name') THEN
        ALTER TABLE prompts ADD COLUMN category_name TEXT;
    END IF;
END $$;

-- 5. 修复update_prompt_derived_fields函数中的错误
CREATE OR REPLACE FUNCTION update_prompt_derived_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新分类名称
  IF TG_OP = 'INSERT' OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    NEW.category_name = (SELECT name FROM categories WHERE category_id = NEW.category_id);
  END IF;
  
  -- 更新全文搜索向量（带权重）
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

-- 6. 确保触发器存在
DROP TRIGGER IF EXISTS tr_prompt_derived_fields ON prompts;
CREATE TRIGGER tr_prompt_derived_fields
BEFORE INSERT OR UPDATE ON prompts
FOR EACH ROW EXECUTE FUNCTION update_prompt_derived_fields();

-- 7. 更新现有prompts记录的category_name
UPDATE prompts 
SET category_name = c.name 
FROM categories c 
WHERE prompts.category_id = c.category_id 
AND (prompts.category_name IS NULL OR prompts.category_name = '');

-- 8. 插入基础标签数据（如果不存在）
INSERT INTO tags (name, slug, description, color) VALUES
('写作', 'writing', '文章写作相关', '#3b82f6'),
('代码', 'coding', '编程代码相关', '#10b981'),
('营销', 'marketing', '营销推广相关', '#f59e0b'),
('教育', 'education', '学习教育相关', '#8b5cf6'),
('AI', 'ai', '人工智能相关', '#ef4444'),
('创意', 'creative', '创意设计相关', '#06b6d4')
ON CONFLICT (name) DO NOTHING;

-- 9. 修复author信息字段（如果还没有运行过quick_fix.sql）
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT '匿名用户';
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS author_avatar TEXT DEFAULT 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U';

-- 10. 更新现有数据的作者信息
UPDATE prompts 
SET 
    author_name = COALESCE(u.username, '匿名用户'),
    author_avatar = COALESCE(u.avatar_url, 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U')
FROM users u 
WHERE prompts.user_id = u.user_id
AND (prompts.author_name IS NULL OR prompts.author_name = '');

-- 11. 确保所有记录都有作者信息
UPDATE prompts 
SET 
    author_name = '匿名用户',
    author_avatar = 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U'
WHERE author_name IS NULL OR author_name = '';

-- 12. 创建或更新作者信息维护触发器
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

-- 13. 创建触发器
DROP TRIGGER IF EXISTS tr_update_prompt_author ON prompts;
CREATE TRIGGER tr_update_prompt_author
    BEFORE INSERT ON prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_author_info();

-- 14. 验证修复结果
-- 检查表是否都存在
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
BEGIN
    FOR table_name IN SELECT unnest(ARRAY['users', 'categories', 'prompts', 'tags', 'prompt_tags', 'user_favorites', 'user_likes', 'user_ratings', 'usage_logs', 'comments', 'system_configs'])
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '缺失的表: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '所有必需的表都已存在';
    END IF;
END $$;

-- 15. 显示修复结果统计
SELECT 
    'prompts' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN author_name IS NOT NULL AND author_name != '' THEN 1 END) as with_author,
    COUNT(CASE WHEN category_name IS NOT NULL AND category_name != '' THEN 1 END) as with_category
FROM prompts
UNION ALL
SELECT 
    'categories' as table_name,
    COUNT(*) as total_records,
    NULL as with_author,
    NULL as with_category
FROM categories
UNION ALL
SELECT 
    'tags' as table_name,
    COUNT(*) as total_records,
    NULL as with_author,
    NULL as with_category
FROM tags;

-- 完成！所有问题应该已经修复。
