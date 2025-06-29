// UI 工具类
class UI {
    // 显示通知
    static showNotification(message, type = 'info', title = '') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <i class="notification-icon ${iconMap[type] || iconMap.info}"></i>
                <div class="notification-text">
                    ${title ? `<div class="notification-title">${title}</div>` : ''}
                    <div class="notification-message">${message}</div>
                </div>
                <button class="notification-close">&times;</button>
            </div>
        `;

        document.body.appendChild(notification);

        // 显示动画
        setTimeout(() => notification.classList.add('show'), 100);

        // 绑定关闭事件
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.hideNotification(notification));

        // 自动关闭
        setTimeout(() => this.hideNotification(notification), APP_CONFIG.notification.duration);

        return notification;
    }

    // 隐藏通知
    static hideNotification(notification) {
        if (notification && notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    // 显示模态框
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // 绑定关闭事件
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.onclick = () => this.hideModal(modalId);
            }

            // 点击背景关闭
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.hideModal(modalId);
                }
            };
        }
    }

    // 隐藏模态框
    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // 显示加载状态
    static showLoading(containerId = 'loading') {
        const loading = document.getElementById(containerId);
        if (loading) {
            loading.style.display = 'flex';
        }
    }

    // 隐藏加载状态
    static hideLoading(containerId = 'loading') {
        const loading = document.getElementById(containerId);
        if (loading) {
            loading.style.display = 'none';
        }
    }

    // 切换页面
    static showPage(pageId) {
        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // 显示目标页面
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // 更新导航状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-page="${pageId.replace('-page', '')}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // 页面切换后滚动到顶部
        this.scrollToTop();
    }

    // 创建提示词卡片
    static createPromptCard(prompt, viewMode = 'card') {
        // 点赞和收藏功能已移除

        const card = document.createElement('div');
        card.className = 'prompt-card';
        card.dataset.promptId = prompt.prompt_id;

        // 处理分类信息
        const categoryInfo = prompt.categories || {};
        const categoryName = categoryInfo.name || prompt.category_name || '未分类';
        const categoryColor = categoryInfo.color || '#4f46e5';
        const categoryIcon = categoryInfo.icon || 'fas fa-folder';

        const authorName = prompt.author_name || '匿名用户';
        const authorAvatar = prompt.author_avatar || APP_CONFIG.defaultAvatar;

        card.innerHTML = `
            <div class="prompt-card-header">
                <h3 class="prompt-card-title">${this.escapeHtml(prompt.title)}</h3>
                ${prompt.orig_auth ? `
                    <div class="prompt-card-orig-auth">
                        <i class="fas fa-user-edit"></i>
                        <span>原作者：${this.escapeHtml(prompt.orig_auth)}</span>
                    </div>
                ` : ''}
                <p class="prompt-card-description">${this.escapeHtml(prompt.description || '')}</p>
                <div class="prompt-card-meta">
                    <span class="prompt-card-category" style="background-color: ${categoryColor} !important">
                        <i class="${categoryIcon}"></i>
                        ${this.escapeHtml(categoryName)}
                    </span>
                    <span class="prompt-author">
                        <img src="${authorAvatar}" alt="${authorName}" style="width: 16px; height: 16px; border-radius: 50%; margin-right: 4px;">
                        ${this.escapeHtml(authorName)}
                    </span>
                    <span>${this.formatDate(prompt.created_at)}</span>
                </div>
                ${prompt.tags && prompt.tags.length > 0 ? `
                    <div class="tags">
                        ${prompt.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="prompt-card-stats">
                <span class="prompt-stat">
                    <i class="fas fa-eye"></i>
                    ${this.formatNumber(prompt.view_count || 0)}
                </span>
                <span class="prompt-stat">
                    <i class="fas fa-copy"></i>
                    ${this.formatNumber(prompt.use_count || 0)}
                </span>
                <span class="prompt-stat">
                    <i class="fas fa-heart"></i>
                    ${this.formatNumber(prompt.like_count || 0)}
                </span>
                <!-- 评分功能暂时隐藏
                <span class="prompt-stat">
                    <i class="fas fa-star"></i>
                    ${prompt.rating_average ? prompt.rating_average.toFixed(1) : '0.0'}
                </span>
                -->
            </div>
            <div class="prompt-card-actions">
                <button class="btn view-prompt-btn">
                    <i class="fas fa-eye"></i>
                    查看
                </button>
                <!-- 点赞和收藏按钮已移除 -->
            </div>
        `;

        // 绑定事件
        this.bindPromptCardEvents(card, prompt);

        return card;
    }

