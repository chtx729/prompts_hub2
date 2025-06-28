# 匿名用户数据库集成方案

## 方案概述

### 🎯 **设计目标**
将匿名用户的点赞行为完全集成到数据库中，确保数据一致性和完整性。

### ✨ **核心特性**
- **统一匿名ID**：为每个浏览器生成唯一的匿名用户UUID
- **数据库记录**：匿名用户的点赞记录存储在user_likes表中
- **计数同步**：点赞操作实时更新prompts表的like_count字段
- **持久化存储**：匿名ID存储在localStorage中，浏览器重启后保持
- **独立处理**：匿名用户数据独立，不与登录用户合并

## 技术实现

### **1. 匿名用户ID管理**

#### **生成和存储机制**
```javascript
// 获取或创建匿名用户ID
getOrCreateAnonymousUserId() {
    try {
        let anonymousId = localStorage.getItem('anonymous_user_id');
        
        if (!anonymousId) {
            // 生成新的UUID
            anonymousId = this.generateUUID();
            localStorage.setItem('anonymous_user_id', anonymousId);
            console.log('创建新的匿名用户ID:', anonymousId);
        }
        
        return anonymousId;
    } catch (error) {
        console.error('获取匿名用户ID失败:', error);
        // 如果localStorage不可用，生成临时ID
        return this.generateUUID();
    }
}

// 生成UUID
generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
```

#### **ID特性**
- **格式**：标准UUID v4格式
- **唯一性**：每个浏览器一个唯一ID
- **持久性**：存储在localStorage中
- **兼容性**：与现有用户ID系统完全兼容

### **2. 点赞功能增强**

#### **统一的点赞处理**
```javascript
// 点赞/取消点赞
async toggleLike(promptId) {
    let userId = authManager.getCurrentUser()?.id;
    
    // 如果用户未登录，获取或创建匿名用户ID
    if (!userId) {
        userId = this.getOrCreateAnonymousUserId();
    }

    // 统一的点赞处理逻辑
    try {
        // 检查是否已点赞
        const { data: existingLike } = await supabase
            .from('user_likes')
            .select('like_id')
            .eq('user_id', userId)
            .eq('prompt_id', promptId)
            .single();

        if (existingLike) {
            // 取消点赞
            await supabase.from('user_likes').delete().eq('like_id', existingLike.like_id);
            await this.updatePromptLikeCount(promptId, -1);
            return { success: true, liked: false };
        } else {
            // 添加点赞
            await supabase.from('user_likes').insert([{ user_id: userId, prompt_id: promptId }]);
            await this.updatePromptLikeCount(promptId, 1);
            return { success: true, liked: true };
        }
    } catch (error) {
        console.error('点赞操作失败:', error);
        return { success: false, error: error.message };
    }
}
```

### **3. 数据库计数同步**

#### **原子性计数更新**
```javascript
// 更新提示词的点赞计数
async updatePromptLikeCount(promptId, increment) {
    try {
        // 使用SQL函数来原子性地更新计数
        const { error } = await supabase.rpc('update_prompt_like_count', {
            prompt_id: promptId,
            increment_value: increment
        });

        if (error) {
            // 如果RPC函数不存在，使用备用方法
            return this.updatePromptLikeCountFallback(promptId, increment);
        }

        return { success: true };
    } catch (error) {
        return this.updatePromptLikeCountFallback(promptId, increment);
    }
}
```

#### **数据库函数**
```sql
-- 创建原子性更新点赞计数的函数
CREATE OR REPLACE FUNCTION update_prompt_like_count(
    prompt_id bigint,
    increment_value integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 原子性地更新点赞计数
    UPDATE prompts 
    SET like_count = GREATEST(0, COALESCE(like_count, 0) + increment_value)
    WHERE prompts.prompt_id = update_prompt_like_count.prompt_id;
    
    -- 如果没有找到对应的提示词，抛出异常
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prompt with ID % not found', prompt_id;
    END IF;
END;
$$;
```

### **4. 用户交互状态查询**

