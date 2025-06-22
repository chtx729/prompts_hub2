-- 演示数据插入脚本
-- 在配置好基础表结构后，可以运行此脚本插入一些演示数据

-- 插入更多分类数据
INSERT INTO categories (name, slug, description, icon, color, sort_order) VALUES
('翻译助手', 'translation', '多语言翻译和本地化相关提示词', 'fas fa-language', '#6366f1', 8),
('数据分析', 'data-analysis', '数据处理、分析、可视化相关提示词', 'fas fa-chart-bar', '#8b5cf6', 9),
('客服助手', 'customer-service', '客户服务、问答、支持相关提示词', 'fas fa-headset', '#06b6d4', 10),
('法律咨询', 'legal', '法律文档、合规、咨询相关提示词', 'fas fa-gavel', '#374151', 11),
('健康医疗', 'health', '健康建议、医疗信息相关提示词', 'fas fa-heartbeat', '#dc2626', 12);

-- 插入演示提示词数据
INSERT INTO prompts (title, slug, description, content, category_id, user_id, status, is_featured, published_at, tags, model_name, output_text)
SELECT
    '英文邮件写作助手',
    'english-email-writer-' || extract(epoch from now()),
    '帮助您撰写专业、礼貌的英文商务邮件，适用于各种商务场景',
    '你是一位专业的英文邮件写作助手。请帮我写一封英文邮件：

收件人：[收件人姓名/职位]
邮件目的：[具体目的，如询问、申请、确认等]
主要内容：[要传达的主要信息]
语气要求：[正式/友好/紧急等]

请确保邮件：
1. 格式规范，包含适当的称呼和结尾
2. 语言专业且礼貌
3. 逻辑清晰，重点突出
4. 符合商务邮件礼仪',
    1,
    u.user_id,
    'published',
    TRUE,
    NOW(),
    ARRAY['写作', '英文', '邮件', '商务'],
    'GPT-4',
    'Subject: Inquiry About Product Specifications

Dear Mr. Johnson,

I hope this email finds you well. I am writing to inquire about the technical specifications of your latest software product, TechSuite Pro.

Our company is currently evaluating solutions for our upcoming project, and TechSuite Pro appears to align well with our requirements. Could you please provide detailed information about:

1. System compatibility requirements
2. Integration capabilities with existing platforms
3. Pricing structure for enterprise licenses

I would greatly appreciate if you could schedule a brief call to discuss these details further. Please let me know your availability for next week.

Thank you for your time and consideration. I look forward to hearing from you soon.

Best regards,
[Your Name]'
FROM public.users u WHERE u.role = 'admin' LIMIT 1;

INSERT INTO prompts (title, slug, description, content, category_id, user_id, status, is_featured, published_at, tags, model_name, output_text)
SELECT
    'Python代码调试专家',
    'python-debug-expert-' || extract(epoch from now()),
    '专业的Python代码调试助手，帮助识别和修复代码中的bug',
    '你是一位经验丰富的Python开发专家，专门帮助调试和修复代码问题。

请分析以下Python代码并提供调试建议：

```python
[在这里粘贴您的Python代码]
```

遇到的问题：[描述具体的错误或异常行为]

请提供：
1. 问题诊断：识别代码中的具体问题
2. 错误原因：解释为什么会出现这个问题
3. 修复方案：提供具体的修复代码
4. 最佳实践：给出改进建议和最佳实践
5. 测试建议：推荐相应的测试方法',
    2,
    u.user_id,
    'published',
    TRUE,
    NOW(),
    ARRAY['编程', 'Python', '调试', '代码'],
    'GPT-4',
    '## 问题诊断
您的代码中存在以下问题：
1. 第15行：变量名拼写错误，应该是 `user_name` 而不是 `username`
2. 第23行：缺少异常处理，可能导致程序崩溃
3. 第31行：列表索引越界风险

## 错误原因
- 变量名不一致导致 NameError
- 没有处理文件不存在的情况
- 没有检查列表长度就直接访问索引

## 修复方案
```python
try:
    with open("data.txt", "r") as file:
        lines = file.readlines()
        if len(lines) > 0:
            first_line = lines[0].strip()
            print(f"用户名: {user_name}")
except FileNotFoundError:
    print("文件不存在")
except IndexError:
    print("列表为空")
```

## 最佳实践
1. 使用一致的变量命名
2. 总是添加适当的异常处理
3. 在访问列表元素前检查长度
4. 使用上下文管理器处理文件操作'
FROM public.users u WHERE u.role = 'admin' LIMIT 1;

INSERT INTO prompts (title, slug, description, content, category_id, user_id, status, is_featured, published_at, tags, model_name)
SELECT
    '社交媒体内容策划师',
    'social-media-planner-' || extract(epoch from now()),
    '为各大社交媒体平台创作吸引人的内容，提高粉丝互动和品牌曝光',
    '你是一位创意十足的社交媒体内容策划师，擅长为不同平台创作引人入胜的内容。

品牌信息：
- 品牌名称：[品牌名称]
- 行业领域：[行业]
- 目标受众：[受众描述]
- 品牌调性：[专业/活泼/温馨/时尚等]

平台要求：[Instagram/微博/抖音/LinkedIn等]

内容类型：[图文/视频/故事/直播等]

请为我创作：
1. 吸引眼球的标题/文案
2. 引人入胜的内容描述
3. 相关的话题标签（5-10个）
4. 发布时间建议
5. 互动策略（如何鼓励用户参与）

