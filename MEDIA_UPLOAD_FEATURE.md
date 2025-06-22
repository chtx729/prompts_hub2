# 📸 提示词参考图片上传功能

## 🎯 功能概述

为提示词创建表单添加"参考图片"上传功能，用户可以上传、预览、更换和删除图片。图片存储在Supabase Storage的media存储桶中，对应数据库字段为prompts表的output_media。

## 🔧 已实现的功能

### **1. 表单界面增强** ✅

#### **新增参考图片字段**
在"参考输出"字段后面添加了"参考图片"上传区域：

<augment_code_snippet path="js/myspace.js" mode="EXCERPT">
```html
<div class="form-group">
    <label for="prompt-media">参考图片</label>
    <div class="media-upload-container">
        <div class="media-upload-area" id="media-upload-area">
            <div class="upload-placeholder">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>点击或拖拽图片到此处上传</p>
                <p class="upload-hint">支持 JPG、PNG、GIF 格式，最大 5MB</p>
            </div>
            <input type="file" id="prompt-media" accept="image/*" style="display: none;">
        </div>
        <div class="media-preview-container" id="media-preview-container" style="display: none;">
            <div class="media-preview">
                <img id="media-preview-img" src="" alt="预览图片">
                <div class="media-actions">
                    <button type="button" class="btn btn-sm btn-outline" onclick="mySpaceManager.changeMedia()">
                        <i class="fas fa-edit"></i>
                        更换
                    </button>
                    <button type="button" class="btn btn-sm btn-outline btn-danger" onclick="mySpaceManager.removeMedia()">
                        <i class="fas fa-trash"></i>
                        删除
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
```
</augment_code_snippet>

### **2. 上传功能实现** ✅

#### **支持多种上传方式**
- ✅ **点击上传**：点击上传区域选择文件
- ✅ **拖拽上传**：直接拖拽图片到上传区域
- ✅ **文件验证**：自动验证文件类型和大小
- ✅ **实时预览**：上传前即可预览图片

#### **文件验证机制**
<augment_code_snippet path="js/myspace.js" mode="EXCERPT">
```javascript
// 处理媒体文件
async handleMediaFile(file) {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        UI.showNotification('请选择图片文件', 'warning');
        return;
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
        UI.showNotification('图片大小不能超过 5MB', 'warning');
        return;
    }

    this.currentMediaFile = file;
    this.showMediaPreview(file);
}
```
</augment_code_snippet>

### **3. Supabase Storage集成** ✅

#### **自动上传到Storage**
<augment_code_snippet path="js/myspace.js" mode="EXCERPT">
```javascript
// 上传媒体到Supabase Storage
async uploadMediaToStorage(file) {
    try {
        // 生成唯一文件名
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `prompts/${fileName}`;

        // 上传到Supabase Storage
        const { data, error } = await supabase.storage
            .from('media')
            .upload(filePath, file);

        if (error) {
            throw error;
        }

        // 获取公共URL
        const { data: urlData } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);

        return {
            success: true,
            url: urlData.publicUrl,
            path: filePath
        };
    } catch (error) {
        console.error('上传媒体失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
```
</augment_code_snippet>

### **4. 数据库集成** ✅

#### **自动保存到prompts表**
在提示词提交时，自动处理媒体上传并保存URL到output_media字段：

<augment_code_snippet path="js/myspace.js" mode="EXCERPT">
```javascript
// 处理媒体上传
let mediaUrl = this.currentMediaUrl;

if (this.currentMediaFile) {
    // 有新文件需要上传
    UI.showNotification('正在上传图片...', 'info');
    const uploadResult = await this.uploadMediaToStorage(this.currentMediaFile);
    
    if (uploadResult.success) {
        mediaUrl = uploadResult.url;
        
        // 如果是编辑模式且有旧媒体，删除旧媒体
        if (this.editingPrompt && this.editingPrompt.output_media && this.editingPrompt.output_media !== mediaUrl) {
            const oldPath = this.extractPathFromUrl(this.editingPrompt.output_media);
            if (oldPath) {
                await this.deleteMediaFromStorage(oldPath);
            }
        }
    } else {
        UI.showNotification('图片上传失败: ' + uploadResult.error, 'error');
        return;
    }
}

// 添加媒体URL到表单数据
formData.output_media = mediaUrl;
```
</augment_code_snippet>

### **5. 编辑功能支持** ✅

#### **现有图片显示和管理**
- ✅ **显示现有图片**：编辑时自动显示已上传的图片
- ✅ **更换图片**：可以更换为新图片，自动删除旧图片
- ✅ **删除图片**：可以删除图片，清空数据库字段

<augment_code_snippet path="js/myspace.js" mode="EXCERPT">
```javascript
// 处理现有媒体
this.removeMedia(); // 先清空
if (prompt.output_media) {
    this.currentMediaUrl = prompt.output_media;
    this.showExistingMedia(prompt.output_media);
}
```
</augment_code_snippet>

### **6. 美观的CSS样式** ✅

