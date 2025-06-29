// 提示词管理
class PromptsManager {
    constructor() {
        this.currentPage = 1;
        this.currentFilters = {
            search: '',
            category: '',
            tags: [], // 添加标签过滤支持
            sortBy: 'created_at',
            sortOrder: 'desc'
        };
        this.viewMode = 'card';
        // 用户交互功能已移除
        this.previousPage = 'home-page'; // 记录来源页面，默认为首页
        this.subscription = null; // 实时订阅对象
        this.currentPrompts = []; // 当前显示的提示词列表
        // init() 将由外部调用
    }

    // 初始化
    async init() {
        try {
            console.log('🎯 PromptsManager 开始初始化...');

            console.log('📡 绑定事件...');
            this.bindEvents();
            console.log('✅ 事件绑定完成');

            console.log('📂 加载分类数据...');
            await this.loadCategories();
            console.log('✅ 分类数据加载完成');

            console.log('🏷️ 加载网站标题...');
            await this.loadWebTitle();
            console.log('✅ 网站标题加载完成');

            console.log('📝 加载提示词数据...');
            await this.loadPrompts();
            console.log('✅ 提示词数据加载完成');

            console.log('📡 设置实时订阅...');
            this.setupRealtimeSubscription();
            console.log('✅ 实时订阅设置完成');

            console.log('🎉 PromptsManager 初始化完成');
        } catch (error) {
            console.error('❌ PromptsManager 初始化失败:', error);
            console.error('错误详情:', error.stack);
            UI.showNotification('提示词管理器初始化失败: ' + error.message, 'error');
            throw error; // 重新抛出错误，让上层处理
        }
    }

