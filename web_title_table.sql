-- 创建web_title表用于存储网站标题
CREATE TABLE IF NOT EXISTS web_title (
    id SERIAL PRIMARY KEY,
    main_title VARCHAR(200) NOT NULL COMMENT '主标题',
    sub_title VARCHAR(300) NOT NULL COMMENT '副标题',
    is_active BOOLEAN DEFAULT true COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_web_title_active ON web_title(is_active);
CREATE INDEX IF NOT EXISTS idx_web_title_created_at ON web_title(created_at);

-- 插入默认数据
INSERT INTO web_title (main_title, sub_title, is_active) VALUES
('发现最佳AI提示词', '让您的AI更智能、更高效', true),
('探索AI创意无限', '释放人工智能的无限潜能', true),
('智能提示词宝库', '提升AI对话质量的秘密武器', true),
('AI提示词专家', '专业、高效、智能的提示词解决方案', true),
('创意AI助手', '激发无限创意，提升工作效率', true),
('智能对话优化', '让每一次AI交互都更加精准', true),
('AI提示词大师', '掌握AI沟通的艺术与科学', true),
('高效AI工具箱', '一站式AI提示词解决方案', true)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 设置表注释
ALTER TABLE web_title COMMENT = '网站标题配置表，用于动态显示首页标题';

-- 为Supabase创建RLS策略（如果使用Supabase）
-- ALTER TABLE web_title ENABLE ROW LEVEL SECURITY;

-- 允许所有用户读取启用的标题
-- CREATE POLICY "Allow read active titles" ON web_title
--     FOR SELECT USING (is_active = true);

-- 只允许管理员修改标题（需要根据实际权限系统调整）
-- CREATE POLICY "Allow admin modify titles" ON web_title
--     FOR ALL USING (auth.role() = 'admin');
