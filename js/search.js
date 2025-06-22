// 搜索功能管理
class SearchManager {
    constructor() {
        this.searchHistory = this.loadSearchHistory();
        this.popularTags = [];
        this.init();
    }

    // 初始化
    async init() {
        this.bindEvents();
        await this.loadPopularTags();
        this.renderPopularTags();
    }

    // 绑定事件
    bindEvents() {
        // 搜索输入框事件
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            // 移除搜索建议功能，只保留基本搜索
            // 不再绑定focus、blur和keydown事件
        }

        // 回车搜索
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.id === 'search-input') {
                this.performSearch();
            }
        });
    }

    // 执行搜索
    performSearch(query = null) {
        const searchInput = document.getElementById('search-input');
        const searchQuery = query || (searchInput ? searchInput.value.trim() : '');

        if (searchQuery.length < APP_CONFIG.search.minQueryLength && searchQuery.length > 0) {
            UI.showNotification(`搜索关键词至少需要${APP_CONFIG.search.minQueryLength}个字符`, 'warning');
            return;
        }

        // 保存搜索历史
        if (searchQuery) {
            this.addToSearchHistory(searchQuery);
        }

        // 触发搜索（全文搜索，清空标签过滤）
        if (window.promptsManager) {
            window.promptsManager.currentFilters.search = searchQuery;
            window.promptsManager.currentFilters.tags = []; // 清空标签过滤
            window.promptsManager.currentPage = 1;
            window.promptsManager.loadPrompts();
        }
    }

    // 显示搜索建议 - 已禁用
    // showSearchSuggestions() {
    //     // 功能已移除，改为使用热门标签
    // }

    // 隐藏搜索建议 - 已禁用
    // hideSearchSuggestions() {
    //     // 功能已移除，改为使用热门标签
    // }

    // 生成搜索建议 - 已禁用
    // generateSuggestions(query) {
    //     // 功能已移除，改为使用热门标签
    //     return [];
    // }

    // 绑定建议项事件 - 已禁用
    // bindSuggestionEvents(container) {
    //     // 功能已移除，改为使用热门标签
    // }

    // 处理搜索框键盘事件 - 已禁用
    // handleSearchKeydown(e) {
    //     // 功能已移除，改为使用热门标签
    // }

    // 高亮建议项 - 已禁用
    // highlightSuggestion(suggestions, index) {
    //     // 功能已移除，改为使用热门标签
    // }

    // 加载热门标签
    async loadPopularTags() {
        try {
            // 使用优化的API方法获取热门标签
            const result = await apiManager.getPopularTags(8); // 减少到8个标签

            if (result.success && result.data.length > 0) {
                this.popularTags = result.data;
            } else {
                // 使用默认标签作为后备
                this.popularTags = [
                    { name: '写作', count: 0 },
                    { name: '编程', count: 0 },
                    { name: '营销', count: 0 },
                    { name: 'AI', count: 0 },
                    { name: '创意', count: 0 },
                    { name: '设计', count: 0 }
                ];
            }

            // 重新渲染标签
            this.renderPopularTags();
        } catch (error) {
            console.error('加载热门标签失败:', error);
            // 使用默认标签作为后备
            this.popularTags = [
                { name: '写作', count: 0 },
                { name: '编程', count: 0 },
                { name: '营销', count: 0 },
                { name: 'AI', count: 0 },
                { name: '创意', count: 0 },
                { name: '设计', count: 0 }
            ];

            // 重新渲染标签
            this.renderPopularTags();
        }
    }

    // 渲染热门标签
    renderPopularTags() {
        const container = document.getElementById('popular-tags-container');
        if (!container || !this.popularTags.length) return;

        container.innerHTML = this.popularTags.map(tag => `
            <span class="popular-tag" data-tag="${UI.escapeHtml(tag.name)}" title="点击搜索 ${UI.escapeHtml(tag.name)} 相关提示词">
                ${UI.escapeHtml(tag.name)}
                ${tag.count > 0 ? `<span class="tag-count">(${tag.count})</span>` : ''}
            </span>
        `).join('');

        // 绑定标签点击事件
        this.bindPopularTagEvents(container);
    }

    // 绑定热门标签点击事件
    bindPopularTagEvents(container) {
        container.querySelectorAll('.popular-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const tagName = tag.dataset.tag;
                this.searchByTag(tagName);
            });
        });
    }

    // 按标签搜索
    searchByTag(tagName) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = tagName;
        }

        // 保存搜索历史
        if (tagName) {
            this.addToSearchHistory(tagName);
        }

        // 执行标签搜索（使用标签过滤而不是全文搜索）
        if (window.promptsManager) {
            // 清空其他搜索条件，专注于标签搜索
            window.promptsManager.currentFilters.search = '';
            window.promptsManager.currentFilters.tags = [tagName];
            window.promptsManager.currentPage = 1;
            window.promptsManager.loadPrompts();
        }

        // 添加视觉反馈
        const tagElement = document.querySelector(`[data-tag="${tagName}"]`);
        if (tagElement) {
            tagElement.style.background = 'var(--primary-color)';
            tagElement.style.color = 'white';
            tagElement.style.borderColor = 'var(--primary-color)';

            // 恢复原样式
            setTimeout(() => {
                tagElement.style.background = '';
                tagElement.style.color = '';
                tagElement.style.borderColor = '';
            }, 300);
        }
    }

    // 搜索历史管理
    loadSearchHistory() {
        try {
            const history = localStorage.getItem('search_history');
            this.searchHistory = history ? JSON.parse(history) : [];
            return this.searchHistory;
        } catch (error) {
            console.error('加载搜索历史失败:', error);
            this.searchHistory = [];
            return [];
        }
    }

    saveSearchHistory() {
        try {
            localStorage.setItem('search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('保存搜索历史失败:', error);
        }
    }

    addToSearchHistory(query) {
        if (!query || query.length < APP_CONFIG.search.minQueryLength) return;

        // 移除重复项
        this.searchHistory = this.searchHistory.filter(item => item !== query);
        
        // 添加到开头
        this.searchHistory.unshift(query);
        
        // 限制历史记录数量
        this.searchHistory = this.searchHistory.slice(0, 10);
        
        this.saveSearchHistory();
    }

    removeFromSearchHistory(query) {
        this.searchHistory = this.searchHistory.filter(item => item !== query);
        this.saveSearchHistory();
    }

    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
        UI.showNotification('搜索历史已清除', 'success');
    }

    // 高级搜索功能
    performAdvancedSearch(filters) {
        if (window.promptsManager) {
            Object.assign(window.promptsManager.currentFilters, filters);
            window.promptsManager.currentPage = 1;
            window.promptsManager.loadPrompts();
        }
    }

    // 搜索建议样式 - 已禁用
    // injectSearchStyles() {
    //     // 功能已移除，不再需要搜索建议样式
    // }
}

// 创建全局搜索管理器实例
let searchManager;

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    searchManager = new SearchManager();
    // 不再需要注入搜索建议样式
});
