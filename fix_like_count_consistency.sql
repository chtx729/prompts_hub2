-- 修复点赞计数一致性问题
-- 在Supabase SQL编辑器中运行此脚本

-- 1. 首先检查当前的不一致情况
SELECT 
    p.prompt_id,
    p.title,
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
ORDER BY ABS(p.like_count - COALESCE(ul.actual_likes, 0)) DESC;

-- 2. 修复所有不一致的计数
-- 将prompts表的like_count更新为user_likes表中的实际记录数
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

-- 3. 将没有任何点赞记录的提示词的like_count设置为0
UPDATE prompts 
SET like_count = 0
WHERE prompt_id NOT IN (SELECT DISTINCT prompt_id FROM user_likes)
  AND like_count != 0;

-- 4. 验证修复结果
-- 这个查询应该返回空结果，表示所有计数都一致了
SELECT 
    p.prompt_id,
    p.title,
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
WHERE p.like_count != COALESCE(ul.actual_likes, 0);

-- 5. 创建触发器来保持数据一致性（可选）
-- 当user_likes表有变化时自动更新prompts表的like_count

-- 创建触发器函数
CREATE OR REPLACE FUNCTION update_prompt_like_count_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- 根据操作类型更新计数
    IF TG_OP = 'INSERT' THEN
        -- 插入新点赞记录时增加计数
        UPDATE prompts 
        SET like_count = COALESCE(like_count, 0) + 1
        WHERE prompt_id = NEW.prompt_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- 删除点赞记录时减少计数
        UPDATE prompts 
        SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1)
        WHERE prompt_id = OLD.prompt_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 删除已存在的触发器（如果有）
DROP TRIGGER IF EXISTS user_likes_count_trigger ON user_likes;

-- 创建触发器
CREATE TRIGGER user_likes_count_trigger
    AFTER INSERT OR DELETE ON user_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_like_count_trigger();

-- 为触发器添加注释
COMMENT ON FUNCTION update_prompt_like_count_trigger() IS '自动维护prompts表like_count字段与user_likes表记录数的一致性';
COMMENT ON TRIGGER user_likes_count_trigger ON user_likes IS '当user_likes表有变化时自动更新prompts表的like_count';

-- 6. 测试触发器（可选）
-- 可以手动插入和删除记录来测试触发器是否正常工作
/*
-- 测试插入
INSERT INTO user_likes (user_id, prompt_id) VALUES ('test-uuid', 1);
-- 检查prompts表的like_count是否增加了1

-- 测试删除
DELETE FROM user_likes WHERE user_id = 'test-uuid' AND prompt_id = 1;
-- 检查prompts表的like_count是否减少了1
*/
