-- 修复匿名用户外键约束问题
-- 在Supabase SQL编辑器中运行此脚本

-- 方案1：删除user_likes表的外键约束，允许匿名用户ID
-- 这是最简单的解决方案，适合当前需求

-- 1. 删除现有的外键约束
ALTER TABLE user_likes DROP CONSTRAINT IF EXISTS user_likes_user_id_fkey;

-- 2. 重新添加外键约束，但设置为可选（允许不存在于auth.users中的UUID）
-- 注意：这里我们不重新添加外键约束，而是依靠应用层来保证数据完整性

-- 3. 为user_id字段添加注释说明
COMMENT ON COLUMN user_likes.user_id IS '用户ID，可以是auth.users中的真实用户ID，也可以是匿名用户的UUID';

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_likes_user_id ON user_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_prompt_id ON user_likes(prompt_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_user_prompt ON user_likes(user_id, prompt_id);

-- 5. 同样处理user_favorites表（如果存在类似问题）
ALTER TABLE user_favorites DROP CONSTRAINT IF EXISTS user_favorites_user_id_fkey;
COMMENT ON COLUMN user_favorites.user_id IS '用户ID，可以是auth.users中的真实用户ID，也可以是匿名用户的UUID';

-- 6. 为user_favorites创建索引
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_prompt_id ON user_favorites(prompt_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_prompt ON user_favorites(user_id, prompt_id);

-- 验证修改结果
-- 可以运行以下查询来检查约束是否已删除：
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'user_likes'::regclass;
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'user_favorites'::regclass;

-- ========================================
-- 备选方案2：创建匿名用户记录（如果需要更严格的数据完整性）
-- ========================================

-- 如果您希望保持外键约束，可以使用以下方案：
-- 在auth.users表中创建一个特殊的匿名用户记录

/*
-- 创建匿名用户记录的示例（需要根据实际情况调整）
INSERT INTO auth.users (
    id,
    email,
    created_at,
    updated_at,
    email_confirmed_at,
    role
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'anonymous@system.local',
    NOW(),
    NOW(),
    NOW(),
    'anonymous'
) ON CONFLICT (id) DO NOTHING;

-- 然后修改前端代码，让所有匿名用户都使用这个固定的UUID
-- 但这种方案会失去匿名用户的独立性
*/

-- ========================================
-- 备选方案3：创建专门的匿名用户表
-- ========================================

/*
-- 创建匿名用户表
CREATE TABLE IF NOT EXISTS anonymous_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    browser_fingerprint TEXT,
    session_count INTEGER DEFAULT 1
);

-- 修改user_likes表，添加匿名用户支持
ALTER TABLE user_likes ADD COLUMN IF NOT EXISTS anonymous_user_id UUID REFERENCES anonymous_users(id);
ALTER TABLE user_likes ADD CONSTRAINT user_likes_user_check
    CHECK ((user_id IS NOT NULL AND anonymous_user_id IS NULL) OR
           (user_id IS NULL AND anonymous_user_id IS NOT NULL));

-- 但这种方案需要大量修改现有代码结构
*/
