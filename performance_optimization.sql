--- 性能优化SQL脚本
-- 创建数据库函数和索引来提升前端性能

-- 0. 首先检查和修复表结构关系
-- 确保users表存在并且有正确的结构
DO $$
BEGIN
    -- 检查users表是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- 创建users表
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            username TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- 创建索引
        CREATE INDEX idx_users_user_id ON users(user_id);
    END IF;

    -- 检查prompts表的user_id字段类型
    -- 如果prompts.user_id是UUID类型，需要确保它引用auth.users(id)
    -- 如果prompts.user_id是INTEGER类型，需要确保它引用users(id)
END $$;

-- 1. 创建获取热门标签的数据库函数
CREATE OR REPLACE FUNCTION get_popular_tags(tag_limit INTEGER DEFAULT 10)
RETURNS TABLE(name TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    WITH tag_counts AS (
        SELECT 
            UNNEST(tags) as tag_name,
            COUNT(*) as tag_count
        FROM prompts 
        WHERE status = 'published' 
        AND is_public = true 
        AND tags IS NOT NULL 
        AND array_length(tags, 1) > 0
        GROUP BY UNNEST(tags)
    )
    SELECT 
        TRIM(tc.tag_name) as name,
        tc.tag_count as count
    FROM tag_counts tc
    WHERE TRIM(tc.tag_name) != ''
    ORDER BY tc.tag_count DESC, tc.tag_name ASC
    LIMIT tag_limit;
END;
$$ LANGUAGE plpgsql;

-- 2. 创建获取用户交互状态的优化函数
CREATE OR REPLACE FUNCTION get_user_interactions(
    user_uuid UUID,
    prompt_ids INTEGER[]
)
RETURNS TABLE(
    prompt_id INTEGER,
    is_liked BOOLEAN,
    is_favorited BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.prompt_id,
        COALESCE(ul.user_id IS NOT NULL, false) as is_liked,
        COALESCE(uf.user_id IS NOT NULL, false) as is_favorited
    FROM UNNEST(prompt_ids) as p(prompt_id)
    LEFT JOIN user_likes ul ON ul.prompt_id = p.prompt_id AND ul.user_id = user_uuid
    LEFT JOIN user_favorites uf ON uf.prompt_id = p.prompt_id AND uf.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建性能优化索引

-- 提示词表的复合索引
CREATE INDEX IF NOT EXISTS idx_prompts_status_public_created 
ON prompts(status, is_public, created_at DESC) 
WHERE status = 'published' AND is_public = true;

-- 提示词表的分类索引
CREATE INDEX IF NOT EXISTS idx_prompts_category_status 
ON prompts(category_id, status, is_public) 
WHERE status = 'published' AND is_public = true;

-- 提示词表的用户索引
CREATE INDEX IF NOT EXISTS idx_prompts_user_status 
ON prompts(user_id, status, created_at DESC);

-- 标签的GIN索引（用于标签搜索）
CREATE INDEX IF NOT EXISTS idx_prompts_tags_gin 
ON prompts USING GIN(tags);

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_prompts_search_vector 
ON prompts USING GIN(search_vector);

-- 用户点赞表的复合索引
CREATE INDEX IF NOT EXISTS idx_user_likes_user_prompt 
ON user_likes(user_id, prompt_id);

CREATE INDEX IF NOT EXISTS idx_user_likes_prompt_user 
ON user_likes(prompt_id, user_id);

-- 用户收藏表的复合索引
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_prompt 
ON user_favorites(user_id, prompt_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_prompt_user 
ON user_favorites(prompt_id, user_id);

-- 分类表的排序索引
CREATE INDEX IF NOT EXISTS idx_categories_active_sort 
ON categories(is_active, sort_order) 
WHERE is_active = true;

-- 4. 创建统计信息更新函数（用于定期更新统计数据）
CREATE OR REPLACE FUNCTION update_prompt_statistics()
RETURNS void AS $$
BEGIN
    -- 更新点赞数
    UPDATE prompts 
    SET like_count = (
        SELECT COUNT(*) 
        FROM user_likes 
        WHERE user_likes.prompt_id = prompts.prompt_id
    );
    
    -- 更新收藏数（如果有收藏数字段）
    -- UPDATE prompts 
    -- SET favorite_count = (
    --     SELECT COUNT(*) 
    --     FROM user_favorites 
    --     WHERE user_favorites.prompt_id = prompts.prompt_id
    -- );
    
    -- 更新评分平均值（如果有评分表）
    -- UPDATE prompts 
    -- SET rating_average = (
    --     SELECT AVG(rating) 
    --     FROM prompt_ratings 
    --     WHERE prompt_ratings.prompt_id = prompts.prompt_id
    -- );
END;
$$ LANGUAGE plpgsql;

-- 5. 创建缓存清理函数
CREATE OR REPLACE FUNCTION cleanup_old_usage_logs()
RETURNS void AS $$
BEGIN
    -- 删除30天前的使用日志（保留统计数据）
    DELETE FROM usage_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 6. 创建定期任务（需要pg_cron扩展，可选）
-- SELECT cron.schedule('update-stats', '0 2 * * *', 'SELECT update_prompt_statistics();');
-- SELECT cron.schedule('cleanup-logs', '0 3 * * 0', 'SELECT cleanup_old_usage_logs();');

-- 7. 分析表以更新统计信息
ANALYZE prompts;
ANALYZE categories;
ANALYZE user_likes;
ANALYZE user_favorites;
ANALYZE usage_logs;

-- 8. 创建视图以简化常用查询
CREATE OR REPLACE VIEW popular_prompts AS
SELECT 
    p.*,
    c.icon as category_icon,
    c.color as category_color
FROM prompts p
LEFT JOIN categories c ON p.category_id = c.category_id
LEFT JOIN users u ON p.user_id = u.user_id
WHERE p.status = 'published' 
AND p.is_public = true
ORDER BY 
    (p.view_count * 0.3 + p.use_count * 0.5 + p.like_count * 0.2) DESC,
    p.created_at DESC;

-- 9. 创建最新提示词视图
CREATE OR REPLACE VIEW latest_prompts AS
SELECT 
    p.*,
    c.icon as category_icon,
    c.color as category_color
FROM prompts p
LEFT JOIN categories c ON p.category_id = c.category_id
LEFT JOIN users u ON p.user_id = u.user_id
WHERE p.status = 'published' 
AND p.is_public = true
ORDER BY p.created_at DESC;

-- 10. 创建用户统计视图
CREATE OR REPLACE VIEW user_prompt_stats AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(p.prompt_id) as total_prompts,
    SUM(p.view_count) as total_views,
    SUM(p.use_count) as total_uses,
    SUM(p.like_count) as total_likes,
    AVG(p.rating_average) as avg_rating
FROM users u
LEFT JOIN prompts p ON u.user_id = p.user_id AND p.status = 'published'
GROUP BY u.id, u.username;

-- 完成提示
SELECT 'Performance optimization completed successfully!' as message;