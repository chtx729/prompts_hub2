-- 为prompts表添加原作者字段
-- 执行此SQL脚本来更新数据库结构

-- 添加原作者字段
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS orig_auth TEXT;

-- 添加字段注释
COMMENT ON COLUMN prompts.orig_auth IS '原作者姓名';

-- 验证字段是否添加成功
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'prompts' AND column_name = 'orig_auth';

-- 可选：为现有数据添加一些示例原作者信息（仅用于测试）
-- UPDATE prompts SET orig_auth = '示例作者' WHERE prompt_id IN (1, 2, 3);