    // 绑定提示词卡片事件
    static bindPromptCardEvents(card, prompt) {
        // 查看详情按钮
        const viewBtn = card.querySelector('.view-prompt-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止事件冒泡
                window.promptsManager.showPromptDetail(prompt.prompt_id, 'home-page');
            });
        }

        // 卡片标题点击事件
        const cardTitle = card.querySelector('.prompt-card-title');
        if (cardTitle) {
            cardTitle.addEventListener('click', (e) => {
                e.stopPropagation();
                window.promptsManager.showPromptDetail(prompt.prompt_id, 'home-page');
            });

            // 添加鼠标悬浮效果
            cardTitle.style.cursor = 'pointer';
            cardTitle.style.transition = 'color 0.2s ease';
        }

        // 卡片内容区域点击事件（使用header区域）
        const cardHeader = card.querySelector('.prompt-card-header');
        if (cardHeader) {
            cardHeader.addEventListener('click', (e) => {
                // 如果点击的是按钮或链接，不触发卡片点击
                if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.prompt-card-actions')) {
                    return;
                }
                window.promptsManager.showPromptDetail(prompt.prompt_id, 'home-page');
            });

            // 添加鼠标悬浮效果
            cardHeader.style.cursor = 'pointer';
        }

        // 点赞和收藏功能已移除
    }

    // 创建分页控件
    static createPagination(pagination, onPageChange, containerId = 'pagination') {
        const { page, totalPages, total, pageSize } = pagination;
        const paginationContainer = document.getElementById(containerId);

        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        let html = '';

        // 上一页
        html += `
            <button ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">
                <i class="fas fa-chevron-left"></i>
                上一页
            </button>
        `;

        // 页码
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);

        if (startPage > 1) {
            html += `<button data-page="1">1</button>`;
            if (startPage > 2) {
                html += `<span>...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button ${i === page ? 'class="active"' : ''} data-page="${i}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span>...</span>`;
            }
            html += `<button data-page="${totalPages}">${totalPages}</button>`;
        }

        // 下一页
        html += `
            <button ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">
                下一页
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        // 添加总条数信息
        const startItem = (page - 1) * pageSize + 1;
        const endItem = Math.min(page * pageSize, total);
        html += `
            <div class="pagination-info">
                <span class="pagination-stats">
                    显示第 ${startItem}-${endItem} 条，共 ${total} 条提示词
                </span>
            </div>
        `;

        paginationContainer.innerHTML = html;

        // 绑定事件
        paginationContainer.querySelectorAll('button[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPage = parseInt(btn.dataset.page);
                if (targetPage !== page && !btn.disabled) {
                    onPageChange(targetPage);
                }
            });
        });
    }

    // 工具方法
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return '今天';
        } else if (days === 1) {
            return '昨天';
        } else if (days < 7) {
            return `${days}天前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }

    // 创建空状态
    static createEmptyState(message, icon = 'fas fa-inbox') {
        return `
            <div class="empty-state">
                <i class="${icon}"></i>
                <h3>暂无内容</h3>
                <p>${message}</p>
            </div>
        `;
    }

    // 显示使用手册
    static showUserManual() {
        this.showModal('user-manual-modal');
    }

    // 显示个人资料编辑
    static showProfileEdit() {
        if (!authManager.isAuthenticated()) {
            this.showNotification('请先登录', 'warning');
            return;
        }

        // 获取当前用户信息并填充表单
        const currentUser = authManager.getCurrentUser();
        if (currentUser) {
            document.getElementById('profile-username').value = currentUser.username || '';
            document.getElementById('profile-bio').value = currentUser.bio || '';
        }

        this.showModal('profile-edit-modal');
    }

    // 滚动到页面顶部
    static scrollToTop() {
        try {
            // 多种方式确保滚动到顶部
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;

            // 如果有主内容区域，也滚动到顶部
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.scrollTop = 0;
            }

            // 确保所有活动页面容器也滚动到顶部
            const activePages = document.querySelectorAll('.page.active');
            activePages.forEach(page => {
                page.scrollTop = 0;
            });

            // 延迟再次确保滚动到顶部（处理异步内容加载）
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 50);

            console.log('✅ 页面已滚动到顶部');
        } catch (error) {
            console.error('滚动到顶部失败:', error);
        }
    }

}
