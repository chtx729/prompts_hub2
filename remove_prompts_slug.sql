-- 删除prompts表中的slug字段及相关索引
-- 在Supabase SQL编辑器中运行此脚本

-- 1. 先删除依赖于prompts表的视图（因为它们使用SELECT p.*会包含slug字段）
DROP VIEW IF EXISTS hot_prompts;

-- 2. 删除slug字段的索引
DROP INDEX IF EXISTS idx_prompts_slug;

-- 3. 删除prompts表中的slug字段
ALTER TABLE prompts DROP COLUMN IF EXISTS slug;

-- 4. 重新创建hot_prompts视图（不包含slug字段）
CREATE OR REPLACE VIEW hot_prompts AS
SELECT
    p.prompt_id,
    p.title,
    p.description,
    p.content,
    p.category_id,
    p.user_id,
    p.view_count,
    p.use_count,
    p.like_count,
    p.favorite_count,
    p.rating_average,
    p.rating_count,
    p.status,
    p.is_featured,
    p.is_public,
    p.published_at,
    p.created_at,
    p.updated_at,
    p.tags,
    p.output_media,
    p.orig_auth,
    p.author_name,
    p.author_avatar,
    p.category_name,
    c.name as category_name_join,
    u.username as author_name_join,
    COALESCE(p.use_count * 0.4 + p.view_count * 0.3 + p.like_count * 0.2 + p.favorite_count * 0.1, 0) as hot_score
FROM prompts p
LEFT JOIN categories c ON p.category_id = c.category_id
LEFT JOIN users u ON p.user_id = u.user_id
WHERE p.status = 'published' AND p.is_public = TRUE
ORDER BY hot_score DESC;

-- 5. 验证字段已删除
-- 可以运行以下查询来验证字段是否已删除：
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'prompts' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- 6. 测试视图是否正常工作
-- SELECT * FROM hot_prompts LIMIT 3;

-- 注意：categories表和tags表的slug字段保留，因为它们可能用于URL路由
-- 只删除prompts表的slug字段，因为它在代码中没有实际用途
