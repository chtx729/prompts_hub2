-- Supabase版本的web_title表创建脚本
-- 在Supabase SQL编辑器中执行此脚本

-- 创建web_title表
CREATE TABLE IF NOT EXISTS public.web_title (
    id BIGSERIAL PRIMARY KEY,
    main_title TEXT NOT NULL,
    sub_title TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_web_title_active ON public.web_title(is_active);
CREATE INDEX IF NOT EXISTS idx_web_title_created_at ON public.web_title(created_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_web_title_updated_at
    BEFORE UPDATE ON public.web_title
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 启用RLS
ALTER TABLE public.web_title ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略：允许所有用户读取启用的标题
CREATE POLICY "Allow read active web titles" ON public.web_title
    FOR SELECT USING (is_active = true);

-- 创建RLS策略：允许认证用户读取所有标题（用于管理）
CREATE POLICY "Allow authenticated read all web titles" ON public.web_title
    FOR SELECT TO authenticated USING (true);

-- 创建RLS策略：允许认证用户插入标题（可根据需要调整权限）
CREATE POLICY "Allow authenticated insert web titles" ON public.web_title
    FOR INSERT TO authenticated WITH CHECK (true);

-- 创建RLS策略：允许认证用户更新标题（可根据需要调整权限）
CREATE POLICY "Allow authenticated update web titles" ON public.web_title
    FOR UPDATE TO authenticated USING (true);

-- 插入默认数据
INSERT INTO public.web_title (main_title, sub_title, is_active) VALUES
('发现最佳AI提示词', '让您的AI更智能、更高效', true),
('探索AI创意无限', '释放人工智能的无限潜能', true),
('智能提示词宝库', '提升AI对话质量的秘密武器', true),
('AI提示词专家', '专业、高效、智能的提示词解决方案', true),
('创意AI助手', '激发无限创意，提升工作效率', true),
('智能对话优化', '让每一次AI交互都更加精准', true),
('AI提示词大师', '掌握AI沟通的艺术与科学', true),
('高效AI工具箱', '一站式AI提示词解决方案', true)
ON CONFLICT DO NOTHING;

-- 创建随机获取网站标题的函数
CREATE OR REPLACE FUNCTION public.get_random_web_title()
RETURNS TABLE(main_title TEXT, sub_title TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT wt.main_title, wt.sub_title
    FROM public.web_title wt
    WHERE wt.is_active = true
    ORDER BY RANDOM()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 为函数添加注释
COMMENT ON FUNCTION public.get_random_web_title() IS '随机获取一条启用的网站标题';

-- 添加表注释
COMMENT ON TABLE public.web_title IS '网站标题配置表，用于动态显示首页标题';
COMMENT ON COLUMN public.web_title.id IS '主键ID';
COMMENT ON COLUMN public.web_title.main_title IS '主标题';
COMMENT ON COLUMN public.web_title.sub_title IS '副标题';
COMMENT ON COLUMN public.web_title.is_active IS '是否启用';
COMMENT ON COLUMN public.web_title.created_at IS '创建时间';
COMMENT ON COLUMN public.web_title.updated_at IS '更新时间';