    // 绑定事件
    bindEvents() {
        // 搜索
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value;
                    this.currentFilters.tags = []; // 清空标签过滤
                    this.currentPage = 1;
                    this.loadPrompts();
                }, APP_CONFIG.search.debounceDelay);
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.currentFilters.search = searchInput.value;
                this.currentFilters.tags = []; // 清空标签过滤
                this.currentPage = 1;
                this.loadPrompts();
            });
        }

        // 分类过滤
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.currentFilters.tags = []; // 清空标签过滤
                this.currentPage = 1;
                this.loadPrompts();
            });
        }

        // 排序
        const sortFilter = document.getElementById('sort-filter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.currentFilters.sortBy = e.target.value;
                // 排序不清空标签过滤，允许在标签搜索结果中排序
                this.currentPage = 1;
                this.loadPrompts();
            });
        }

        // 视图切换
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.viewMode = btn.dataset.view;
                this.updateViewMode();
            });
        });

        // 监听认证状态变化
        authManager.onAuthStateChange(() => {
            this.loadPrompts();
        });
    }

    // 加载分类
    async loadCategories() {
        const result = await apiManager.getCategories();
        if (result.success) {
            this.renderCategories(result.data);
        }
    }

    // 渲染分类选项
    renderCategories(categories) {
        const categoryFilter = document.getElementById('category-filter');
        if (!categoryFilter) return;

        categoryFilter.innerHTML = '<option value="">全部分类</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.category_id;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });
    }

    // 加载网站标题
    async loadWebTitle() {
        try {
            const result = await apiManager.getWebTitle();
            if (result.success && result.data) {
                this.updateWebTitle(result.data);
            }
        } catch (error) {
            console.error('加载网站标题失败:', error);
            // 使用默认标题，不影响其他功能
        }
    }

    // 更新网站标题
    updateWebTitle(titleData) {
        const mainTitle = document.getElementById('main-title');
        const subTitle = document.getElementById('sub-title');

        if (mainTitle && titleData.main_title) {
            mainTitle.textContent = titleData.main_title;
        }

        if (subTitle && titleData.sub_title) {
            subTitle.textContent = titleData.sub_title;
        }

        // 同时更新页面标题
        if (titleData.main_title) {
            document.title = `AI提示词宝库 - ${titleData.main_title}`;
        }

        // 更新meta描述
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription && titleData.sub_title) {
            metaDescription.setAttribute('content', `${titleData.main_title}，${titleData.sub_title}`);
        }
    }

    // 加载提示词
    async loadPrompts() {
        UI.showLoading();

        try {
            const result = await apiManager.getPrompts({
                page: this.currentPage,
                ...this.currentFilters
            });

            if (result.success) {
                // 先渲染提示词，提升用户体验
                this.renderPrompts(result.data);
                UI.createPagination(result.pagination, (page) => {
                    this.currentPage = page;
                    this.loadPrompts();
                });

                // 点赞和收藏功能已移除，不再需要加载用户交互状态
            } else {
                UI.showNotification(result.error || '加载失败', 'error');
                this.renderPrompts([]);
            }
        } catch (error) {
            console.error('加载提示词失败:', error);
            UI.showNotification('加载失败', 'error');
            this.renderPrompts([]);
        } finally {
            UI.hideLoading();
        }
    }

    // 用户交互功能已移除

    // 交互按钮功能已移除

    // 渲染提示词列表
    renderPrompts(prompts) {
        const container = document.getElementById('prompts-container');
        if (!container) return;

        // 保存当前提示词列表，用于实时更新
        this.currentPrompts = prompts;

        if (prompts.length === 0) {
            let emptyMessage = '暂无提示词';
            if (this.currentFilters.search) {
                emptyMessage = `没有找到包含"${this.currentFilters.search}"的提示词`;
            } else if (this.currentFilters.tags.length > 0) {
                emptyMessage = `没有找到标签为"${this.currentFilters.tags[0]}"的提示词`;
            }

            container.innerHTML = UI.createEmptyState(emptyMessage);
            return;
        }

        container.innerHTML = '';
        prompts.forEach(prompt => {
            const card = UI.createPromptCard(prompt, this.viewMode);
            container.appendChild(card);
        });

        this.updateViewMode();
    }

    // 更新视图模式
    updateViewMode() {
        const container = document.getElementById('prompts-container');
        if (!container) return;

        container.className = `prompts-grid ${this.viewMode}-view`;
    }

    // 显示提示词详情
    async showPromptDetail(promptId, fromPage = null) {
        // 记录来源页面
        if (fromPage) {
            this.previousPage = fromPage;
        } else {
            // 如果没有指定来源页面，根据当前页面自动判断
            const currentPageElement = document.querySelector('.page.active');
            if (currentPageElement) {
                this.previousPage = currentPageElement.id;
            }
        }

        UI.showLoading();

        try {
            const result = await apiManager.getPrompt(promptId);
            if (result.success && result.data) {
                this.renderPromptDetail(result.data);
                UI.showPage('prompt-detail-page');

                // 确保页面滚动到顶部，解决上下晃动问题
                // 使用多重延迟确保页面完全渲染后再滚动
                setTimeout(() => {
                    UI.scrollToTop();
                }, 10);

                setTimeout(() => {
                    UI.scrollToTop();
                    // 额外确保详情页面容器滚动到顶部
                    const detailPage = document.getElementById('prompt-detail-page');
                    if (detailPage) {
                        detailPage.scrollTop = 0;
                    }
                }, 100);

                // 记录查看日志
                await apiManager.logUsage(promptId, 'view');
            } else {
                console.error('获取提示词详情失败:', result.error);
                UI.showNotification(result.error || '提示词不存在或已被删除', 'error');

                // 返回到来源页面
                this.goBack();
            }
        } catch (error) {
            console.error('加载提示词详情失败:', error);
            UI.showNotification('加载详情失败: ' + error.message, 'error');

            // 返回到来源页面
            this.goBack();
        } finally {
            UI.hideLoading();
        }
    }

    // 渲染提示词详情
    renderPromptDetail(prompt) {
        const container = document.getElementById('prompt-detail-content');
        if (!container) return;

        const categoryColor = '#4f46e5'; // 使用默认颜色
        const authorName = prompt.author_name || '匿名用户';
        const authorAvatar = prompt.author_avatar || APP_CONFIG.defaultAvatar;
        const authorBio = prompt.author_bio || ''; // 显示用户的个人简介

        container.innerHTML = `
            <div class="prompt-detail">
                <div class="prompt-detail-header">
                    <button class="btn btn-outline" onclick="promptsManager.goBack()">
                        <i class="fas fa-arrow-left"></i>
                        返回
                    </button>
                </div>
                
                <div class="prompt-detail-main">
                    <div class="prompt-detail-content">
                        <div class="prompt-meta">
                            <span class="prompt-category" style="background-color: ${categoryColor}">
                                <i class="fas fa-tag"></i>
                                ${UI.escapeHtml(prompt.category_name || '未分类')}
                            </span>
                            <span class="prompt-date">${UI.formatDate(prompt.created_at)}</span>
                        </div>
                        
                        <h1 class="prompt-title">${UI.escapeHtml(prompt.title)}</h1>

                        ${prompt.orig_auth ? `
                            <div class="prompt-orig-auth">
                                <i class="fas fa-user-edit"></i>
                                <span>原作者：${UI.escapeHtml(prompt.orig_auth)}</span>
                            </div>
                        ` : ''}

                        ${prompt.description ? `
                            <p class="prompt-description">${UI.escapeHtml(prompt.description)}</p>
                        ` : ''}
                        
                        <div class="prompt-stats-detail">
                            <div class="stat-item">
                                <i class="fas fa-eye"></i>
                                <span>浏览 ${UI.formatNumber(prompt.view_count || 0)}</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-copy"></i>
                                <span>使用 ${UI.formatNumber(prompt.use_count || 0)}</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-heart"></i>
                                <span>点赞 ${UI.formatNumber(prompt.like_count || 0)}</span>
                            </div>
                            <!-- 评分功能暂时隐藏
                            <div class="stat-item">
                                <i class="fas fa-star"></i>
                                <span>评分 ${prompt.rating_average ? prompt.rating_average.toFixed(1) : '0.0'}</span>
                            </div>
                            -->
                        </div>
                        
                        ${prompt.tags && prompt.tags.length > 0 ? `
                            <div class="prompt-tags">
                                ${prompt.tags.map(tag => `<span class="tag">${UI.escapeHtml(tag)}</span>`).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="prompt-content-section">
                            <h3>提示词内容</h3>
                            <div class="prompt-content">
                                <pre>${UI.escapeHtml(prompt.content)}</pre>
                                <button class="btn btn-primary copy-btn" data-content="${UI.escapeHtml(prompt.content)}">
                                    <i class="fas fa-copy"></i>
                                    复制提示词
                                </button>
                            </div>
                        </div>

                        ${prompt.model_name ? `
                            <div class="prompt-model-section">
                                <h3>使用模型</h3>
                                <div class="prompt-model">
                                    <span class="model-badge">
                                        <i class="fas fa-robot"></i>
                                        ${UI.escapeHtml(prompt.model_name)}
                                    </span>
                                </div>
                            </div>
                        ` : ''}

                        ${prompt.output_text ? `
                            <div class="prompt-output-section">
                                <h3>参考输出</h3>
                                <div class="prompt-output">
                                    <div class="output-content">
                                        ${UI.escapeHtml(prompt.output_text)}
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        ${prompt.output_media ? `
                            <div class="prompt-media-section">
                                <h3>参考图片</h3>
                                <div class="prompt-media">
                                    <div class="media-container">
                                        <img src="${prompt.output_media}" alt="参考图片" class="reference-image" onclick="this.requestFullscreen()">
                                        <div class="media-actions">
                                            <button class="btn btn-outline btn-sm" onclick="window.open('${prompt.output_media}', '_blank')">
                                                <i class="fas fa-external-link-alt"></i>
                                                查看原图
                                            </button>
                                            <button class="btn btn-outline btn-sm" onclick="promptsManager.downloadImage('${prompt.output_media}', '${UI.escapeHtml(prompt.title)}_参考图片')">
                                                <i class="fas fa-download"></i>
                                                下载图片
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="prompt-detail-sidebar">
                        <div class="author-card">
                            <img src="${authorAvatar}" alt="${authorName}" class="author-avatar">
                            <div class="author-info">
                                <h4 class="author-name">${UI.escapeHtml(authorName)}</h4>
                                ${authorBio ? `<p class="author-bio">${UI.escapeHtml(authorBio)}</p>` : ''}
                            </div>
                        </div>
                        
                        <div class="prompt-actions">
                            <button class="btn btn-primary btn-full like-btn" data-prompt-id="${prompt.prompt_id}" id="detail-like-btn">
                                <i class="fas fa-heart"></i>
                                点赞
                            </button>
                            <button class="btn btn-outline btn-full favorite-btn" data-prompt-id="${prompt.prompt_id}" id="detail-favorite-btn">
                                <i class="fas fa-bookmark"></i>
                                收藏
                            </button>
                            <button class="btn btn-outline btn-full use-btn" data-prompt-id="${prompt.prompt_id}">
                                <i class="fas fa-play"></i>
                                使用提示词
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 绑定详情页事件
        this.bindDetailEvents(prompt);

        // 更新按钮状态
        this.updateDetailButtonStates(prompt.prompt_id);
    }

    // 更新详情页按钮状态
    updateDetailButtonStates(promptId) {
        const likeBtn = document.getElementById('detail-like-btn');
        const favoriteBtn = document.getElementById('detail-favorite-btn');

        // 统一从服务器获取状态（包括匿名用户）
        apiManager.getUserInteractions([promptId]).then(result => {
            if (result.success) {
                const { likes, favorites } = result.data;

                if (likeBtn) {
                    const isLiked = likes.includes(promptId);
                    likeBtn.classList.toggle('liked', isLiked);
                    likeBtn.innerHTML = `
                        <i class="fas fa-heart"></i>
                        ${isLiked ? '已赞' : '点赞'}
                    `;
                }

                if (favoriteBtn) {
                    const isFavorited = favorites.includes(promptId);
                    favoriteBtn.classList.toggle('favorited', isFavorited);
                    favoriteBtn.innerHTML = `
                        <i class="fas fa-bookmark"></i>
                        ${isFavorited ? '已藏' : '收藏'}
                    `;
                }
            }
        }).catch(error => {
            console.error('获取用户交互状态失败:', error);
        });
    }

    // 绑定详情页事件
    bindDetailEvents(prompt) {
        const container = document.getElementById('prompt-detail-content');

        // 复制按钮
        const copyBtn = container.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(prompt.content);
                    UI.showNotification('提示词已复制到剪贴板', 'success');
                    
                    // 记录使用日志
                    await apiManager.logUsage(prompt.prompt_id, 'copy');
                } catch (error) {
                    console.error('复制失败:', error);
                    UI.showNotification('复制失败', 'error');
                }
            });
        }

        // 点赞按钮
        const likeBtn = container.querySelector('.like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', async () => {
                const result = await apiManager.toggleLike(prompt.prompt_id);
                if (result.success) {
                    likeBtn.innerHTML = `
                        <i class="fas fa-heart"></i>
                        ${result.liked ? '已赞' : '点赞'}
                    `;
                    likeBtn.classList.toggle('liked', result.liked);
                } else {
                    UI.showNotification(result.error || '操作失败', 'error');
                }
            });
        }

        // 收藏按钮
        const favoriteBtn = container.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', async () => {
                if (!authManager.requireAuth('收藏')) return;

                const result = await apiManager.toggleFavorite(prompt.prompt_id);
                if (result.success) {
                    favoriteBtn.innerHTML = `
                        <i class="fas fa-bookmark"></i>
                        ${result.favorited ? '已收藏' : '收藏'}
                    `;
                    favoriteBtn.classList.toggle('favorited', result.favorited);
                } else {
                    UI.showNotification(result.error || '操作失败', 'error');
                }
            });
        }

        // 使用按钮
        const useBtn = container.querySelector('.use-btn');
        if (useBtn) {
            useBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(prompt.content);
                    UI.showNotification('提示词已复制，可以在AI工具中使用', 'success');
                    
                    // 记录使用日志
                    await apiManager.logUsage(prompt.prompt_id, 'use');
                } catch (error) {
                    console.error('复制失败:', error);
                    UI.showNotification('复制失败', 'error');
                }
            });
        }
    }

    // 返回上一页
    goBack() {
        console.log('返回上一页:', this.previousPage);

        // 从页面ID中提取页面名称（移除'-page'后缀）
        const pageId = this.previousPage.replace('-page', '');

        // 使用main.showPage()来确保触发页面初始化逻辑
        if (window.main && typeof window.main.showPage === 'function') {
            window.main.showPage(pageId);
        } else {
            // 备用方案：直接切换页面并手动触发初始化
            UI.showPage(this.previousPage);
            this.triggerPageInit(pageId);
        }
    }

    // 手动触发页面初始化（备用方案）
    triggerPageInit(pageId) {
        console.log('手动触发页面初始化:', pageId);

        switch (pageId) {
            case 'my-space':
                if (authManager.isAuthenticated() && window.mySpaceManager) {
                    console.log('触发我的空间页面初始化');
                    // 确保标签页状态正确
                    window.mySpaceManager.ensureDefaultTabState();
                    // 加载当前标签页数据
                    window.mySpaceManager.loadCurrentTabData();
                }
                break;
            case 'home':
                // 首页通常不需要特殊初始化
                break;
        }
    }

    // 下载图片
    async downloadImage(imageUrl, filename) {
        try {
            UI.showNotification('正在下载图片...', 'info');

            const response = await fetch(imageUrl);
            const blob = await response.blob();

            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename + '.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            UI.showNotification('图片下载成功', 'success');
        } catch (error) {
            console.error('下载图片失败:', error);
            UI.showNotification('下载失败', 'error');
        }
    }

    // 重复的goBack方法已移除

    // 设置实时订阅
    setupRealtimeSubscription() {
        try {
            console.log('🔄 开始设置实时订阅...');

            // 检查Supabase是否可用
            if (!window.supabase) {
                console.error('❌ Supabase未初始化');
                return;
            }

            // 如果已有订阅，先取消
            if (this.subscription) {
                console.log('🔄 取消现有订阅...');
                this.subscription.unsubscribe();
            }

            // 订阅prompts表的变化
            console.log('📡 创建新的订阅通道...');
            this.subscription = supabase
                .channel('prompts_changes')
                .on('postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'prompts'
                    },
                    (payload) => {
                        console.log('📡 收到实时更新:', payload);
                        this.handleRealtimeUpdate(payload);
                    }
                )
                .subscribe((status) => {
                    console.log('📡 订阅状态变化:', status);
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Prompts实时订阅已建立');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ Prompts实时订阅失败');
                    } else if (status === 'TIMED_OUT') {
                        console.warn('⚠️ Prompts实时订阅超时，尝试重连...');
                        // 延迟重试
                        setTimeout(() => {
                            this.setupRealtimeSubscription();
                        }, 5000);
                    } else if (status === 'CLOSED') {
                        console.warn('⚠️ Prompts实时订阅已关闭');
                    }
                });

            console.log('📡 订阅设置完成，等待连接...');

        } catch (error) {
            console.error('❌ 设置实时订阅失败:', error);
        }
    }

    // 处理实时更新
    handleRealtimeUpdate(payload) {
        console.log('📡 收到实时更新:', payload);

        const { eventType, new: newRecord, old: oldRecord } = payload;

        try {
            switch (eventType) {
                case 'INSERT':
                    this.handlePromptInsert(newRecord);
                    break;
                case 'UPDATE':
                    this.handlePromptUpdate(newRecord, oldRecord);
                    break;
                case 'DELETE':
                    this.handlePromptDelete(oldRecord);
                    break;
                default:
                    console.log('未知的事件类型:', eventType);
            }
        } catch (error) {
            console.error('处理实时更新失败:', error);
        }
    }

    // 处理新增提示词
    handlePromptInsert(newPrompt) {
        // 检查新提示词是否符合当前过滤条件
        if (!this.shouldShowPrompt(newPrompt)) {
            return;
        }

        // 如果是第一页且按创建时间排序，将新提示词添加到列表开头
        if (this.currentPage === 1 && this.currentFilters.sortBy === 'created_at' && this.currentFilters.sortOrder === 'desc') {
            // 获取完整的提示词数据（包含关联信息）
            this.fetchAndPrependPrompt(newPrompt.prompt_id);
        } else {
            // 其他情况显示通知，让用户选择是否刷新
            this.showUpdateNotification('有新的提示词发布', 'new');
        }
    }

    // 处理提示词更新
    handlePromptUpdate(updatedPrompt, oldPrompt) {
        // 查找当前列表中的提示词
        const promptIndex = this.currentPrompts.findIndex(p => p.prompt_id === updatedPrompt.prompt_id);

        if (promptIndex !== -1) {
            // 检查更新后的提示词是否仍符合过滤条件
            if (this.shouldShowPrompt(updatedPrompt)) {
                // 更新列表中的数据
                this.updatePromptInList(updatedPrompt, promptIndex);
            } else {
                // 不再符合条件，从列表中移除
                this.removePromptFromList(promptIndex);
            }
        } else {
            // 当前列表中没有这个提示词，检查是否应该添加
            if (this.shouldShowPrompt(updatedPrompt)) {
                this.showUpdateNotification('有提示词更新可能影响当前列表', 'update');
            }
        }
    }

    // 处理提示词删除
    handlePromptDelete(deletedPrompt) {
        const promptIndex = this.currentPrompts.findIndex(p => p.prompt_id === deletedPrompt.prompt_id);

        if (promptIndex !== -1) {
            this.removePromptFromList(promptIndex);
            this.showUpdateNotification('有提示词被删除', 'delete');
        }
    }

    // 检查提示词是否应该显示在当前列表中
    shouldShowPrompt(prompt) {
        // 检查状态和可见性
        if (prompt.status !== 'published' || !prompt.is_public) {
            return false;
        }

        // 检查分类过滤
        if (this.currentFilters.category && prompt.category_id !== parseInt(this.currentFilters.category)) {
            return false;
        }

        // 检查标签过滤
        if (this.currentFilters.tags.length > 0) {
            const promptTags = prompt.tags || [];
            const hasMatchingTag = this.currentFilters.tags.some(tag => promptTags.includes(tag));
            if (!hasMatchingTag) {
                return false;
            }
        }

        // 检查搜索过滤（简单检查，实际的全文搜索在服务端进行）
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            const title = (prompt.title || '').toLowerCase();
            const description = (prompt.description || '').toLowerCase();
            const content = (prompt.content || '').toLowerCase();

            if (!title.includes(searchTerm) && !description.includes(searchTerm) && !content.includes(searchTerm)) {
                return false;
            }
        }

        return true;
    }

    // 获取并添加新提示词到列表开头
    async fetchAndPrependPrompt(promptId) {
        try {
            const result = await apiManager.getPrompt(promptId);
            if (result.success && result.data) {
                // 添加到当前列表开头
                this.currentPrompts.unshift(result.data);

                // 重新渲染列表
                this.renderPrompts(this.currentPrompts);

                // 显示通知
                this.showUpdateNotification('新提示词已添加到列表', 'success');
            }
        } catch (error) {
            console.error('获取新提示词失败:', error);
        }
    }

    // 更新列表中的提示词
    async updatePromptInList(updatedPrompt, index) {
        try {
            // 获取完整的提示词数据
            const result = await apiManager.getPrompt(updatedPrompt.prompt_id);
            if (result.success && result.data) {
                // 更新列表中的数据
                this.currentPrompts[index] = result.data;

                // 重新渲染列表
                this.renderPrompts(this.currentPrompts);

                // 显示通知
                this.showUpdateNotification('提示词已更新', 'info');
            }
        } catch (error) {
            console.error('更新提示词失败:', error);
        }
    }

    // 从列表中移除提示词
    removePromptFromList(index) {
        this.currentPrompts.splice(index, 1);
        this.renderPrompts(this.currentPrompts);
    }

    // 显示更新通知
    showUpdateNotification(message, type = 'info') {
        // 创建带刷新按钮的通知
        const notification = document.createElement('div');
        notification.className = `notification ${type} realtime-notification`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="btn btn-sm btn-outline" onclick="promptsManager.refreshPrompts()">
                    <i class="fas fa-refresh"></i>
                    刷新
                </button>
            </div>
        `;

        // 添加到页面顶部
        const container = document.querySelector('.prompts-section') || document.body;
        container.insertBefore(notification, container.firstChild);

        // 5秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // 刷新提示词列表
    async refreshPrompts() {
        // 移除所有实时通知
        document.querySelectorAll('.realtime-notification').forEach(el => el.remove());

        // 重新加载提示词
        await this.loadPrompts();

        UI.showNotification('列表已刷新', 'success');
    }

    // 清理订阅
    cleanup() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
            console.log('✅ Prompts实时订阅已清理');
        }
    }

    // 滚动到页面顶部，聚焦显示标题
    scrollToTop() {
        try {
            // 立即滚动到页面顶部（无动画，确保快速响应）
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;

            // 确保页面容器也滚动到顶部
            const detailPage = document.getElementById('prompt-detail-page');
            if (detailPage) {
                detailPage.scrollTop = 0;
            }

            const detailContent = document.getElementById('prompt-detail-content');
            if (detailContent) {
                detailContent.scrollTop = 0;
            }

            // 延迟一点再次确保滚动到顶部并聚焦标题（处理DOM更新的情况）
            setTimeout(() => {
                // 再次确保滚动到顶部
                window.scrollTo(0, 0);

                // 尝试聚焦到标题元素
                const titleElement = document.querySelector('.prompt-detail .prompt-title');
                if (titleElement) {
                    // 使用scrollIntoView确保标题可见
                    titleElement.scrollIntoView({
                        behavior: 'auto',  // 使用auto而不是smooth，确保立即显示
                        block: 'start',
                        inline: 'nearest'
                    });

                    // 添加一个临时的高亮效果，让用户知道焦点在标题上
                    titleElement.style.transition = 'background-color 0.3s ease';
                    titleElement.style.backgroundColor = 'var(--primary-50)';
                    setTimeout(() => {
                        titleElement.style.backgroundColor = '';
                    }, 1000);

                    console.log('✅ 已聚焦到提示词标题');
                } else {
                    console.warn('未找到提示词标题元素');
                }
            }, 150);

            console.log('✅ 提示词详情页面已滚动到顶部');
        } catch (error) {
            console.error('滚动到顶部失败:', error);
        }
    }
}

// 创建全局提示词管理器实例
window.promptsManager = null;
