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
        this.userInteractions = { likes: [], favorites: [] };
        this.previousPage = 'home-page'; // 记录来源页面，默认为首页
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

            console.log('📝 加载提示词数据...');
            await this.loadPrompts();
            console.log('✅ 提示词数据加载完成');

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

                // 异步加载用户交互状态，不阻塞主要内容显示
                if (authManager.isAuthenticated() && result.data.length > 0) {
                    this.loadUserInteractionsAsync(result.data);
                }
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

    // 异步加载用户交互状态
    async loadUserInteractionsAsync(prompts) {
        try {
            const promptIds = prompts.map(p => p.prompt_id);
            const interactionsResult = await apiManager.getUserInteractions(promptIds);

            if (interactionsResult.success) {
                this.userInteractions = interactionsResult.data;
                // 更新已渲染的按钮状态
                this.updateInteractionButtons();
            }
        } catch (error) {
            console.error('加载用户交互状态失败:', error);
            // 不显示错误通知，因为这不是关键功能
        }
    }

    // 更新交互按钮状态
    updateInteractionButtons() {
        if (!this.userInteractions) return;

        const { likes, favorites } = this.userInteractions;

        // 更新点赞按钮
        likes.forEach(promptId => {
            const likeBtn = document.querySelector(`[data-prompt-id="${promptId}"] .like-btn`);
            if (likeBtn) {
                likeBtn.classList.add('active');
                likeBtn.querySelector('i').className = 'fas fa-heart';
            }
        });

        // 更新收藏按钮
        favorites.forEach(promptId => {
            const favoriteBtn = document.querySelector(`[data-prompt-id="${promptId}"] .favorite-btn`);
            if (favoriteBtn) {
                favoriteBtn.classList.add('active');
                favoriteBtn.querySelector('i').className = 'fas fa-bookmark';
            }
        });
    }

    // 渲染提示词列表
    renderPrompts(prompts) {
        const container = document.getElementById('prompts-container');
        if (!container) return;

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
            const card = UI.createPromptCard(prompt, this.viewMode, this.userInteractions);
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
        const authorBio = ''; // 暂时不显示个人简介

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
                            <div class="stat-item">
                                <i class="fas fa-star"></i>
                                <span>评分 ${prompt.rating_average ? prompt.rating_average.toFixed(1) : '0.0'}</span>
                            </div>
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
                            <button class="btn btn-primary btn-full like-btn" data-prompt-id="${prompt.prompt_id}">
                                <i class="fas fa-heart"></i>
                                点赞
                            </button>
                            <button class="btn btn-outline btn-full favorite-btn" data-prompt-id="${prompt.prompt_id}">
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
                if (!authManager.requireAuth('点赞')) return;

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
        UI.showPage(this.previousPage);
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
}

// 创建全局提示词管理器实例
window.promptsManager = null;
