-- ==========================================
-- 修复用户同步问题
-- 解决 auth.users 和 public.users 表不同步的问题
-- 在Supabase SQL编辑器中运行此脚本
-- ==========================================

-- 1. 首先检查现有的触发器
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_prompt_user_created';

-- 2. 检查现有的函数
SELECT 
    routine_name, 
    routine_type, 
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
AND routine_schema = 'public';

-- 3. 重新创建触发器函数（确保正确）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 插入用户记录到 public.users 表
    INSERT INTO public.users (user_id, username)
    VALUES (NEW.id, COALESCE(NEW.email, 'user_' || NEW.id::text))
    ON CONFLICT (user_id) DO NOTHING; -- 避免重复插入
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- 记录错误但不阻止用户注册
        RAISE WARNING 'Failed to create user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_prompt_user_created ON auth.users;

-- 5. 重新创建触发器
CREATE TRIGGER on_auth_prompt_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. 同步现有的 auth.users 到 public.users
-- 这将为所有在 auth.users 中但不在 public.users 中的用户创建记录
INSERT INTO public.users (user_id, username)
SELECT 
    au.id,
    COALESCE(au.email, 'user_' || au.id::text) as username
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.user_id
WHERE pu.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 7. 检查同步结果
SELECT 
    'auth.users' as table_name,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'public.users' as table_name,
    COUNT(*) as count
FROM public.users
UNION ALL
SELECT 
    'synchronized' as table_name,
    COUNT(*) as count
FROM auth.users au
INNER JOIN public.users pu ON au.id = pu.user_id;

-- 8. 为现有管理员用户设置角色（如果需要）
-- 请将 'your-admin-email@example.com' 替换为实际的管理员邮箱
/*
UPDATE public.users 
SET role = 'admin' 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'your-admin-email@example.com'
);
*/

-- 9. 验证管理员设置
-- 取消注释下面的查询来检查管理员用户
/*
SELECT 
    au.email,
    pu.username,
    pu.role,
    pu.status
FROM auth.users au
INNER JOIN public.users pu ON au.id = pu.user_id
WHERE pu.role = 'admin';
*/

-- 10. 测试触发器是否正常工作
-- 可以通过注册新用户来测试，或者运行以下测试查询：
/*
-- 这个查询会显示最近的用户注册情况
SELECT 
    au.email,
    au.created_at as auth_created,
    pu.username,
    pu.role,
    CASE 
        WHEN pu.user_id IS NOT NULL THEN '✅ 已同步'
        ELSE '❌ 未同步'
    END as sync_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.user_id
ORDER BY au.created_at DESC
LIMIT 10;
*/

-- ==========================================
-- 使用说明：
-- 1. 运行此脚本修复用户同步问题
-- 2. 取消注释第8部分来设置管理员角色
-- 3. 取消注释第9部分来验证管理员设置
-- 4. 取消注释第10部分来测试同步状态
-- ==========================================
