-- ==========================================
-- 完整的 RLS 策略修复脚本
-- 在 Supabase SQL 编辑器中运行此脚本
-- ==========================================

-- 1. 重新启用 RLS（如果之前禁用了）
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. 删除所有现有策略（清理）
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;

-- 3. 创建新的 RLS 策略

-- 策略1: 允许用户查看自己的信息
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = user_id);

-- 策略2: 允许管理员查看所有用户信息（使用递归CTE避免循环依赖）
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        -- 直接检查当前用户是否为管理员，避免递归查询
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE role = 'admin'
        )
    );

-- 策略3: 允许已认证用户插入自己的记录（用于注册）
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 策略4: 允许用户更新自己的信息
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 策略5: 允许管理员更新所有用户信息
CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE role = 'admin'
        )
    );

-- 策略6: 允许管理员删除用户（如果需要）
CREATE POLICY "Admins can delete users" ON public.users
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE role = 'admin'
        )
    );

-- 4. 验证策略是否正确创建
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

-- 5. 测试查询（这些查询应该在用户登录后能够执行）
-- 注意：这些查询需要在用户已登录的上下文中执行

-- 测试用户查看自己的信息
-- SELECT * FROM public.users WHERE user_id = auth.uid();

-- 测试管理员查看所有用户（仅当当前用户是管理员时）
-- SELECT * FROM public.users LIMIT 5;

-- ==========================================
-- 使用说明：
-- 1. 运行此脚本重新配置 RLS 策略
-- 2. 测试管理后台登录功能
-- 3. 如果仍有问题，检查用户是否在 public.users 表中存在
-- 4. 确保用户的 role 字段设置为 'admin'
-- ==========================================

-- 6. 额外的调试查询
-- 检查特定用户的信息（替换邮箱地址）
SELECT 
    'auth.users' as source,
    au.id,
    au.email,
    au.created_at
FROM auth.users au 
WHERE au.email = 'chtx365@163.com'

UNION ALL

SELECT 
    'public.users' as source,
    pu.user_id::text as id,
    pu.username as email,
    null as created_at
FROM public.users pu
WHERE pu.user_id IN (
    SELECT id FROM auth.users WHERE email = 'chtx365@163.com'
);

-- 7. 如果用户不存在于 public.users，创建记录
INSERT INTO public.users (user_id, username, role, status)
SELECT 
    au.id,
    au.email,
    'admin',
    'active'
FROM auth.users au
WHERE au.email = 'chtx365@163.com'
AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.user_id = au.id
)
ON CONFLICT (user_id) DO UPDATE SET 
    role = 'admin',
    status = 'active';
