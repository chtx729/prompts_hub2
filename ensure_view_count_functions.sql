-- 确保浏览量和使用量增加函数存在
-- 这些函数用于在用户查看或使用提示词时自动增加计数

-- 检查并创建增加使用计数函数
CREATE OR REPLACE FUNCTION increment_use_count(prompt_id BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE prompts
    SET use_count = use_count + 1,
        updated_at = NOW()
    WHERE prompts.prompt_id = increment_use_count.prompt_id;
    
    -- 如果没有找到记录，记录警告
    IF NOT FOUND THEN
        RAISE WARNING '提示词ID % 不存在，无法增加使用计数', prompt_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 检查并创建增加浏览计数函数
CREATE OR REPLACE FUNCTION increment_view_count(prompt_id BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE prompts
    SET view_count = view_count + 1,
        updated_at = NOW()
    WHERE prompts.prompt_id = increment_view_count.prompt_id;
    
    -- 如果没有找到记录，记录警告
    IF NOT FOUND THEN
        RAISE WARNING '提示词ID % 不存在，无法增加浏览计数', prompt_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 测试函数是否正常工作
DO $$
DECLARE
    test_prompt_id BIGINT;
    initial_view_count INT;
    initial_use_count INT;
    new_view_count INT;
    new_use_count INT;
BEGIN
    -- 获取第一个提示词进行测试
    SELECT prompt_id, view_count, use_count 
    INTO test_prompt_id, initial_view_count, initial_use_count
    FROM prompts 
    LIMIT 1;
    
    IF test_prompt_id IS NOT NULL THEN
        RAISE NOTICE '开始测试计数函数，使用提示词ID: %', test_prompt_id;
        RAISE NOTICE '初始浏览量: %, 初始使用量: %', initial_view_count, initial_use_count;
        
        -- 测试浏览计数函数
        PERFORM increment_view_count(test_prompt_id);
        
        -- 测试使用计数函数
        PERFORM increment_use_count(test_prompt_id);
        
        -- 检查结果
        SELECT view_count, use_count 
        INTO new_view_count, new_use_count
        FROM prompts 
        WHERE prompt_id = test_prompt_id;
        
        RAISE NOTICE '测试后浏览量: %, 使用量: %', new_view_count, new_use_count;
        
        -- 验证结果
        IF new_view_count = initial_view_count + 1 AND new_use_count = initial_use_count + 1 THEN
            RAISE NOTICE '✅ 计数函数测试成功！';
        ELSE
            RAISE NOTICE '❌ 计数函数测试失败！';
        END IF;
        
        -- 恢复原始值（可选）
        UPDATE prompts 
        SET view_count = initial_view_count,
            use_count = initial_use_count
        WHERE prompt_id = test_prompt_id;
        
        RAISE NOTICE '已恢复原始计数值';
        
    ELSE
        RAISE NOTICE '❌ 没有找到提示词数据，无法测试计数函数';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ 计数函数测试失败: %', SQLERRM;
END $$;

-- 验证函数创建成功
SELECT 
    'increment_view_count' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'increment_view_count'
    ) THEN '✅ 存在' ELSE '❌ 不存在' END as status

UNION ALL

SELECT 
    'increment_use_count' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'increment_use_count'
    ) THEN '✅ 存在' ELSE '❌ 不存在' END as status;

-- 完成！现在浏览量和使用量增加功能应该正常工作了。