要求内容原创、有趣，能够引发用户共鸣和互动。',
    3,
    u.user_id,
    'published',
    FALSE,
    NOW(),
    ARRAY['营销', '社交媒体', '内容创作', '品牌']
FROM public.users u WHERE u.role = 'admin' LIMIT 1;

INSERT INTO prompts (title, slug, description, content, category_id, user_id, status, is_featured, published_at, tags)
SELECT
    '学习计划制定助手',
    'study-plan-helper-' || extract(epoch from now()),
    '根据个人情况制定科学合理的学习计划，提高学习效率',
    '你是一位专业的学习规划师，擅长根据个人情况制定高效的学习计划。

请根据以下信息为我制定学习计划：

学习目标：[具体的学习目标]
学习内容：[要学习的科目/技能]
可用时间：[每天/每周可用于学习的时间]
当前水平：[初学者/有基础/进阶]
学习偏好：[视觉/听觉/实践型学习者]
截止时间：[希望达成目标的时间]

请提供：
1. 详细的学习计划（分阶段）
2. 每日/每周学习安排
3. 学习方法建议
4. 进度检查节点
5. 学习资源推荐
6. 激励和坚持的技巧

确保计划科学合理，符合学习规律。',
    4,
    u.user_id,
    'published',
    FALSE,
    NOW(),
    ARRAY['学习', '计划', '教育', '效率']
FROM public.users u WHERE u.role = 'admin' LIMIT 1;

INSERT INTO prompts (title, slug, description, content, category_id, user_id, status, is_featured, published_at, tags)
SELECT
    '商业计划书撰写专家',
    'business-plan-writer-' || extract(epoch from now()),
    '帮助创业者撰写专业的商业计划书，涵盖所有关键要素',
    '你是一位资深的商业顾问，专门帮助创业者撰写专业的商业计划书。

项目信息：
- 项目名称：[项目/公司名称]
- 行业领域：[所属行业]
- 商业模式：[B2B/B2C/平台等]
- 目标市场：[目标客户群体]
- 竞争优势：[核心竞争力]

请帮我撰写商业计划书的以下部分：
[可选择：执行摘要/市场分析/产品服务/营销策略/财务预测/团队介绍/风险分析]

要求：
1. 内容专业、逻辑清晰
2. 数据支撑、有说服力
3. 格式规范、易于阅读
4. 突出项目亮点和投资价值
5. 符合投资人关注重点

请确保内容具有可操作性和现实可行性。',
    5,
    u.user_id,
    'published',
    FALSE,
    NOW(),
    ARRAY['商业', '计划书', '创业', '投资']
FROM public.users u WHERE u.role = 'admin' LIMIT 1;

INSERT INTO prompts (title, slug, description, content, category_id, user_id, status, is_featured, published_at, tags)
SELECT
    'UI设计灵感生成器',
    'ui-design-inspiration-' || extract(epoch from now()),
    '为设计师提供创意UI设计方案和灵感，涵盖各种设计风格',
    '你是一位富有创意的UI/UX设计师，擅长为各种数字产品提供设计灵感和方案。

设计需求：
- 产品类型：[网站/APP/小程序/后台系统等]
- 行业领域：[电商/教育/金融/娱乐等]
- 目标用户：[年龄段、职业、使用习惯]
- 设计风格：[简约/现代/复古/可爱/专业等]
- 主要功能：[核心功能描述]

请为我提供：
1. 整体设计理念和风格定位
2. 色彩搭配方案（主色、辅色、强调色）
3. 字体选择建议
4. 布局结构建议
5. 关键页面设计要点
6. 交互设计建议
7. 设计趋势融入方案

要求设计方案既美观又实用，符合用户体验原则。',
    6,
    u.user_id,
    'published',
    FALSE,
    NOW(),
    ARRAY['设计', 'UI', 'UX', '创意', '界面']
FROM public.users u WHERE u.role = 'admin' LIMIT 1;

-- 插入一些使用记录（模拟数据）
INSERT INTO usage_logs (prompt_id, action_type, created_at)
SELECT 
    p.prompt_id,
    (ARRAY['view', 'copy', 'use'])[floor(random() * 3 + 1)],
    NOW() - (random() * interval '30 days')
FROM prompts p, generate_series(1, 5) -- 为每个提示词生成5条使用记录
WHERE p.status = 'published';

-- 更新提示词的统计数据
UPDATE prompts SET 
    view_count = (SELECT COUNT(*) FROM usage_logs WHERE prompt_id = prompts.prompt_id AND action_type = 'view'),
    use_count = (SELECT COUNT(*) FROM usage_logs WHERE prompt_id = prompts.prompt_id AND action_type IN ('copy', 'use'))
WHERE status = 'published';

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, config_type, description, is_public) VALUES
('featured_prompts_count', '6', 'integer', '首页推荐提示词数量', FALSE),
('max_tags_per_prompt', '10', 'integer', '每个提示词最大标签数', FALSE),
('enable_comments', 'true', 'boolean', '是否启用评论功能', FALSE),
('enable_ratings', 'true', 'boolean', '是否启用评分功能', FALSE),
('site_announcement', '', 'text', '网站公告', TRUE);

-- 提示：运行此脚本后，您的应用将有一些演示数据可以展示
-- 建议先创建一个管理员账户，然后运行此脚本
