-- ==========================================
-- 用户同步问题诊断脚本
-- 在 Supabase SQL 编辑器中运行此脚本
-- ==========================================

-- 1. 检查 auth.users 表
SELECT 'auth.users 用户总数' as check_item, COUNT(*) as count
FROM auth.users;

-- 2. 检查 public.users 表
SELECT 'public.users 用户总数' as check_item, COUNT(*) as count
FROM users;

-- 3. 检查同步状态 - 详细对比
SELECT 
    'auth.users 中但不在 public.users 中的用户' as check_item,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN users pu ON au.id = pu.user_id
WHERE pu.user_id IS NULL;

-- 4. 检查 public.users 中但不在 auth.users 中的用户（理论上不应该存在）
SELECT 
    'public.users 中但不在 auth.users 中的用户' as check_item,
    COUNT(*) as count
FROM users pu
LEFT JOIN auth.users au ON pu.user_id = au.id
WHERE au.id IS NULL;

-- 5. 显示所有用户的同步状态
SELECT 
    au.email,
    au.created_at as auth_created,
    pu.username,
    pu.role,
    pu.status,
    CASE 
        WHEN pu.user_id IS NOT NULL THEN '✅ 已同步'
        ELSE '❌ 未同步'
    END as sync_status
FROM auth.users au
LEFT JOIN users pu ON au.id = pu.user_id
ORDER BY au.created_at DESC;

-- 6. 检查管理员用户
SELECT 
    '管理员用户检查' as check_item,
    COUNT(*) as admin_count
FROM users
WHERE role = 'admin';

-- 7. 显示管理员用户详情
SELECT 
    au.email,
    pu.username,
    pu.role,
    pu.status,
    au.created_at
FROM auth.users au
INNER JOIN users pu ON au.id = pu.user_id
WHERE pu.role = 'admin';

-- 8. 检查触发器是否存在
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_prompt_user_created';

-- 9. 检查触发器函数是否存在
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
AND routine_schema = 'public';

-- 10. 测试管理员验证函数
SELECT 
    'is_admin 函数测试' as test_name,
    is_admin('00000000-0000-0000-0000-000000000000') as result_for_invalid_uuid;

-- 11. 如果有管理员用户，测试其 is_admin 函数
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- 获取第一个管理员用户的 ID
    SELECT user_id INTO admin_user_id
    FROM users 
    WHERE role = 'admin' 
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        RAISE NOTICE '管理员用户 % 的 is_admin 函数测试结果: %', 
            admin_user_id, 
            is_admin(admin_user_id);
    ELSE
        RAISE NOTICE '没有找到管理员用户';
    END IF;
END $$;

-- 12. 检查 RLS 策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('users', 'admin_logs')
ORDER BY tablename, policyname;

-- 13. 最终总结
SELECT 
    'auth.users' as table_name,
    COUNT(*) as user_count,
    'Supabase 认证表' as description
FROM auth.users
UNION ALL
SELECT 
    'public.users' as table_name,
    COUNT(*) as user_count,
    '用户资料表' as description
FROM users
UNION ALL
SELECT 
    'admin_users' as table_name,
    COUNT(*) as user_count,
    '管理员用户数' as description
FROM users
WHERE role = 'admin'
UNION ALL
SELECT 
    'synced_users' as table_name,
    COUNT(*) as user_count,
    '已同步用户数' as description
FROM auth.users au
INNER JOIN users pu ON au.id = pu.user_id;

-- ==========================================
-- 如果发现问题，可以运行以下修复命令：
-- ==========================================

/*
-- 修复1: 重新同步所有用户
INSERT INTO public.users (user_id, username)
SELECT 
    au.id,
    COALESCE(au.email, 'user_' || au.id::text) as username
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.user_id
WHERE pu.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 修复2: 设置管理员角色（替换邮箱地址）
UPDATE public.users 
SET role = 'admin' 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'your-admin-email@example.com'
);

-- 修复3: 重新创建触发器
DROP TRIGGER IF EXISTS on_auth_prompt_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (user_id, username)
    VALUES (NEW.id, COALESCE(NEW.email, 'user_' || NEW.id::text))
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_prompt_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
*/
