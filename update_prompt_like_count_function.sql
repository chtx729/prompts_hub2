-- 创建原子性更新提示词点赞计数的函数
-- 在Supabase SQL编辑器中运行此脚本

-- 删除已存在的函数（如果有）
DROP FUNCTION IF EXISTS update_prompt_like_count(bigint, integer);

-- 创建更新点赞计数的函数
CREATE OR REPLACE FUNCTION update_prompt_like_count(
    prompt_id bigint,
    increment_value integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 原子性地更新点赞计数
    UPDATE prompts 
    SET like_count = GREATEST(0, COALESCE(like_count, 0) + increment_value)
    WHERE prompts.prompt_id = update_prompt_like_count.prompt_id;
    
    -- 如果没有找到对应的提示词，抛出异常
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prompt with ID % not found', prompt_id;
    END IF;
END;
$$;

-- 为函数添加注释
COMMENT ON FUNCTION update_prompt_like_count(bigint, integer) IS '原子性地更新提示词的点赞计数，确保计数不会小于0';

-- 创建更安全的计数更新函数（备用）
CREATE OR REPLACE FUNCTION increment_prompt_like_count_safe(
    p_prompt_id bigint,
    p_increment integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 使用UPDATE语句直接更新，避免竞态条件
    UPDATE prompts
    SET like_count = GREATEST(0, COALESCE(like_count, 0) + p_increment)
    WHERE prompt_id = p_prompt_id;

    -- 检查是否有行被更新
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prompt with ID % not found', p_prompt_id;
    END IF;
END;
$$;

-- 为备用函数添加注释
COMMENT ON FUNCTION increment_prompt_like_count_safe(bigint, integer) IS '安全的点赞计数更新函数（备用方法）';

-- 测试函数（可选）
-- SELECT update_prompt_like_count(1, 1);  -- 增加1个点赞
-- SELECT update_prompt_like_count(1, -1); -- 减少1个点赞
-- SELECT increment_prompt_like_count_safe(1, 1);  -- 备用方法测试
