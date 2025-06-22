# 🔧 故障排除指南

## 常见问题及解决方案

### ❌ 问题：UUID类型错误

**错误信息：**
```
invalid input syntax for type uuid: "13"
```

**原因：**
数据库中某些字段期望UUID类型，但收到了整数值。

**解决方案：**
运行 `fix_all_issues.sql` 脚本，它会修复所有相关问题。

### ❌ 问题：资源加载失败

**错误信息：**
```
Failed to load resource: the server responded with a status of 404 (File not found)
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
```

**可能原因：**
1. CDN资源无法访问
2. 本地文件路径错误
3. 网络连接问题

**解决方案：**

1. **检查网络连接**：确保可以访问外部CDN
2. **验证文件路径**：确认所有本地文件都存在
3. **使用本地资源**：如果CDN无法访问，下载到本地

### ❌ 问题：获取提示词失败，出现关系错误

**错误信息：**
```
Could not find a relationship between 'prompts' and 'users' in the schema cache
```

**原因：**
数据库表之间的关系配置问题，或缺少必要的表结构。

**解决方案：**

#### 一键修复（推荐）

运行 `fix_simplified.sql` 脚本，它会：
- 修复UUID类型问题
- 添加必要的作者信息字段
- 更新触发器函数
- 修复搜索向量
- 使用简化的标签处理（数组字段）

#### 手动检查

如果问题仍然存在：

1. **检查表是否存在**：
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'categories', 'prompts', 'tags', 'prompt_tags');
```

2. **检查字段是否存在**：
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'prompts'
AND column_name IN ('author_name', 'author_avatar', 'category_name');
```

### ❌ 问题：无法连接到Supabase

**错误信息：**
```
请在 js/config.js 中配置您的 Supabase URL 和 API Key
```

**解决方案：**

1. 确保已复制配置文件：
   ```bash
   cp config.example.js js/config.js
   ```

2. 在 `js/config.js` 中填入正确的配置：
   ```javascript
   const SUPABASE_CONFIG = {
       url: 'https://your-project.supabase.co',
       anonKey: 'your-anon-key-here'
   };
   ```

3. 确保通过HTTP服务器运行应用，而不是直接打开HTML文件。

### ❌ 问题：数据库表不存在

**错误信息：**
```
relation "prompts" does not exist
```

**解决方案：**

1. 确保已在Supabase SQL编辑器中执行了 `tables_sql.txt` 中的所有SQL语句。

2. 检查表是否创建成功：
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('users', 'categories', 'prompts');
   ```

3. 如果表不存在，重新运行 `tables_sql.txt` 脚本。

### ❌ 问题：用户注册后无法创建提示词

**可能原因：**
- RLS（行级安全）策略配置问题
- 用户表记录未正确创建

**解决方案：**

1. 检查用户是否在 `users` 表中：
   ```sql
   SELECT * FROM users WHERE user_id = 'your-user-id';
   ```

2. 如果用户不存在，检查触发器是否正常工作：
   ```sql
   SELECT * FROM auth.users WHERE email = 'your-email';
   ```

3. 手动创建用户记录（如果需要）：
   ```sql
   INSERT INTO users (user_id, username) 
   VALUES ('your-user-id', 'your-username');
   ```

### ❌ 问题：搜索功能不工作

**可能原因：**
- 搜索向量未正确创建
- 全文搜索索引缺失

**解决方案：**

1. 检查搜索向量字段：
   ```sql
   SELECT prompt_id, title, search_vector FROM prompts LIMIT 5;
   ```

2. 如果搜索向量为空，更新它们：
   ```sql
   UPDATE prompts SET search_vector = 
       setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
       setweight(to_tsvector('english', COALESCE(content, '')), 'C');
   ```

### ❌ 问题：样式显示异常

**可能原因：**
- CSS文件路径错误
- CDN资源加载失败

**解决方案：**

1. 检查浏览器开发者工具的网络标签，确认所有资源都正确加载。

2. 确保Font Awesome和Google Fonts可以访问：
   ```html
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
   ```

3. 如果CDN无法访问，下载资源到本地并修改路径。

## 🔍 调试技巧

### 1. 使用浏览器开发者工具

- **控制台**：查看JavaScript错误和日志
- **网络**：检查API请求和响应
- **应用程序**：查看本地存储和会话数据

### 2. 检查Supabase日志

在Supabase控制台的"Logs"部分查看：
- API日志
- 数据库日志
- 认证日志

### 3. 使用测试工具

运行 `test.html` 来验证配置：
```
http://localhost:8000/test.html
```

### 4. SQL调试

在Supabase SQL编辑器中测试查询：
```sql
-- 测试基本查询
SELECT * FROM prompts WHERE status = 'published' LIMIT 5;

-- 测试连接查询
SELECT p.title, c.name as category_name 
FROM prompts p 
LEFT JOIN categories c ON p.category_id = c.category_id 
LIMIT 5;
```

## 📞 获取帮助

如果问题仍然存在：

1. 检查浏览器控制台的完整错误信息
2. 查看Supabase项目的日志
3. 确认数据库表结构是否正确
4. 验证API配置是否正确

## 🎯 预防措施

为避免类似问题：

1. **定期备份**：导出重要数据
2. **版本控制**：使用Git管理代码变更
3. **测试环境**：在生产环境前先在测试环境验证
4. **监控日志**：定期检查应用和数据库日志

---

**记住：大多数问题都可以通过仔细检查配置和数据库结构来解决！** 🔧
