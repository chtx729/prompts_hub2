-- 1. 重新启用 RLS（如果之前禁用了）
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. 删除所有现有策略（清理）
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;

-- 3. 创建安全的 RLS 策略

-- 策略1: 允许用户查看自己的信息（前台登录必需）
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = user_id);

-- 策略2: 允许已认证用户插入自己的记录（前台注册必需）
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 策略3: 允许用户更新自己的信息（前台资料编辑必需）
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. 创建管理员专用函数（避免循环依赖）
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 直接查询，不受 RLS 限制
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE user_id = user_uuid 
        AND role = 'admin'
    );
END;
$$;

-- 5. 使用函数创建管理员策略
-- 策略4: 允许管理员查看所有用户信息
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (is_admin(auth.uid()));

-- 策略5: 允许管理员更新所有用户信息
CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- 策略6: 允许管理员删除用户（如果需要）
CREATE POLICY "Admins can delete users" ON public.users
    FOR DELETE USING (is_admin(auth.uid()));

-- 6. 验证策略是否正确创建
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

-- 7. 测试函数是否工作
-- 替换为实际的管理员用户ID进行测试
-- SELECT is_admin('f28c7095-4ad8-4a55-bd7d-92807232ede4'::UUID);

-- 8. 确保管理员用户存在且角色正确
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

-- 9. 验证最终结果
SELECT 
    '最终验证结果' as check_type,
    au.email,
    pu.username,
    pu.role,
    pu.status,
    is_admin(au.id) as is_admin_function_result,
    CASE 
        WHEN pu.role = 'admin' THEN '✅ 管理员权限正确'
        ELSE '❌ 需要设置管理员权限'
    END as admin_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.user_id
WHERE au.email = 'chtx365@163.com';

-- ==========================================
-- 策略说明：
-- 1. 普通用户只能查看/更新自己的信息
-- 2. 普通用户可以在注册时插入自己的记录
-- 3. 管理员通过 SECURITY DEFINER 函数检查权限
-- 4. 管理员可以查看/更新/删除所有用户信息
-- 5. 避免了循环依赖问题
-- ==========================================

-- 10. 额外的安全检查
-- 确保 is_admin 函数的权限正确
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO anon;
