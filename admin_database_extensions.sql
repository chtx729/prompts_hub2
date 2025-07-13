-- ==========================================
-- 管理后台数据库扩展
-- 在Supabase SQL编辑器中运行此脚本
-- ==========================================

-- 1. 管理员操作日志表
CREATE TABLE IF NOT EXISTS admin_logs (
    log_id BIGSERIAL PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'user', 'prompt', 'category', 'system'
    target_id TEXT,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 管理员日志索引
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs (action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_type ON admin_logs (target_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs (created_at);

-- 2. 系统通知表
CREATE TABLE IF NOT EXISTS system_notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    target_users TEXT[] DEFAULT '{}', -- 空数组表示所有用户
    is_read BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ
);

-- 系统通知索引
CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications (type);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_by ON system_notifications (created_by);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_at ON system_notifications (created_at);

-- 3. 管理员身份验证函数
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE users.user_id = is_admin.user_id 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 管理员统计视图
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM auth.users WHERE DATE(created_at) = CURRENT_DATE) as today_new_users,
    (SELECT COUNT(*) FROM prompts WHERE status = 'published') as total_prompts,
    (SELECT COUNT(*) FROM prompts WHERE DATE(created_at) = CURRENT_DATE) as today_new_prompts,
    (SELECT COUNT(*) FROM prompts WHERE status = 'reviewing') as pending_review,
    (SELECT COUNT(DISTINCT user_id) FROM usage_logs WHERE DATE(created_at) = CURRENT_DATE) as today_active_users,
    (SELECT COUNT(*) FROM categories WHERE is_active = true) as active_categories,
    (SELECT COUNT(*) FROM user_likes WHERE DATE(created_at) = CURRENT_DATE) as today_likes,
    (SELECT COUNT(*) FROM user_favorites WHERE DATE(created_at) = CURRENT_DATE) as today_favorites;

-- 5. 记录管理员操作的函数
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_action TEXT,
    p_target_type TEXT,
    p_target_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO admin_logs (
        admin_id, action, target_type, target_id, 
        details, ip_address, user_agent
    ) VALUES (
        p_admin_id, p_action, p_target_type, p_target_id,
        p_details, p_ip_address, p_user_agent
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 用户增长趋势视图（最近30天）
CREATE OR REPLACE VIEW user_growth_trend AS
SELECT
    DATE(au.created_at) as date,
    COUNT(*) as new_users,
    SUM(COUNT(*)) OVER (ORDER BY DATE(au.created_at)) as cumulative_users
FROM auth.users au
INNER JOIN users u ON au.id = u.user_id
WHERE au.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(au.created_at)
ORDER BY date;

-- 7. 提示词增长趋势视图（最近30天）
CREATE OR REPLACE VIEW prompt_growth_trend AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as new_prompts,
    SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_prompts
FROM prompts 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
AND status = 'published'
GROUP BY DATE(created_at)
ORDER BY date;

-- 8. 热门分类统计视图
CREATE OR REPLACE VIEW popular_categories AS
SELECT 
    c.category_id,
    c.name,
    c.slug,
    c.color,
    COUNT(p.prompt_id) as prompt_count,
    COALESCE(SUM(p.view_count), 0) as total_views,
    COALESCE(SUM(p.use_count), 0) as total_uses,
    COALESCE(SUM(p.like_count), 0) as total_likes
FROM categories c
LEFT JOIN prompts p ON c.category_id = p.category_id AND p.status = 'published'
WHERE c.is_active = true
GROUP BY c.category_id, c.name, c.slug, c.color
ORDER BY prompt_count DESC, total_views DESC;

-- 9. 活跃用户统计视图
CREATE OR REPLACE VIEW active_users_stats AS
SELECT
    u.user_id,
    u.username,
    u.role,
    u.status,
    au.email,
    au.created_at as user_created_at,
    COUNT(DISTINCT p.prompt_id) as prompts_created,
    COUNT(DISTINCT ul.log_id) as total_actions,
    COUNT(DISTINCT CASE WHEN ul.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN ul.log_id END) as actions_last_7_days,
    MAX(ul.created_at) as last_activity
FROM users u
INNER JOIN auth.users au ON u.user_id = au.id
LEFT JOIN prompts p ON u.user_id = p.user_id
LEFT JOIN usage_logs ul ON u.user_id = ul.user_id
GROUP BY u.user_id, u.username, u.role, u.status, au.email, au.created_at
ORDER BY actions_last_7_days DESC, total_actions DESC;

-- 10. RLS策略 - 管理员日志表
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理员查看操作日志" ON admin_logs
FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "管理员插入操作日志" ON admin_logs
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin')
    AND admin_id = auth.uid()
);

-- 11. RLS策略 - 系统通知表
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理员管理系统通知" ON system_notifications
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin')
);

-- 12. 创建管理员会话表（可选，用于会话管理）
CREATE TABLE IF NOT EXISTS admin_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 minutes'),
    is_active BOOLEAN DEFAULT TRUE
);

-- 管理员会话索引
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_is_active ON admin_sessions (is_active);

-- 13. 清理过期会话的函数
CREATE OR REPLACE FUNCTION cleanup_expired_admin_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM admin_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP OR is_active = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 提示：运行此脚本后，管理后台的数据库扩展将完成
-- 建议定期运行 cleanup_expired_admin_sessions() 函数清理过期会话
