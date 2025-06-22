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
    }

    // 绑定事件
    bindEvents() {
        // 搜索输入框事件
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            // 搜索建议
            searchInput.addEventListener('focus', () => {
                this.showSearchSuggestions();
            });

            searchInput.addEventListener('blur', () => {
                // 延迟隐藏，允许点击建议项
                setTimeout(() => this.hideSearchSuggestions(), 200);
            });

            // 键盘导航
            searchInput.addEventListener('keydown', (e) => {
                this.handleSearchKeydown(e);
            });
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

        // 触发搜索
        if (window.promptsManager) {
            window.promptsManager.currentFilters.search = searchQuery;
            window.promptsManager.currentPage = 1;
            window.promptsManager.loadPrompts();
        }

        this.hideSearchSuggestions();
    }

    // 显示搜索建议
    showSearchSuggestions() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;

        // 创建建议容器
        let suggestionsContainer = document.getElementById('search-suggestions');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'search-suggestions';
            suggestionsContainer.className = 'search-suggestions';
            searchInput.parentNode.appendChild(suggestionsContainer);
        }

        // 生成建议内容
        const suggestions = this.generateSuggestions(searchInput.value);
        if (suggestions.length === 0) {
            this.hideSearchSuggestions();
            return;
        }

        suggestionsContainer.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" data-type="${suggestion.type}" data-value="${suggestion.value}">
                <i class="${suggestion.icon}"></i>
                <span class="suggestion-text">${UI.escapeHtml(suggestion.text)}</span>
                ${suggestion.type === 'history' ? '<i class="fas fa-times suggestion-remove" data-value="' + suggestion.value + '"></i>' : ''}
            </div>
        `).join('');

        // 绑定建议项事件
        this.bindSuggestionEvents(suggestionsContainer);

        suggestionsContainer.style.display = 'block';
    }

    // 隐藏搜索建议
    hideSearchSuggestions() {
        const suggestionsContainer = document.getElementById('search-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    // 生成搜索建议
    generateSuggestions(query) {
        const suggestions = [];
        const lowerQuery = query.toLowerCase();

        // 搜索历史
        if (this.searchHistory.length > 0) {
            const historyMatches = this.searchHistory
                .filter(item => item.toLowerCase().includes(lowerQuery))
                .slice(0, 3);

            historyMatches.forEach(item => {
                suggestions.push({
                    type: 'history',
                    value: item,
                    text: item,
                    icon: 'fas fa-history'
                });
            });
        }

        // 热门标签
        if (this.popularTags.length > 0) {
            const tagMatches = this.popularTags
                .filter(tag => tag.name.toLowerCase().includes(lowerQuery))
                .slice(0, 3);

            tagMatches.forEach(tag => {
                suggestions.push({
                    type: 'tag',
                    value: tag.name,
                    text: `标签: ${tag.name}`,
                    icon: 'fas fa-tag'
                });
            });
        }

        // 如果没有匹配项且有输入，显示直接搜索选项
        if (suggestions.length === 0 && query.trim()) {
            suggestions.push({
                type: 'direct',
                value: query.trim(),
                text: `搜索 "${query.trim()}"`,
                icon: 'fas fa-search'
            });
        }

        return suggestions;
    }

    // 绑定建议项事件
    bindSuggestionEvents(container) {
        // 点击建议项
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('suggestion-remove')) {
                    // 删除历史记录
                    const value = e.target.dataset.value;
                    this.removeFromSearchHistory(value);
                    this.showSearchSuggestions(); // 刷新建议
                    e.stopPropagation();
                } else {
                    // 执行搜索
                    const value = item.dataset.value;
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) {
                        searchInput.value = value;
                    }
                    this.performSearch(value);
                }
            });
        });
    }

    // 处理搜索框键盘事件
    handleSearchKeydown(e) {
        const suggestionsContainer = document.getElementById('search-suggestions');
        if (!suggestionsContainer || suggestionsContainer.style.display === 'none') {
            return;
        }

        const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');
        let currentIndex = -1;

        // 找到当前选中的建议
        suggestions.forEach((item, index) => {
            if (item.classList.contains('active')) {
                currentIndex = index;
            }
        });

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                currentIndex = Math.min(currentIndex + 1, suggestions.length - 1);
                this.highlightSuggestion(suggestions, currentIndex);
                break;

            case 'ArrowUp':
                e.preventDefault();
                currentIndex = Math.max(currentIndex - 1, -1);
                this.highlightSuggestion(suggestions, currentIndex);
                break;

            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0 && suggestions[currentIndex]) {
                    suggestions[currentIndex].click();
                } else {
                    this.performSearch();
                }
                break;

            case 'Escape':
                this.hideSearchSuggestions();
                break;
        }
    }

    // 高亮建议项
    highlightSuggestion(suggestions, index) {
        suggestions.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });

        // 更新输入框内容
        if (index >= 0 && suggestions[index]) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = suggestions[index].dataset.value;
            }
        }
    }

    // 加载热门标签
    async loadPopularTags() {
        try {
            // 从数据库获取热门标签
            const { data, error } = await supabase
                .from('prompts')
                .select('tags')
                .eq('status', 'published')
                .eq('is_public', true)
                .not('tags', 'is', null);

            if (error) throw error;

            // 统计标签使用频率
            const tagCounts = {};
            data.forEach(prompt => {
                if (prompt.tags && Array.isArray(prompt.tags)) {
                    prompt.tags.forEach(tag => {
                        if (tag && tag.trim()) {
                            const normalizedTag = tag.trim();
                            tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
                        }
                    });
                }
            });

            // 转换为数组并按使用频率排序
            this.popularTags = Object.entries(tagCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10); // 只取前10个热门标签

            // 如果没有标签数据，使用默认标签
            if (this.popularTags.length === 0) {
                this.popularTags = [
                    { name: '写作', count: 0 },
                    { name: '编程', count: 0 },
                    { name: '营销', count: 0 },
                    { name: 'AI', count: 0 },
                    { name: '创意', count: 0 }
                ];
            }
        } catch (error) {
            console.error('加载热门标签失败:', error);
            // 使用默认标签作为后备
            this.popularTags = [
                { name: '写作', count: 0 },
                { name: '编程', count: 0 },
                { name: '营销', count: 0 },
                { name: 'AI', count: 0 },
                { name: '创意', count: 0 }
            ];
        }
    }

    // 搜索历史管理
    loadSearchHistory() {
        try {
            const history = localStorage.getItem('search_history');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('加载搜索历史失败:', error);
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

    // 搜索建议样式
    injectSearchStyles() {
        if (document.getElementById('search-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'search-styles';
        styles.textContent = `
            .search-suggestions {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--surface-color);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-lg);
                z-index: 1000;
                max-height: 300px;
                overflow-y: auto;
                display: none;
            }

            .suggestion-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                cursor: pointer;
                transition: var(--transition);
                border-bottom: 1px solid var(--border-color);
            }

            .suggestion-item:last-child {
                border-bottom: none;
            }

            .suggestion-item:hover,
            .suggestion-item.active {
                background: var(--background-color);
            }

            .suggestion-item i {
                color: var(--text-secondary);
                width: 16px;
                text-align: center;
            }

            .suggestion-text {
                flex: 1;
                color: var(--text-primary);
            }

            .suggestion-remove {
                color: var(--text-secondary);
                opacity: 0;
                transition: var(--transition);
            }

            .suggestion-item:hover .suggestion-remove {
                opacity: 1;
            }

            .suggestion-remove:hover {
                color: var(--error-color);
            }

            .search-input-group {
                position: relative;
            }
        `;
        document.head.appendChild(styles);
    }
}

// 创建全局搜索管理器实例
let searchManager;

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    searchManager = new SearchManager();
    searchManager.injectSearchStyles();
});
