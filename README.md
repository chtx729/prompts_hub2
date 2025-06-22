# AI提示词宝库

一个现代化的AI提示词分享平台，帮助用户发现、创建、管理和分享高质量的AI提示词。

## 🌟 功能特性

### 核心功能
- **提示词浏览**: 分页展示所有公开提示词，支持卡片和列表视图切换
- **智能搜索**: 全文搜索、分类筛选、标签搜索，支持搜索建议和历史记录
- **排序功能**: 按浏览量、使用量、点赞量、创建时间等多维度排序
- **提示词详情**: 完整的提示词内容展示，包含使用统计和参考输出

### 用户功能
- **用户认证**: 基于Supabase的安全登录注册系统
- **我的空间**: 个人提示词管理中心，支持创建、编辑、删除
- **互动功能**: 点赞、收藏、评论提示词
- **使用统计**: 记录提示词的查看和使用情况

### 技术特性
- **响应式设计**: 完美适配桌面端和移动端
- **现代化UI**: 基于现代设计语言的美观界面
- **性能优化**: 智能缓存、防抖搜索、分页加载
- **实时更新**: 基于Supabase的实时数据同步

## 🚀 快速开始

### 1. 环境准备

确保您有以下环境：
- 现代浏览器（Chrome、Firefox、Safari、Edge）
- Supabase 账户

### 2. Supabase 配置

1. 访问 [Supabase](https://supabase.com) 创建新项目
2. 在项目设置中获取以下信息：
   - Project URL
   - anon public key

3. 在Supabase SQL编辑器中执行 `tables_sql.txt` 文件中的SQL语句来创建数据库表结构

### 3. 应用配置

编辑 `js/config.js` 文件，替换Supabase配置：

```javascript
const SUPABASE_CONFIG = {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key-here'
};
```

### 4. 运行应用

由于使用了ES6模块和现代JavaScript特性，建议通过HTTP服务器运行：

```bash
# 使用Python
python -m http.server 8000

# 使用Node.js
npx serve .

# 使用PHP
php -S localhost:8000
```

然后在浏览器中访问 `http://localhost:8000`

## 📁 项目结构

```
prompt_hub2/
├── index.html              # 主页面
├── css/
│   ├── main.css            # 主样式文件
│   └── components.css      # 组件样式
├── js/
│   ├── config.js           # 配置文件
│   ├── auth.js             # 用户认证
│   ├── api.js              # API接口管理
│   ├── ui.js               # UI工具类
│   ├── prompts.js          # 提示词管理
│   ├── search.js           # 搜索功能
│   ├── myspace.js          # 我的空间
│   └── main.js             # 主应用
├── tables_sql.txt          # 数据库表结构
└── README.md               # 项目说明
```

## 🎯 使用指南

### 游客用户
- 浏览所有公开提示词
- 使用搜索和筛选功能
- 查看提示词详情
- 复制提示词内容

### 注册用户
- 所有游客功能
- 创建和管理个人提示词
- 点赞和收藏提示词
- 评论和评分功能

### 管理员用户
- 所有用户功能
- 管理所有提示词
- 管理分类和标签
- 系统配置管理

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **后端**: Supabase (PostgreSQL + 实时API)
- **认证**: Supabase Auth
- **存储**: Supabase Storage (可选，用于媒体文件)
- **样式**: CSS Grid, Flexbox, CSS Variables
- **图标**: Font Awesome 6

## 🎨 设计特色

- **现代化界面**: 采用现代设计语言，简洁美观
- **响应式布局**: 完美适配各种设备尺寸
- **交互友好**: 流畅的动画和过渡效果
- **可访问性**: 支持键盘导航和屏幕阅读器

## 📊 数据库设计

主要数据表：
- `users`: 用户信息
- `categories`: 提示词分类
- `prompts`: 提示词内容
- `user_likes`: 用户点赞记录
- `user_favorites`: 用户收藏记录
- `user_ratings`: 用户评分记录
- `comments`: 评论数据
- `usage_logs`: 使用日志

## 🔧 自定义配置

### 修改应用配置
编辑 `js/config.js` 中的 `APP_CONFIG` 对象：

```javascript
const APP_CONFIG = {
    pagination: {
        defaultPageSize: 12,  // 每页显示数量
        maxPageSize: 50
    },
    search: {
        debounceDelay: 300,   // 搜索防抖延迟
        minQueryLength: 2     // 最小搜索长度
    }
    // ... 其他配置
};
```

### 自定义样式
- 修改 `css/main.css` 中的CSS变量来调整主题色彩
- 在 `css/components.css` 中添加自定义组件样式

## 🚀 部署指南

### 静态网站部署
可以部署到任何静态网站托管服务：
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

### 注意事项
1. 确保Supabase项目的RLS（行级安全）策略正确配置
2. 在生产环境中启用HTTPS
3. 配置适当的CORS设置

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目！

## 📄 许可证

MIT License

## 🔧 故障排除

如果遇到问题，请查看 [故障排除指南](TROUBLESHOOTING.md)，其中包含常见问题的解决方案。

### 🚨 遇到问题？立即修复：

**如果遇到UUID错误或提示词加载失败**，请立即查看：

📋 **[终极修复指南](ULTIMATE_FIX.md)** - 一步步解决所有问题

🔧 **[调试工具](debug.html)** - 诊断具体问题

### 快速修复步骤：

1. **打开调试工具**：`http://localhost:8000/debug.html`
2. **运行诊断**：点击各个测试按钮查看问题
3. **执行修复**：按照 `ULTIMATE_FIX.md` 中的SQL脚本修复
4. **验证结果**：确认所有功能正常工作

### 常见问题：

- **UUID类型错误**：数据库触发器函数有错误
- **提示词获取失败**：表结构不完整或字段名错误
- **网络资源失败**：CDN访问问题或本地文件缺失

## 📞 支持

如有问题：
1. 查看 [故障排除指南](TROUBLESHOOTING.md)
2. 使用 `test.html` 验证配置
3. 检查浏览器控制台错误信息
4. 提交Issue或联系开发者

---

**享受使用AI提示词宝库！** 🎉
