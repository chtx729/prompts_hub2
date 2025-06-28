-- 彻底清理所有可能的自动计数更新机制
-- 在Supabase SQL编辑器中运行此脚本

-- 1. 删除所有可能的触发器
DROP TRIGGER IF EXISTS user_likes_count_trigger ON user_likes;
DROP TRIGGER IF EXISTS user_likes_insert_trigger ON user_likes;
DROP TRIGGER IF EXISTS user_likes_delete_trigger ON user_likes;
DROP TRIGGER IF EXISTS user_likes_update_trigger ON user_likes;
DROP TRIGGER IF EXISTS prompt_like_count_trigger ON user_likes;

-- 2. 删除所有可能的触发器函数
DROP FUNCTION IF EXISTS update_prompt_like_count_trigger();
DROP FUNCTION IF EXISTS update_prompt_like_count_trigger(text, text);
DROP FUNCTION IF EXISTS increment_prompt_like_count();
DROP FUNCTION IF EXISTS decrement_prompt_like_count();
DROP FUNCTION IF EXISTS maintain_like_count();

-- 3. 删除所有可能的RPC函数
DROP FUNCTION IF EXISTS update_prompt_like_count(bigint, integer);
DROP FUNCTION IF EXISTS increment_prompt_like_count_safe(bigint, integer);
DROP FUNCTION IF EXISTS update_like_count(bigint, integer);
DROP FUNCTION IF EXISTS sync_like_count(bigint);

-- 4. 检查是否还有相关的触发器
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_likes'
   OR event_object_table = 'prompts';

-- 5. 检查是否还有相关的函数
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%like%count%' 
   OR routine_name LIKE '%prompt%count%'
   OR routine_name LIKE '%update%count%';

-- 6. 验证清理结果
-- 如果以上查询返回空结果，说明清理成功

-- 7. 手动修复所有不一致的计数
UPDATE prompts 
SET like_count = COALESCE(actual_likes.count, 0)
FROM (
    SELECT 
        prompt_id, 
        COUNT(*) as count
    FROM user_likes 
    GROUP BY prompt_id
) actual_likes
WHERE prompts.prompt_id = actual_likes.prompt_id
  AND prompts.like_count != actual_likes.count;

-- 8. 将没有点赞记录的提示词计数设为0
UPDATE prompts 
SET like_count = 0
WHERE prompt_id NOT IN (SELECT DISTINCT prompt_id FROM user_likes)
  AND like_count != 0;

-- 9. 验证修复结果
-- 这个查询应该返回空结果，表示所有计数都一致了
SELECT 
    p.prompt_id,
    p.like_count as prompts_like_count,
    COALESCE(ul.actual_likes, 0) as actual_likes,
    (p.like_count - COALESCE(ul.actual_likes, 0)) as difference
FROM prompts p
LEFT JOIN (
    SELECT 
        prompt_id, 
        COUNT(*) as actual_likes
    FROM user_likes 
    GROUP BY prompt_id
) ul ON p.prompt_id = ul.prompt_id
WHERE p.like_count != COALESCE(ul.actual_likes, 0)
LIMIT 10;

-- 10. 创建一个检查函数（可选）
CREATE OR REPLACE FUNCTION check_like_count_consistency()
RETURNS TABLE(
    prompt_id bigint,
    prompts_count bigint,
    actual_count bigint,
    difference bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.prompt_id,
        p.like_count,
        COALESCE(ul.actual_likes, 0),
        (p.like_count - COALESCE(ul.actual_likes, 0))
    FROM prompts p
    LEFT JOIN (
        SELECT 
            ul.prompt_id, 
            COUNT(*) as actual_likes
        FROM user_likes ul
        GROUP BY ul.prompt_id
    ) ul ON p.prompt_id = ul.prompt_id
    WHERE p.like_count != COALESCE(ul.actual_likes, 0);
END;
$$ LANGUAGE plpgsql;
