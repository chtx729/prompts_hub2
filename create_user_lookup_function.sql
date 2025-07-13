-- ==========================================
-- 创建用户查询 RPC 函数
-- 在 Supabase SQL 编辑器中运行此脚本
-- ==========================================

-- 创建用户查询函数
CREATE OR REPLACE FUNCTION get_user_by_id(target_user_id UUID)
RETURNS TABLE(
    id INTEGER,
    user_id UUID,
    username TEXT,
    role TEXT,
    status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.user_id,
        u.username,
        u.role,
        u.status
    FROM users u
    WHERE u.user_id = target_user_id;
END;
$$;

-- 创建调试查询函数
CREATE OR REPLACE FUNCTION debug_user_lookup(target_user_id TEXT)
RETURNS TABLE(
    search_type TEXT,
    user_id_input TEXT,
    user_id_found UUID,
    username TEXT,
    role TEXT,
    status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 尝试直接UUID查询
    RETURN QUERY
    SELECT 
        'UUID查询'::TEXT as search_type,
        target_user_id as user_id_input,
        u.user_id as user_id_found,
        u.username,
        u.role,
        u.status
    FROM users u
    WHERE u.user_id = target_user_id::UUID;
    
    -- 如果没有结果，尝试字符串匹配
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            '字符串查询'::TEXT as search_type,
            target_user_id as user_id_input,
            u.user_id as user_id_found,
            u.username,
            u.role,
            u.status
        FROM users u
        WHERE u.user_id::TEXT = target_user_id;
    END IF;
    
    -- 如果还是没有结果，返回所有用户供调试
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            '所有用户'::TEXT as search_type,
            target_user_id as user_id_input,
            u.user_id as user_id_found,
            u.username,
            u.role,
            u.status
        FROM users u
        LIMIT 5;
    END IF;
END;
$$;

-- 测试函数
-- 请将下面的 UUID 替换为实际的用户ID
-- SELECT * FROM get_user_by_id('f28c7095-4ad8-4a55-bd7d-92807232ede4');
-- SELECT * FROM debug_user_lookup('f28c7095-4ad8-4a55-bd7d-92807232ede4');

-- ==========================================
-- 使用说明：
-- 1. 运行此脚本创建函数
-- 2. 在前端代码中可以使用 supabase.rpc('get_user_by_id', {...})
-- 3. 调试时可以使用 debug_user_lookup 函数
-- ==========================================