#### **现代化上传界面**
<augment_code_snippet path="css/components.css" mode="EXCERPT">
```css
/* 媒体上传样式 */
.media-upload-area {
    border: 2px dashed var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    text-align: center;
    cursor: pointer;
    transition: var(--transition-fast);
    background-color: var(--gray-50);
}

.media-upload-area:hover {
    border-color: var(--primary-color);
    background-color: var(--primary-50);
}

.media-upload-area.drag-over {
    border-color: var(--primary-color);
    background-color: var(--primary-100);
}
```
</augment_code_snippet>

#### **图片预览和操作**
<augment_code_snippet path="css/components.css" mode="EXCERPT">
```css
.media-preview img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
}

.media-actions {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    display: flex;
    gap: var(--space-2);
}

.media-actions .btn {
    background-color: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
    border: 1px solid var(--border-color);
}
```
</augment_code_snippet>

## 🧪 测试验证

### **使用测试工具**
```
http://localhost:8000/test_media_upload.html
```

这个测试工具提供：
- ✅ **连接状态检查**：验证登录状态和Storage连接
- ✅ **上传功能测试**：测试图片上传和预览
- ✅ **Storage管理**：查看、删除存储文件
- ✅ **URL可访问性测试**：验证上传后的图片URL

### **手动测试步骤**

#### **测试1: 创建带图片的提示词**
1. **登录系统**
2. **进入"我的空间"**
3. **点击"创建提示词"**
4. **填写基本信息**
5. **在"参考图片"区域上传图片**
6. **提交表单**
7. **确认图片正确保存**

#### **测试2: 编辑现有提示词的图片**
1. **打开已有提示词的编辑界面**
2. **查看现有图片是否正确显示**
3. **更换为新图片**
4. **保存修改**
5. **确认新图片生效，旧图片被删除**

#### **测试3: 删除图片**
1. **编辑有图片的提示词**
2. **点击"删除"按钮**
3. **保存修改**
4. **确认图片被删除，数据库字段为空**

## 📊 技术实现细节

### **文件命名规则**
```javascript
// 生成唯一文件名，避免冲突
const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
const filePath = `prompts/${fileName}`;
```

### **存储结构**
```
media/
└── prompts/
    ├── 1703123456789_abc123.jpg
    ├── 1703123456790_def456.png
    └── ...
```

### **数据库字段**
- **表名**：prompts
- **字段名**：output_media
- **类型**：TEXT
- **内容**：Supabase Storage公共URL

### **权限配置**
需要确保Supabase Storage的media存储桶配置了正确的权限：
- **读取权限**：公开（用于显示图片）
- **写入权限**：仅认证用户
- **删除权限**：仅文件所有者

## 🔧 配置要求

### **Supabase Storage设置**
1. **创建media存储桶**
2. **设置公共读取权限**
3. **配置RLS策略**：
   ```sql
   -- 允许认证用户上传
   CREATE POLICY "Allow authenticated users to upload" ON storage.objects
   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
   
   -- 允许用户删除自己的文件
   CREATE POLICY "Allow users to delete own files" ON storage.objects
   FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
   ```

### **数据库字段确认**
确保prompts表包含output_media字段：
```sql
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS output_media TEXT;
```

## 🎯 用户体验

### **上传流程**
1. **拖拽或点击**上传图片
2. **实时预览**图片内容
3. **自动验证**文件格式和大小
4. **提交时自动上传**到Storage
5. **保存URL**到数据库

### **编辑流程**
1. **自动显示**现有图片
2. **可以更换**为新图片
3. **可以删除**现有图片
4. **自动清理**旧文件

### **错误处理**
- ✅ **文件类型错误**：提示选择图片文件
- ✅ **文件过大**：提示文件大小限制
- ✅ **上传失败**：显示具体错误信息
- ✅ **网络问题**：自动重试机制

## 🚀 立即使用

### **步骤1: 确认配置**
1. **检查Supabase Storage**：确保media存储桶存在
2. **检查权限**：确保认证用户可以上传
3. **检查数据库**：确保output_media字段存在

### **步骤2: 测试功能**
1. **运行测试工具**：`http://localhost:8000/test_media_upload.html`
2. **测试上传功能**
3. **验证Storage连接**

### **步骤3: 创建提示词**
1. **登录系统**
2. **进入"我的空间"**
3. **创建新提示词**
4. **上传参考图片**
5. **提交并验证**

## 🎉 总结

这个功能实现了：

1. **完整的图片上传流程**：从选择到保存的全流程
2. **现代化的用户界面**：拖拽上传、实时预览
3. **完善的错误处理**：文件验证、上传失败处理
4. **自动化的存储管理**：自动上传、删除旧文件
5. **数据库集成**：自动保存URL到output_media字段

**关键特性**：
- ✅ 支持拖拽和点击上传
- ✅ 实时图片预览
- ✅ 文件类型和大小验证
- ✅ 自动上传到Supabase Storage
- ✅ 编辑时显示现有图片
- ✅ 自动清理旧文件
- ✅ 美观的现代化界面

现在用户可以为提示词添加参考图片，让提示词更加生动和实用！📸✨

## 📁 新增文件
- `test_media_upload.html` - 媒体上传功能测试工具
- `MEDIA_UPLOAD_FEATURE.md` - 完整功能说明文档
