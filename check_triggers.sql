-- 检查数据库中是否有触发器在自动更新计数
-- 在Supabase SQL编辑器中运行此查询

-- 1. 检查user_likes表上的所有触发器
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_likes';

-- 2. 检查是否有相关的函数
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%like%count%' 
   OR routine_name LIKE '%prompt%count%';

-- 3. 删除可能存在的触发器（如果有的话）
DROP TRIGGER IF EXISTS user_likes_count_trigger ON user_likes;
DROP FUNCTION IF EXISTS update_prompt_like_count_trigger();

-- 4. 验证触发器已删除
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'user_likes';
