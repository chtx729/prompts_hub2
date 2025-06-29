// 我的空间管理
class MySpaceManager {
    constructor() {
        this.currentPage = 1;
        this.searchQuery = '';
        this.editingPrompt = null;
        this.currentMediaFile = null;
        this.currentMediaUrl = null;
        this.isSubmitting = false; // 防止重复提交
        // init() 将在main.js中手动调用
    }

    // 初始化
    init() {
        this.bindEvents();
        this.createPromptModal();
        this.initPromptCount();
    }

    // 初始化提示词数量显示
    initPromptCount() {
        const countElement = document.getElementById('my-prompt-count');
        if (countElement) {
            if (authManager.isAuthenticated()) {
                countElement.textContent = '我创建的提示词数量：加载中...';
            } else {
                countElement.textContent = '我创建的提示词数量：请先登录';
            }
        }
    }

    // 绑定事件
    bindEvents() {
        // 创建提示词按钮
        const createBtn = document.getElementById('create-prompt-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                if (!authManager.requireAuth('创建提示词')) return;
                this.showCreatePromptModal();
            });
        }

        // 我的空间搜索
        const mySearchInput = document.getElementById('my-search-input');
        const mySearchBtn = document.getElementById('my-search-btn');

        if (mySearchInput) {
            let searchTimeout;
            mySearchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value;
                    this.currentPage = 1;
                    this.loadMyPrompts();
                }, APP_CONFIG.search.debounceDelay);
            });
        }

        if (mySearchBtn) {
            mySearchBtn.addEventListener('click', () => {
                this.searchQuery = mySearchInput.value;
                this.currentPage = 1;
                this.loadMyPrompts();
            });
        }

        // 监听认证状态变化
        authManager.onAuthStateChange((event, user) => {
            if (event === 'signIn') {
                // 用户登录时重置页面状态并加载数据
                this.resetPageState();
                // 延迟加载，确保页面切换完成
                setTimeout(() => {
                    this.loadMyPromptsIfNeeded();
                }, 300);
            } else if (event === 'signOut') {
                // 用户登出时清空数据
                this.clearMyPrompts();
            } else if (event === 'userChanged') {
                // 用户切换时重置页面状态并重新加载数据
                this.resetPageState();
                // 延迟加载，确保页面切换完成
                setTimeout(() => {
                    this.loadMyPromptsIfNeeded();
                }, 300);
            }
        });

        // 页面切换到我的空间时加载数据
        document.querySelectorAll('[data-page="my-space"]').forEach(link => {
            link.addEventListener('click', () => {
                if (authManager.isAuthenticated()) {
                    // 延迟加载，确保页面切换完成
                    setTimeout(() => {
                        this.loadMyPromptsIfNeeded();
                    }, 100);
                }
            });
        });
    }

    // 创建提示词模态框
    createPromptModal() {
        // 检查是否已经存在模态框，避免重复创建
        const existingModal = document.getElementById('prompt-modal');
        if (existingModal) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'prompt-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; max-height: 85vh;">
                <div class="modal-header">
                    <h3 id="prompt-modal-title">创建提示词</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="max-height: calc(85vh - 80px); overflow-y: auto;">
                    <form id="prompt-form">
                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label for="prompt-title">标题 *</label>
                                <input type="text" id="prompt-title" required maxlength="200">
                            </div>
                            <div class="form-group form-group-flex">
                                <label for="prompt-orig-auth">原作者</label>
                                <input type="text" id="prompt-orig-auth" maxlength="100" placeholder="选填">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="prompt-description">描述</label>
                            <textarea id="prompt-description" rows="3" maxlength="500"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="prompt-category">分类 *</label>
                            <select id="prompt-category" required>
                                <option value="">请选择分类</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="prompt-content">提示词内容 *</label>
                            <textarea id="prompt-content" rows="8" required placeholder="请输入您的提示词内容..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="prompt-tags">标签（用逗号分隔）</label>
                            <input type="text" id="prompt-tags" placeholder="例如：写作,创意,AI">
                        </div>
                        
                        <div class="form-group">
                            <label for="prompt-model">使用模型</label>
                            <input type="text" id="prompt-model" placeholder="例如：GPT-4, Claude-3">
                        </div>
                        
                        <div class="form-group">
                            <label for="prompt-output">参考输出</label>
                            <textarea id="prompt-output" rows="4" placeholder="可选：提供使用此提示词的示例输出"></textarea>
                        </div>

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

                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" onclick="UI.hideModal('prompt-modal')">取消</button>
                            <button type="submit" class="btn btn-primary">
                                <span id="prompt-submit-text">创建提示词</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 绑定表单提交事件（移除旧的事件监听器，避免重复绑定）
        const form = document.getElementById('prompt-form');
        // 移除可能存在的旧事件监听器
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        // 绑定新的事件监听器
        newForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePromptSubmit();
        });

        // 绑定媒体上传事件
        this.bindMediaUploadEvents();
    }

    // 显示创建提示词模态框
    async showCreatePromptModal() {
        this.editingPrompt = null;

        // 重置提交状态
        this.isSubmitting = false;

        // 安全地更新模态框标题
        const modalTitle = document.getElementById('prompt-modal-title');
        const submitText = document.getElementById('prompt-submit-text');
        const form = document.getElementById('prompt-form');

        if (modalTitle) modalTitle.textContent = '创建提示词';
        if (submitText) submitText.textContent = '创建提示词';

        // 重置表单
        if (form) form.reset();

        // 重置媒体上传
        this.removeMedia();

        // 重置按钮状态
        const submitBtn = document.querySelector('#prompt-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '创建提示词';
        }

        // 加载分类选项
        await this.loadCategoriesForForm();

        UI.showModal('prompt-modal');
    }

    // 显示编辑提示词模态框
    async showEditPromptModal(prompt) {
        this.editingPrompt = prompt;

        // 重置提交状态
        this.isSubmitting = false;

        // 安全地更新模态框标题
        const modalTitle = document.getElementById('prompt-modal-title');
        const submitText = document.getElementById('prompt-submit-text');

        if (modalTitle) modalTitle.textContent = '编辑提示词';
        if (submitText) submitText.textContent = '保存修改';

        // 重置按钮状态
        const submitBtn = document.querySelector('#prompt-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '保存修改';
        }

        // 安全地填充表单数据
        const titleInput = document.getElementById('prompt-title');
        const descInput = document.getElementById('prompt-description');
        const contentInput = document.getElementById('prompt-content');
        const tagsInput = document.getElementById('prompt-tags');
        const modelInput = document.getElementById('prompt-model');
        const outputInput = document.getElementById('prompt-output');
        const origAuthInput = document.getElementById('prompt-orig-auth');

        if (titleInput) titleInput.value = prompt.title;
        if (descInput) descInput.value = prompt.description || '';
        if (contentInput) contentInput.value = prompt.content;
        if (tagsInput) tagsInput.value = prompt.tags ? prompt.tags.join(', ') : '';
        if (modelInput) modelInput.value = prompt.model_name || '';
        if (outputInput) outputInput.value = prompt.output_text || '';
        if (origAuthInput) origAuthInput.value = prompt.orig_auth || '';

        // 处理现有媒体
        this.removeMedia(); // 先清空
        if (prompt.output_media) {
            this.currentMediaUrl = prompt.output_media;
            this.showExistingMedia(prompt.output_media);
        }

        // 加载分类选项
        await this.loadCategoriesForForm();
        const categorySelect = document.getElementById('prompt-category');
        if (categorySelect) categorySelect.value = prompt.category_id;

        UI.showModal('prompt-modal');
    }

    // 加载分类选项
    async loadCategoriesForForm() {
        const result = await apiManager.getCategories();
        const categorySelect = document.getElementById('prompt-category');
        
        categorySelect.innerHTML = '<option value="">请选择分类</option>';
        
        if (result.success) {
            result.data.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        }
    }

    // 处理提示词提交
    async handlePromptSubmit() {
        // 防止重复提交
        if (this.isSubmitting) {
            console.log('正在提交中，忽略重复请求');
            return;
        }

        this.isSubmitting = true;
        const submitBtn = document.querySelector('#prompt-form button[type="submit"]');

        // 检查按钮是否存在
        if (!submitBtn) {
            console.error('找不到提交按钮');
            this.isSubmitting = false;
            return;
        }

        const originalText = submitBtn.textContent;

        try {
            // 禁用提交按钮
            submitBtn.disabled = true;
            submitBtn.textContent = '提交中...';

            // 安全地获取表单数据
            const titleInput = document.getElementById('prompt-title');
            const descInput = document.getElementById('prompt-description');
            const categorySelect = document.getElementById('prompt-category');
            const contentInput = document.getElementById('prompt-content');
            const tagsInput = document.getElementById('prompt-tags');
            const modelInput = document.getElementById('prompt-model');
            const outputInput = document.getElementById('prompt-output');
            const origAuthInput = document.getElementById('prompt-orig-auth');

            const formData = {
                title: titleInput ? titleInput.value.trim() : '',
                description: descInput ? descInput.value.trim() : '',
                category_id: categorySelect ? parseInt(categorySelect.value) : 0,
                content: contentInput ? contentInput.value.trim() : '',
                tags: tagsInput ? tagsInput.value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0) : [],
                model_name: modelInput ? modelInput.value.trim() : '',
                output_text: outputInput ? outputInput.value.trim() : '',
                orig_auth: origAuthInput ? origAuthInput.value.trim() : ''
            };

            // 验证必填字段
            if (!formData.title || !formData.content || !formData.category_id) {
                UI.showNotification('请填写所有必填字段', 'warning');
                return;
            }
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

            let result;
            if (this.editingPrompt) {
                // 编辑模式
                result = await apiManager.updatePrompt(this.editingPrompt.prompt_id, formData);
            } else {
                // 创建模式
                result = await apiManager.createPrompt(formData);
            }

            if (result.success) {
                UI.hideModal('prompt-modal');
                UI.showNotification(
                    this.editingPrompt ? '提示词更新成功' : '提示词创建成功',
                    'success'
                );
                this.loadMyPrompts();

                // 清理临时数据
                this.currentMediaFile = null;
                this.currentMediaUrl = null;
            } else {
                UI.showNotification(result.error || '操作失败', 'error');
            }
        } catch (error) {
            console.error('提交提示词失败:', error);
            UI.showNotification('操作失败', 'error');
        } finally {
            // 重置提交状态
            this.isSubmitting = false;

            // 检查按钮是否仍然存在（模态框可能已被隐藏）
            if (submitBtn && submitBtn.parentNode) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }

    // 加载我的提示词
    async loadMyPrompts() {
        if (!authManager.isAuthenticated()) {
            this.clearMyPrompts();
            return;
        }

        UI.showLoading();

        try {
            const result = await apiManager.getMyPrompts({
                page: this.currentPage,
                search: this.searchQuery
            });

            if (result.success) {
                this.renderMyPrompts(result.data);
                this.createMyPromptsPagination(result.pagination);
                // 更新提示词数量统计
                this.updatePromptCount(result.pagination.total);
            } else {
                UI.showNotification(result.error || '加载失败', 'error');
                this.renderMyPrompts([]);
                this.updatePromptCount(0);
            }
        } catch (error) {
            console.error('加载我的提示词失败:', error);
            UI.showNotification('加载失败', 'error');
            this.renderMyPrompts([]);
            this.updatePromptCount(0);
        } finally {
            UI.hideLoading();
        }
    }

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

    // 更新提示词数量统计
    updatePromptCount(count) {
        const countElement = document.getElementById('my-prompt-count');
        if (countElement) {
            countElement.innerHTML = `我创建的提示词数量：<span class="count-number">${count}</span>`;
        }
    }

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

    // 渲染我的提示词
    renderMyPrompts(prompts) {
        const container = document.getElementById('my-prompts-container');
        if (!container) return;

        if (prompts.length === 0) {
            container.innerHTML = UI.createEmptyState(
                this.searchQuery ? '没有找到匹配的提示词' : '您还没有创建任何提示词，点击上方按钮开始创建吧！',
                'fas fa-plus-circle'
            );

            // 清空分页
            const paginationContainer = document.getElementById('my-pagination');
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
            return;
        }

        container.innerHTML = '';
        prompts.forEach(prompt => {
            const card = this.createMyPromptCard(prompt);
            container.appendChild(card);
        });
    }

    // 创建我的提示词卡片
    createMyPromptCard(prompt) {
        const card = document.createElement('div');
        card.className = 'prompt-card my-prompt-card';
        card.dataset.promptId = prompt.prompt_id;

        const statusClass = prompt.status === 'published' ? 'success' :
                           prompt.status === 'draft' ? 'warning' : 'error';
        const statusText = prompt.status === 'published' ? '已发布' :
                          prompt.status === 'draft' ? '草稿' : '审核中';

        // 处理分类信息
        const categoryInfo = prompt.categories || {};
        const categoryName = categoryInfo.name || prompt.category_name || '未分类';
        const categoryColor = categoryInfo.color || '#4f46e5';
        const categoryIcon = categoryInfo.icon || 'fas fa-folder';

        card.innerHTML = `
            <div class="prompt-card-header">
                <div class="prompt-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <h3 class="prompt-card-title">${UI.escapeHtml(prompt.title)}</h3>
                <p class="prompt-card-description">${UI.escapeHtml(prompt.description || '')}</p>
                <div class="prompt-card-meta">
                    <span class="prompt-card-category" style="background-color: ${categoryColor} !important">
                        <i class="${categoryIcon}"></i>
                        ${UI.escapeHtml(categoryName)}
                    </span>
                    <span>${UI.formatDate(prompt.created_at)}</span>
                </div>
            </div>
            <div class="prompt-card-stats">
                <span class="prompt-stat">
                    <i class="fas fa-eye"></i>
                    ${UI.formatNumber(prompt.view_count || 0)}
                </span>
                <span class="prompt-stat">
                    <i class="fas fa-copy"></i>
                    ${UI.formatNumber(prompt.use_count || 0)}
                </span>
                <span class="prompt-stat">
                    <i class="fas fa-heart"></i>
                    ${UI.formatNumber(prompt.like_count || 0)}
                </span>
            </div>
            <div class="prompt-card-actions">
                <button class="btn btn-outline btn-sm view-btn">
                    <i class="fas fa-eye"></i>
                    查看
                </button>
                <button class="btn btn-outline btn-sm edit-btn">
                    <i class="fas fa-edit"></i>
                    编辑
                </button>
                <button class="btn btn-outline btn-sm delete-btn">
                    <i class="fas fa-trash"></i>
                    删除
                </button>
            </div>
        `;

        // 绑定事件
        this.bindMyPromptCardEvents(card, prompt);

        return card;
    }

    // 绑定我的提示词卡片事件
    bindMyPromptCardEvents(card, prompt) {
        // 查看按钮
        const viewBtn = card.querySelector('.view-btn');
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止事件冒泡
            window.promptsManager.showPromptDetail(prompt.prompt_id, 'my-space-page');
        });

        // 卡片内容区域点击事件（使用header区域）
        const cardHeader = card.querySelector('.prompt-card-header');
        if (cardHeader) {
            cardHeader.addEventListener('click', (e) => {
                // 如果点击的是按钮或链接，不触发卡片点击
                if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.prompt-card-actions')) {
                    return;
                }
                window.promptsManager.showPromptDetail(prompt.prompt_id, 'my-space-page');
            });

            // 添加鼠标悬浮效果
            cardHeader.style.cursor = 'pointer';
        }

        // 编辑
        const editBtn = card.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => {
            this.showEditPromptModal(prompt);
        });

        // 删除
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            this.confirmDeletePrompt(prompt);
        });
    }

    // 确认删除提示词
    confirmDeletePrompt(prompt) {
        if (confirm(`确定要删除提示词"${prompt.title}"吗？此操作不可撤销。`)) {
            this.deletePrompt(prompt.prompt_id);
        }
    }

    // 删除提示词
    async deletePrompt(promptId) {
        try {
            const result = await apiManager.deletePrompt(promptId);
            if (result.success) {
                UI.showNotification('提示词删除成功', 'success');
                this.loadMyPrompts();
            } else {
                UI.showNotification(result.error || '删除失败', 'error');
            }
        } catch (error) {
            console.error('删除提示词失败:', error);
            UI.showNotification('删除失败', 'error');
        }
    }

    // 创建我的提示词分页
    createMyPromptsPagination(pagination) {
        // 使用专门的我的空间分页容器
        UI.createPagination(pagination, (page) => {
            this.currentPage = page;
            this.loadMyPrompts();
        }, 'my-pagination');
    }

    // 清空我的提示词
    clearMyPrompts() {
        const container = document.getElementById('my-prompts-container');
        if (container) {
            container.innerHTML = UI.createEmptyState(
                '请先登录查看您的提示词',
                'fas fa-sign-in-alt'
            );
        }

        // 清空分页
        const paginationContainer = document.getElementById('my-pagination');
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }

        // 重置搜索状态
        this.resetSearchState();

        // 重置数量统计
        const countElement = document.getElementById('my-prompt-count');
        if (countElement) {
            countElement.textContent = '我创建的提示词数量：请先登录';
        }
    }

    // 重置搜索状态
    resetSearchState() {
        this.currentPage = 1;
        this.searchQuery = '';

        // 清空搜索输入框
        const searchInput = document.getElementById('my-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
    }

    // 重置页面状态（用于用户切换时）
    resetPageState() {
        this.currentPage = 1;
        this.searchQuery = '';
        this.editingPrompt = null;
        this.currentMediaFile = null;
        this.currentMediaUrl = null;

        // 清空搜索输入框
        const searchInput = document.getElementById('my-search-input');
        if (searchInput) {
            searchInput.value = '';
        }

        // 清除API缓存，确保获取新用户的数据
        if (typeof apiManager !== 'undefined' && typeof apiManager.clearCache === 'function') {
            console.log('清除API缓存以获取新用户数据');
            apiManager.clearCache('my-prompts');
            apiManager.clearCache('prompts');
            apiManager.clearCache('user-interactions');
        }

        // 重置数量显示
        this.initPromptCount();
    }

    // 绑定媒体上传事件
    bindMediaUploadEvents() {
        const uploadArea = document.getElementById('media-upload-area');
        const fileInput = document.getElementById('prompt-media');

        if (!uploadArea || !fileInput) return;

        // 点击上传区域触发文件选择
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // 文件选择事件
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleMediaFile(file);
            }
        });

        // 拖拽上传
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleMediaFile(files[0]);
            }
        });
    }

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

    // 显示媒体预览
    showMediaPreview(file) {
        const uploadArea = document.getElementById('media-upload-area');
        const previewContainer = document.getElementById('media-preview-container');
        const previewImg = document.getElementById('media-preview-img');

        if (!uploadArea || !previewContainer || !previewImg) return;

        // 创建预览URL
        const previewUrl = URL.createObjectURL(file);
        previewImg.src = previewUrl;

        // 显示预览，隐藏上传区域
        uploadArea.style.display = 'none';
        previewContainer.style.display = 'block';
    }

    // 更换媒体
    changeMedia() {
        const fileInput = document.getElementById('prompt-media');
        if (fileInput) {
            fileInput.click();
        }
    }

    // 删除媒体
    removeMedia() {
        const uploadArea = document.getElementById('media-upload-area');
        const previewContainer = document.getElementById('media-preview-container');
        const previewImg = document.getElementById('media-preview-img');
        const fileInput = document.getElementById('prompt-media');

        if (uploadArea) uploadArea.style.display = 'block';
        if (previewContainer) previewContainer.style.display = 'none';
        if (previewImg) {
            URL.revokeObjectURL(previewImg.src);
            previewImg.src = '';
        }
        if (fileInput) fileInput.value = '';

        this.currentMediaFile = null;
        this.currentMediaUrl = null;
    }

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

    // 从Supabase Storage删除媒体
    async deleteMediaFromStorage(filePath) {
        try {
            const { error } = await supabase.storage
                .from('media')
                .remove([filePath]);

            if (error) {
                throw error;
            }

            return { success: true };
        } catch (error) {
            console.error('删除媒体失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 显示现有媒体
    showExistingMedia(mediaUrl) {
        const uploadArea = document.getElementById('media-upload-area');
        const previewContainer = document.getElementById('media-preview-container');
        const previewImg = document.getElementById('media-preview-img');

        if (!uploadArea || !previewContainer || !previewImg) return;

        previewImg.src = mediaUrl;
        uploadArea.style.display = 'none';
        previewContainer.style.display = 'block';
    }

    // 从URL提取文件路径
    extractPathFromUrl(url) {
        try {
            // Supabase Storage URL格式: https://xxx.supabase.co/storage/v1/object/public/media/prompts/filename.jpg
            const urlParts = url.split('/storage/v1/object/public/media/');
            return urlParts.length > 1 ? urlParts[1] : null;
        } catch (error) {
            console.error('提取文件路径失败:', error);
            return null;
        }
    }
}

// 全局我的空间管理器实例将在main.js中创建
