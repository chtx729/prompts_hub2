-- 修复UUID类型问题的SQL脚本
-- 解决登录后出现 "invalid input syntax for type uuid: '13'" 错误

-- 1. 检查users表中的无效user_id
SELECT 
    id, 
    user_id, 
    username,
    CASE 
        WHEN user_id IS NULL THEN 'NULL'
        WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN 'Valid UUID'
        ELSE 'Invalid UUID'
    END as uuid_status
FROM users
ORDER BY id;

-- 2. 检查prompts表中的无效user_id
SELECT 
    prompt_id, 
    title, 
    user_id,
    CASE 
        WHEN user_id IS NULL THEN 'NULL (OK)'
        WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN 'Valid UUID'
        ELSE 'Invalid UUID'
    END as uuid_status
FROM prompts
WHERE user_id IS NOT NULL
ORDER BY prompt_id;

-- 3. 检查user_likes表中的无效user_id
SELECT 
    id,
    user_id,
    prompt_id,
    CASE 
        WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN 'Valid UUID'
        ELSE 'Invalid UUID'
    END as uuid_status
FROM user_likes
WHERE user_id IS NOT NULL
ORDER BY id;

-- 4. 检查user_favorites表中的无效user_id
SELECT 
    id,
    user_id,
    prompt_id,
    CASE 
        WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN 'Valid UUID'
        ELSE 'Invalid UUID'
    END as uuid_status
FROM user_favorites
WHERE user_id IS NOT NULL
ORDER BY id;

-- 5. 检查usage_logs表中的无效user_id
SELECT 
    id,
    user_id,
    prompt_id,
    action_type,
    CASE 
        WHEN user_id IS NULL THEN 'NULL (OK)'
        WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN 'Valid UUID'
        ELSE 'Invalid UUID'
    END as uuid_status
FROM usage_logs
ORDER BY id DESC
LIMIT 20;

-- ========================================
-- 修复操作（请根据上面的检查结果决定是否执行）
-- ========================================

-- 修复方案1：删除users表中的无效记录（谨慎使用）
-- 注意：这会删除所有无效UUID的用户记录
/*
DELETE FROM users 
WHERE user_id IS NOT NULL 
AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
*/

-- 修复方案2：将prompts表中无效user_id设为NULL（推荐）
-- 这样这些提示词就变成匿名提示词
UPDATE prompts 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

-- 修复方案3：删除user_likes表中的无效记录
DELETE FROM user_likes 
WHERE user_id IS NOT NULL 
AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

-- 修复方案4：删除user_favorites表中的无效记录
DELETE FROM user_favorites 
WHERE user_id IS NOT NULL 
AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

-- 修复方案5：将usage_logs表中无效user_id设为NULL
UPDATE usage_logs 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

-- ========================================
-- 验证修复结果
-- ========================================

-- 验证1：确认没有无效的UUID了
SELECT 'users' as table_name, COUNT(*) as invalid_count
FROM users 
WHERE user_id IS NOT NULL 
AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'

UNION ALL

SELECT 'prompts' as table_name, COUNT(*) as invalid_count
FROM prompts 
WHERE user_id IS NOT NULL 
AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'

UNION ALL

SELECT 'user_likes' as table_name, COUNT(*) as invalid_count
FROM user_likes 
WHERE user_id IS NOT NULL 
AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'

UNION ALL

SELECT 'user_favorites' as table_name, COUNT(*) as invalid_count
FROM user_favorites 
WHERE user_id IS NOT NULL 
AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'

UNION ALL

SELECT 'usage_logs' as table_name, COUNT(*) as invalid_count
FROM usage_logs 
WHERE user_id IS NOT NULL 
AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

-- 验证2：检查数据完整性
SELECT 
    'Data Summary' as info,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM prompts) as total_prompts,
    (SELECT COUNT(*) FROM prompts WHERE user_id IS NULL) as anonymous_prompts,
    (SELECT COUNT(*) FROM user_likes) as total_likes,
    (SELECT COUNT(*) FROM user_favorites) as total_favorites;

-- 完成！如果所有invalid_count都是0，说明修复成功。
