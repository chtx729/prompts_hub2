# 部署指南

本文档详细说明如何将AI提示词宝库部署到各种平台。

## 📋 部署前准备

### 1. Supabase 项目设置

1. **创建 Supabase 项目**
   - 访问 [Supabase](https://supabase.com)
   - 点击 "New Project"
   - 填写项目信息并创建

2. **配置数据库**
   ```sql
   -- 在 Supabase SQL 编辑器中执行
   -- 1. 首先执行 tables_sql.txt 中的所有 SQL 语句
   -- 2. 然后执行 demo_data.sql 插入演示数据（可选）
   ```

3. **获取配置信息**
   - 进入项目设置 > API
   - 复制 Project URL 和 anon public key

### 2. 应用配置

1. **复制配置文件**
   ```bash
   cp config.example.js js/config.js
   ```

2. **编辑配置**
   ```javascript
   const SUPABASE_CONFIG = {
       url: 'https://your-project.supabase.co',
       anonKey: 'your-anon-key-here'
   };
   ```

## 🚀 部署选项

### 选项 1: Vercel 部署（推荐）

1. **准备代码**
   ```bash
   # 确保所有文件都已配置完成
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **部署到 Vercel**
   - 访问 [Vercel](https://vercel.com)
   - 连接 GitHub 仓库
   - 选择项目并部署
   - 无需额外配置，Vercel 会自动识别静态文件

3. **自定义域名（可选）**
   - 在 Vercel 项目设置中添加自定义域名
   - 配置 DNS 记录

### 选项 2: Netlify 部署

1. **部署方式 A：Git 连接**
   - 访问 [Netlify](https://netlify.com)
   - 连接 GitHub 仓库
   - 构建设置：
     - Build command: 留空
     - Publish directory: `/`

2. **部署方式 B：拖拽部署**
   - 将整个项目文件夹拖拽到 Netlify 部署区域
   - 自动部署完成

### 选项 3: GitHub Pages

1. **启用 GitHub Pages**
   ```bash
   # 在 GitHub 仓库设置中启用 Pages
   # 选择 main 分支作为源
   ```

2. **配置文件**
   - 确保 `index.html` 在根目录
   - 所有资源路径使用相对路径

### 选项 4: 自托管服务器

1. **服务器要求**
   - 支持静态文件托管的 Web 服务器
   - 支持 HTTPS（推荐）

2. **Nginx 配置示例**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /path/to/prompt-hub;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # 启用 gzip 压缩
       gzip on;
       gzip_types text/css application/javascript application/json;
   }
   ```

3. **Apache 配置示例**
   ```apache
   <VirtualHost *:80>
       ServerName your-domain.com
       DocumentRoot /path/to/prompt-hub
       
       <Directory /path/to/prompt-hub>
           AllowOverride All
           Require all granted
       </Directory>
   </VirtualHost>
   ```

## 🔧 环境配置

### 生产环境优化

1. **启用 HTTPS**
   - 所有现代部署平台都自动提供 HTTPS
   - 自托管服务器需要配置 SSL 证书

2. **CDN 配置**
   ```html
   <!-- 使用 CDN 加速静态资源 -->
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
   ```

3. **缓存策略**
   ```nginx
   # Nginx 缓存配置
   location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

### Supabase 生产配置

1. **RLS 策略**
   ```sql
   -- 确保启用行级安全
   ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
   
   -- 配置适当的策略
   CREATE POLICY "Public prompts are viewable by everyone" 
   ON prompts FOR SELECT 
   USING (status = 'published' AND is_public = true);
   ```

2. **数据库优化**
   - 确保所有必要的索引都已创建
   - 定期检查查询性能

## 📊 监控和维护

### 1. 性能监控

- 使用 Google Analytics 或类似工具跟踪用户行为
- 监控 Supabase 数据库性能
- 设置错误日志收集

### 2. 备份策略

- Supabase 自动备份数据库
- 定期导出重要数据
- 保存应用配置文件

### 3. 更新流程

1. **测试环境验证**
   ```bash
   # 在本地测试新功能
   python -m http.server 8000
   ```

2. **生产环境部署**
   ```bash
   git add .
   git commit -m "Update: new features"
   git push origin main
   # 自动触发部署（如果配置了 CI/CD）
   ```

## 🔒 安全考虑

### 1. Supabase 安全

- 正确配置 RLS 策略
- 定期更新 API 密钥
- 监控异常访问

### 2. 前端安全

- 验证所有用户输入
- 使用 HTTPS 传输
- 实施 CSP（内容安全策略）

### 3. 访问控制

```javascript
// 示例：限制管理员功能
if (user.role !== 'admin') {
    throw new Error('权限不足');
}
```

## 🐛 故障排除

### 常见问题

1. **Supabase 连接失败**
   - 检查 URL 和 API Key 是否正确
   - 确认网络连接正常

2. **数据库错误**
   - 检查 SQL 语句是否正确执行
   - 验证表结构是否完整

3. **样式问题**
   - 确认 CSS 文件路径正确
   - 检查浏览器兼容性

### 调试技巧

```javascript
// 启用详细日志
console.log('Debug info:', {
    user: authManager.getCurrentUser(),
    config: SUPABASE_CONFIG
});
```

## 📞 支持

如果在部署过程中遇到问题：

1. 检查浏览器控制台错误信息
2. 查看 Supabase 项目日志
3. 参考官方文档
4. 提交 Issue 寻求帮助

---

**祝您部署顺利！** 🎉
