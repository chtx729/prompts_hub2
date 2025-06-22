-- 修复数据库关系问题的SQL脚本
-- 这个脚本解决 "Could not find a relationship between 'prompts' and 'users'" 的错误

-- 方案1：创建一个视图来简化查询
CREATE OR REPLACE VIEW prompts_with_author AS
SELECT 
    p.*,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon,
    u.username as author_name,
    u.avatar_url as author_avatar,
    u.bio as author_bio
FROM prompts p
LEFT JOIN categories c ON p.category_id = c.category_id
LEFT JOIN users u ON p.user_id = u.user_id;

-- 方案2：创建一个函数来获取用户信息
CREATE OR REPLACE FUNCTION get_user_info(user_uuid UUID)
RETURNS TABLE(username TEXT, avatar_url VARCHAR(255), bio TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT u.username, u.avatar_url, u.bio
    FROM users u
    WHERE u.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- 方案3：为了简化，我们可以在prompts表中添加冗余的用户信息字段
-- 这样可以避免复杂的连接查询

-- 添加用户信息冗余字段到prompts表
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS author_avatar TEXT;

-- 创建触发器函数来自动更新作者信息
CREATE OR REPLACE FUNCTION update_prompt_author_info()
RETURNS TRIGGER AS $$
BEGIN
    -- 当插入或更新user_id时，自动更新作者信息
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
        SELECT username, avatar_url
        INTO NEW.author_name, NEW.author_avatar
        FROM users
        WHERE user_id = NEW.user_id;
        
        -- 如果没有找到用户信息，设置默认值
        IF NEW.author_name IS NULL THEN
            NEW.author_name = '匿名用户';
            NEW.author_avatar = 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS tr_update_prompt_author ON prompts;
CREATE TRIGGER tr_update_prompt_author
    BEFORE INSERT OR UPDATE ON prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_author_info();

-- 创建用户信息更新触发器（当用户信息变化时更新相关提示词）
CREATE OR REPLACE FUNCTION update_prompts_when_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- 当用户信息更新时，更新所有相关的提示词
    UPDATE prompts 
    SET 
        author_name = NEW.username,
        author_avatar = NEW.avatar_url
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建用户更新触发器
DROP TRIGGER IF EXISTS tr_update_user_info ON users;
CREATE TRIGGER tr_update_user_info
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_prompts_when_user_changes();

-- 初始化现有数据的作者信息
UPDATE prompts 
SET 
    author_name = COALESCE(u.username, '匿名用户'),
    author_avatar = COALESCE(u.avatar_url, 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U')
FROM users u 
WHERE prompts.user_id = u.user_id;

-- 为没有关联用户的提示词设置默认值
UPDATE prompts 
SET 
    author_name = '匿名用户',
    author_avatar = 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U'
WHERE author_name IS NULL;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_prompts_author_name ON prompts(author_name);

-- 验证数据
-- 运行以下查询来验证修复是否成功：
-- SELECT prompt_id, title, author_name, author_avatar FROM prompts LIMIT 5;

COMMENT ON COLUMN prompts.author_name IS '作者用户名（冗余字段，用于提高查询性能）';
COMMENT ON COLUMN prompts.author_avatar IS '作者头像URL（冗余字段，用于提高查询性能）';

-- 提示：运行此脚本后，应用应该能够正常获取提示词和作者信息
