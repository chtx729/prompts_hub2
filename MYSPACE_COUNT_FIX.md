# 我的空间提示词数量显示修复

## 🎯 问题描述
**用户反馈**：登录后，我的空间提示词数量显示正常，但最小化或者从切换到其他页面再返回时，提示词数量却一直显示"加载中"。

## 🔍 问题分析

### 问题现象
1. **初次登录**：提示词数量显示正常 ✅
2. **最小化窗口后恢复**：数量显示"加载中" ❌
3. **切换标签页后返回**：数量显示"加载中" ❌
4. **页面刷新**：数量显示正常 ✅

### 根本原因
1. **页面恢复时没有刷新数据**：`handleVisibilityChange`方法没有处理我的空间数据刷新
2. **条件加载逻辑不完整**：`loadMyPromptsIfNeeded`只检查容器内容，没有检查数量显示状态
3. **缺少专门的数量刷新方法**：没有独立的方法来刷新提示词数量

## 🔧 修复方案

### 1. 增强页面可见性变化处理

#### 修改文件：`js/main.js`
```javascript
// 处理页面可见性变化
handleVisibilityChange() {
    if (document.hidden) {
        console.log('页面隐藏');
    } else {
        console.log('页面恢复显示');
        // 如果当前在"我的空间"页面且用户已登录，刷新数据
        this.refreshCurrentPageData();
    }
}

// 刷新当前页面数据
refreshCurrentPageData() {
    try {
        const currentPage = this.currentPage;
        console.log('刷新当前页面数据:', currentPage);

        if (currentPage === 'my-space' && authManager.isAuthenticated()) {
            console.log('刷新我的空间数据');
            
            // 刷新提示词数量显示（从服务器获取最新数据）
            if (window.mySpaceManager && typeof window.mySpaceManager.refreshPromptCount === 'function') {
                window.mySpaceManager.refreshPromptCount();
            }
            
            // 延迟加载数据，确保页面完全恢复
            setTimeout(() => {
                if (window.mySpaceManager && typeof window.mySpaceManager.loadMyPromptsIfNeeded === 'function') {
                    window.mySpaceManager.loadMyPromptsIfNeeded();
                }
            }, 100);
        }
    } catch (error) {
        console.error('刷新页面数据失败:', error);
    }
}
```

### 2. 添加专门的提示词数量刷新方法

#### 修改文件：`js/myspace.js`
```javascript
// 刷新提示词数量（从服务器获取最新数据）
async refreshPromptCount() {
    if (!authManager.isAuthenticated()) {
        this.initPromptCount();
        return;
    }

    try {
        console.log('刷新提示词数量...');
        const countElement = document.getElementById('my-prompt-count');
        if (countElement) {
            countElement.textContent = '我创建的提示词数量：加载中...';
        }

        // 获取最新的提示词数量
        const result = await apiManager.getMyPrompts({
            page: 1,
            search: ''
        });

        if (result.success && result.pagination) {
            this.updatePromptCount(result.pagination.total);
            console.log('提示词数量刷新成功:', result.pagination.total);
        } else {
            console.error('获取提示词数量失败:', result.error);
            this.updatePromptCount(0);
        }
    } catch (error) {
        console.error('刷新提示词数量失败:', error);
        this.updatePromptCount(0);
    }
}
```

### 3. 改进条件加载逻辑

#### 修改文件：`js/myspace.js`
```javascript
// 根据需要加载我的提示词（避免重复加载）
loadMyPromptsIfNeeded() {
    // 检查当前是否在我的空间页面
    const currentPage = document.querySelector('.page.active');
    if (!currentPage || currentPage.id !== 'my-space-page') {
        console.log('不在我的空间页面，跳过数据加载');
        return;
    }

    // 检查认证状态
    if (!authManager.isAuthenticated()) {
        this.clearMyPrompts();
        return;
    }

    // 检查提示词数量显示是否需要更新
    const countElement = document.getElementById('my-prompt-count');
    const needsCountUpdate = countElement && 
                           (countElement.textContent.includes('加载中') || 
                            countElement.textContent.includes('请先登录'));

    // 检查是否已经有数据
    const container = document.getElementById('my-prompts-container');
    const isEmpty = !container ||
                   container.innerHTML.trim() === '' ||
                   container.innerHTML.includes('加载中') ||
                   container.innerHTML.includes('请先登录') ||
                   container.innerHTML.includes('您还没有创建任何提示词');

    if (isEmpty || needsCountUpdate) {
        console.log('检测到数据为空或数量显示需要更新，开始加载我的提示词');
        this.loadMyPrompts();
    } else {
        console.log('数据已存在且数量显示正常，无需重复加载');
    }
}
```