#### **统一的状态查询**
```javascript
// 获取用户的点赞和收藏状态
async getUserInteractions(promptIds) {
    if (!promptIds.length) {
        return { success: true, data: { likes: [], favorites: [] } };
    }

    let userId = authManager.getCurrentUser()?.id;
    
    // 如果用户未登录，使用匿名用户ID
    if (!userId) {
        userId = this.getOrCreateAnonymousUserId();
    }

    // 从数据库查询用户交互状态
    try {
        const [likesResult, favoritesResult] = await Promise.all([
            supabase.from('user_likes').select('prompt_id').eq('user_id', userId).in('prompt_id', promptIds),
            supabase.from('user_favorites').select('prompt_id').eq('user_id', userId).in('prompt_id', promptIds)
        ]);

        return {
            success: true,
            data: {
                likes: likesResult.data?.map(item => item.prompt_id) || [],
                favorites: favoritesResult.data?.map(item => item.prompt_id) || []
            }
        };
    } catch (error) {
        console.error('获取用户交互失败:', error);
        return { success: false, error: error.message };
    }
}
```

## 数据流程

### **匿名用户点赞流程**
1. **用户点击点赞按钮**
2. **系统检测未登录状态**
3. **获取或创建匿名用户ID**
4. **查询数据库中的点赞记录**
5. **执行点赞/取消点赞操作**
6. **更新user_likes表记录**
7. **原子性更新prompts表的like_count**
8. **返回操作结果并更新UI**

### **数据存储结构**

#### **user_likes表记录**
```sql
-- 匿名用户的点赞记录
INSERT INTO user_likes (user_id, prompt_id) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 123);
```

#### **prompts表计数**
```sql
-- 提示词的点赞计数自动更新
UPDATE prompts 
SET like_count = like_count + 1 
WHERE prompt_id = 123;
```

#### **localStorage存储**
```javascript
// 匿名用户ID存储
localStorage.setItem('anonymous_user_id', '550e8400-e29b-41d4-a716-446655440000');
```

## 优势特性

### ✅ **数据一致性**
- 所有点赞数据统一存储在数据库中
- 匿名用户和登录用户使用相同的数据结构
- 点赞计数实时同步，确保准确性

### ✅ **用户体验**
- 无需登录即可参与互动
- 操作即时生效，无延迟感知
- 浏览器重启后状态保持

### ✅ **系统架构**
- 统一的API接口处理所有用户类型
- 原子性的数据库操作确保一致性
- 优雅的错误处理和降级机制

### ✅ **数据管理**
- 匿名用户数据独立，便于管理
- 支持数据分析和统计
- 为未来功能扩展提供基础

## 容错机制

### **localStorage不可用**
- 生成临时UUID，会话期间有效
- 功能正常工作，但状态不持久
- 用户体验基本不受影响

### **数据库操作失败**
- 提供备用的计数更新方法
- 详细的错误日志记录
- 用户友好的错误提示

### **网络问题**
- 操作失败时提供重试机制
- 本地状态与服务器状态同步
- 离线状态下的优雅降级

## 数据迁移策略

### **现有数据处理**
- 保持现有登录用户数据不变
- 新的匿名用户数据独立存储
- 不影响现有功能和性能

### **未来扩展**
- 支持匿名用户转为注册用户时的数据合并
- 提供数据清理和归档功能
- 支持跨设备的匿名用户识别

## 测试验证

### **测试页面**
- `test_anonymous_user_like.html` - 匿名用户数据库集成测试页面

### **测试场景**
1. **匿名ID生成**：验证UUID生成和存储
2. **点赞操作**：验证数据库记录和计数更新
3. **状态查询**：验证用户交互状态的正确性
4. **数据一致性**：验证各种查询方法的一致性
5. **持久化**：验证浏览器重启后的状态保持

### **数据库验证**
- 检查user_likes表中的匿名用户记录
- 验证prompts表的like_count字段更新
- 确认数据库函数的正确执行

现在匿名用户的点赞操作完全集成到数据库中，确保了数据的一致性和完整性！🎯✨
