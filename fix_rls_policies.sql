-- ==========================================
-- 修复 RLS 策略 - 允许管理后台查询用户信息
-- 在 Supabase SQL 编辑器中运行此脚本
-- ==========================================

-- 1. 检查当前 RLS 状态
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrls
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 2. 查看现有策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- 3. 为管理后台创建查询策略
-- 允许已认证用户查询自己的信息
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = user_id);

-- 允许管理员查询所有用户信息
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 4. 如果需要，可以临时禁用 RLS 进行测试
-- 注意：这会降低安全性，仅用于调试
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 5. 重新启用 RLS（如果之前禁用了）
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. 验证策略是否生效
-- 这个查询应该返回当前用户的信息
-- SELECT * FROM public.users WHERE user_id = auth.uid();

-- ==========================================
-- 使用说明：
-- 1. 先运行查询 1-2 检查当前状态
-- 2. 运行步骤 3 创建策略
-- 3. 如果仍有问题，可以临时运行步骤 4 禁用 RLS 测试
-- 4. 测试完成后记得重新启用 RLS（步骤 5）
-- ==========================================

-- 额外：如果表没有启用 RLS，启用它
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 如果需要完全重置策略，可以删除所有现有策略
-- DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
-- DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
-- DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
-- DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
-- DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;