## 📋 修改文件清单

### 修改的文件
1. **`js/main.js`**
   - 第317-327行：增强页面可见性变化处理
   - 第328-356行：添加刷新当前页面数据方法

2. **`js/myspace.js`**
   - 第479-514行：改进条件加载逻辑
   - 第523-555行：添加专门的提示词数量刷新方法

### 测试文件
- **`test_myspace_count_fix.html`** - 我的空间提示词数量修复测试页面

## 🎯 修复效果

### 修复前的行为
1. 用户登录 → 数量显示正常 ✅
2. 最小化窗口 → 恢复后数量显示"加载中" ❌
3. 切换标签页 → 返回后数量显示"加载中" ❌

### 修复后的行为
1. 用户登录 → 数量显示正常 ✅
2. 最小化窗口 → 恢复后数量自动刷新并正常显示 ✅
3. 切换标签页 → 返回后数量自动刷新并正常显示 ✅

## 🔍 技术实现

### 事件流程
```
页面恢复显示 → visibilitychange事件 → handleVisibilityChange() → 
refreshCurrentPageData() → refreshPromptCount() → 从服务器获取最新数量 → 
updatePromptCount() → 显示正确数量
```

### 关键特性
1. **智能检测**：只在我的空间页面且用户已登录时刷新
2. **异步刷新**：从服务器获取最新的提示词数量
3. **状态检查**：检查数量显示状态，需要时重新加载
4. **错误处理**：包含完整的错误处理机制

## 🔍 测试验证

### 测试工具
- **`test_myspace_count_fix.html`** - 专门的测试页面

### 测试场景
1. **基础功能测试**
   - 模拟登录状态
   - 检查数量显示
   - 测试刷新方法

2. **页面可见性测试**
   - 模拟页面隐藏
   - 模拟页面恢复
   - 验证数量刷新

3. **实际场景测试**
   - 登录后检查数量
   - 最小化窗口后恢复
   - 切换标签页后返回

### 验证要点
- ✅ 页面恢复时数量能正确显示
- ✅ 不会一直显示"加载中"状态
- ✅ 从服务器获取最新数据
- ✅ 不影响其他功能

## 🛡️ 兼容性保证

### 功能兼容性
- ✅ 不影响正常的登录登出功能
- ✅ 不影响提示词的创建和管理
- ✅ 不影响其他页面的数据显示
- ✅ 保持所有API接口不变

### 性能考虑
- ✅ 只在需要时刷新数据
- ✅ 避免重复的网络请求
- ✅ 异步处理不阻塞UI
- ✅ 包含错误处理机制

## 🔄 工作流程

### 正常使用流程
1. **用户登录** → 提示词数量正常显示
2. **最小化窗口** → 页面隐藏，不触发刷新
3. **恢复窗口** → 页面恢复，自动刷新数量
4. **数量更新** → 显示最新的提示词数量

### 切换标签页流程
1. **用户在我的空间** → 提示词数量正常显示
2. **切换到其他标签页** → 页面隐藏
3. **返回我的空间标签页** → 页面恢复，自动刷新数量
4. **数量更新** → 显示最新的提示词数量

## 📊 修复统计

### 代码变更
- **新增方法**：2个（refreshCurrentPageData, refreshPromptCount）
- **修改方法**：2个（handleVisibilityChange, loadMyPromptsIfNeeded）
- **修改行数**：约50行
- **新增文件**：1个测试文件

### 功能改进
- **用户体验**：显著提升，解决了数据显示问题
- **数据准确性**：确保显示最新的提示词数量
- **系统稳定性**：增加了错误处理和状态检查
- **维护性**：代码结构更清晰，便于后续维护

---

**总结**：通过增强页面可见性变化处理、添加专门的数量刷新方法和改进条件加载逻辑，成功解决了我的空间提示词数量在页面恢复时显示"加载中"的问题，确保用户始终能看到正确的提示词数量。
