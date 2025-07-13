-- ==========================================
-- 快速检查特定用户的同步状态
-- 在 Supabase SQL 编辑器中运行此脚本
-- ==========================================

-- 1. 检查特定邮箱的用户信息
-- 请将 'chtx365@163.com' 替换为您的实际邮箱
SELECT 
    'auth.users 中的用户信息' as source,
    au.id as user_id,
    au.email,
    au.created_at,
    au.email_confirmed_at
FROM auth.users au
WHERE au.email = 'chtx365@163.com';

-- 2. 检查该用户在 public.users 中的记录
SELECT 
    'public.users 中的用户信息' as source,
    pu.id as record_id,
    pu.user_id,
    pu.username,
    pu.role,
    pu.status
FROM users pu
WHERE pu.user_id IN (
    SELECT id FROM auth.users WHERE email = 'chtx365@163.com'
);

-- 3. 检查是否有重复记录
SELECT 
    'public.users 重复记录检查' as check_type,
    pu.user_id,
    COUNT(*) as record_count
FROM users pu
WHERE pu.user_id IN (
    SELECT id FROM auth.users WHERE email = 'chtx365@163.com'
)
GROUP BY pu.user_id
HAVING COUNT(*) > 1;

-- 4. 如果用户不存在于 public.users，创建记录
-- 取消注释下面的语句来修复
/*
INSERT INTO public.users (user_id, username, role)
SELECT 
    au.id,
    COALESCE(au.email, 'user_' || au.id::text) as username,
    'admin' as role  -- 设置为管理员
FROM auth.users au
WHERE au.email = 'chtx365@163.com'
AND NOT EXISTS (
    SELECT 1 FROM users pu WHERE pu.user_id = au.id
);
*/

-- 5. 如果用户存在但不是管理员，更新角色
-- 取消注释下面的语句来修复
/*
UPDATE users 
SET role = 'admin'
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'chtx365@163.com'
)
AND role != 'admin';
*/

-- 6. 最终验证
SELECT 
    '最终验证结果' as check_type,
    au.email,
    pu.username,
    pu.role,
    pu.status,
    CASE 
        WHEN pu.role = 'admin' THEN '✅ 管理员权限正确'
        ELSE '❌ 需要设置管理员权限'
    END as admin_status
FROM auth.users au
LEFT JOIN users pu ON au.id = pu.user_id
WHERE au.email = 'chtx365@163.com';

-- ==========================================
-- 使用说明：
-- 1. 将邮箱地址替换为您的实际邮箱
-- 2. 运行前4个查询检查状态
-- 3. 如果需要修复，取消注释第4或第5部分
-- 4. 运行第6个查询验证结果
-- ==========================================
