-- 修复触发器函数中的字段名错误
-- 这是导致UUID错误的真正原因

-- 1. 删除现有的有问题的触发器
DROP TRIGGER IF EXISTS tr_prompt_derived_fields ON prompts;
DROP FUNCTION IF EXISTS update_prompt_derived_fields();

-- 2. 重新创建正确的触发器函数
CREATE OR REPLACE FUNCTION update_prompt_derived_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新分类名称（修复字段名：id -> category_id）
  IF TG_OP = 'INSERT' OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    NEW.category_name = (SELECT name FROM categories WHERE category_id = NEW.category_id);
  END IF;
  
  -- 更新全文搜索向量（带权重）
  NEW.search_vector = 
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.title, '')), 'A') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.category_name, '')), 'B') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.content, '')), 'C') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(ARRAY_TO_STRING(NEW.tags, ' '), '')), 'B');
    
  -- 更新时间戳
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 重新创建触发器
CREATE TRIGGER tr_prompt_derived_fields
BEFORE INSERT OR UPDATE ON prompts
FOR EACH ROW EXECUTE FUNCTION update_prompt_derived_fields();

-- 4. 更新现有记录的category_name（如果有NULL值）
UPDATE prompts 
SET category_name = c.name 
FROM categories c 
WHERE prompts.category_id = c.category_id 
AND (prompts.category_name IS NULL OR prompts.category_name = '');

-- 5. 验证修复结果
SELECT 
    'Trigger Fix Verification' as status,
    COUNT(*) as total_prompts,
    COUNT(CASE WHEN category_name IS NOT NULL AND category_name != '' THEN 1 END) as with_category_name,
    COUNT(CASE WHEN category_name IS NULL OR category_name = '' THEN 1 END) as missing_category_name
FROM prompts;

-- 6. 测试触发器是否正常工作
-- 这个查询应该不会产生错误
DO $$
DECLARE
    test_prompt_id BIGINT;
BEGIN
    -- 尝试插入一个测试记录来验证触发器
    INSERT INTO prompts (title, slug, content, category_id, user_id, status)
    VALUES (
        'Test Trigger Fix',
        'test-trigger-fix-' || extract(epoch from now()),
        'This is a test prompt to verify the trigger fix.',
        1, -- 假设分类ID 1存在
        NULL, -- 匿名用户
        'draft'
    )
    RETURNING prompt_id INTO test_prompt_id;
    
    -- 检查category_name是否被正确设置
    IF EXISTS (
        SELECT 1 FROM prompts 
        WHERE prompt_id = test_prompt_id 
        AND category_name IS NOT NULL 
        AND category_name != ''
    ) THEN
        RAISE NOTICE '✅ 触发器修复成功！category_name已正确设置';
    ELSE
        RAISE NOTICE '❌ 触发器仍有问题，category_name未设置';
    END IF;
    
    -- 清理测试记录
    DELETE FROM prompts WHERE prompt_id = test_prompt_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ 触发器测试失败: %', SQLERRM;
END $$;

-- 完成！这应该修复了触发器中的字段名错误。
