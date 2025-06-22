// 前端性能优化工具
class PerformanceOptimizer {
    constructor() {
        this.imageCache = new Map();
        this.intersectionObserver = null;
        this.resizeObserver = null;
        this.loadingQueue = new Set();
        this.init();
    }

    // 初始化性能优化
    init() {
        this.setupLazyLoading();
        this.setupImageOptimization();
        this.setupVirtualScrolling();
        this.setupPreloading();
    }

    // 设置懒加载
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadElement(entry.target);
                        this.intersectionObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });
        }
    }

    // 设置图片优化
    setupImageOptimization() {
        // 预加载默认头像
        this.preloadImage(APP_CONFIG.defaultAvatar);
        
        // 设置图片错误处理
        document.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG') {
                this.handleImageError(e.target);
            }
        }, true);
    }

    // 设置虚拟滚动（用于大列表）
    setupVirtualScrolling() {
        // 监听滚动事件，实现虚拟滚动
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.updateVisibleItems();
            }, 16); // 60fps
        }, { passive: true });
    }

    // 设置预加载
    setupPreloading() {
        // 预加载关键资源
        this.preloadCriticalResources();
        
        // 预加载下一页数据
        this.setupNextPagePreloading();
    }

    // 懒加载元素
    loadElement(element) {
        if (element.dataset.src) {
            element.src = element.dataset.src;
            element.removeAttribute('data-src');
        }

        if (element.dataset.load === 'lazy') {
            this.loadLazyContent(element);
        }
    }

    // 加载懒加载内容
    async loadLazyContent(element) {
        if (this.loadingQueue.has(element)) return;
        
        this.loadingQueue.add(element);
        
        try {
            const contentType = element.dataset.contentType;
            
            switch (contentType) {
                case 'user-interactions':
                    await this.loadUserInteractions(element);
                    break;
                case 'prompt-stats':
                    await this.loadPromptStats(element);
                    break;
                default:
                    console.warn('Unknown lazy content type:', contentType);
            }
        } catch (error) {
            console.error('Failed to load lazy content:', error);
        } finally {
            this.loadingQueue.delete(element);
        }
    }

    // 加载用户交互状态
    async loadUserInteractions(element) {
        const promptId = element.dataset.promptId;
        if (!promptId || !authManager.isAuthenticated()) return;

        try {
            const result = await apiManager.getUserInteractions([parseInt(promptId)]);
            if (result.success) {
                this.updateInteractionButtons(element, result.data);
            }
        } catch (error) {
            console.error('Failed to load user interactions:', error);
        }
    }

    // 更新交互按钮
    updateInteractionButtons(element, interactions) {
        const promptId = parseInt(element.dataset.promptId);
        const { likes, favorites } = interactions;

        // 更新点赞按钮
        const likeBtn = element.querySelector('.like-btn');
        if (likeBtn && likes.includes(promptId)) {
            likeBtn.classList.add('active');
            likeBtn.querySelector('i').className = 'fas fa-heart';
        }

        // 更新收藏按钮
        const favoriteBtn = element.querySelector('.favorite-btn');
        if (favoriteBtn && favorites.includes(promptId)) {
            favoriteBtn.classList.add('active');
            favoriteBtn.querySelector('i').className = 'fas fa-bookmark';
        }
    }

    // 处理图片错误
    handleImageError(img) {
        if (!img.dataset.errorHandled) {
            img.dataset.errorHandled = 'true';
            img.src = APP_CONFIG.defaultAvatar;
            img.alt = '默认头像';
        }
    }

    // 预加载图片
    preloadImage(src) {
        if (this.imageCache.has(src)) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.imageCache.set(src, true);
                resolve();
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    // 预加载关键资源
    async preloadCriticalResources() {
        try {
            // 预加载分类数据
            apiManager.getCategories();
            
            // 预加载热门标签
            apiManager.getPopularTags();
            
            // 预加载默认图片
            await this.preloadImage(APP_CONFIG.defaultAvatar);
        } catch (error) {
            console.error('Failed to preload critical resources:', error);
        }
    }

    // 设置下一页预加载
    setupNextPagePreloading() {
        let preloadTriggered = false;
        
        window.addEventListener('scroll', () => {
            if (preloadTriggered) return;
            
            const scrollPosition = window.scrollY + window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            // 当滚动到页面80%时预加载下一页
            if (scrollPosition >= documentHeight * 0.8) {
                preloadTriggered = true;
                this.preloadNextPage();
                
                // 重置预加载标志
                setTimeout(() => {
                    preloadTriggered = false;
                }, 2000);
            }
        }, { passive: true });
    }

    // 预加载下一页
    async preloadNextPage() {
        if (!window.promptsManager) return;
        
        try {
            const nextPage = promptsManager.currentPage + 1;
            const result = await apiManager.getPrompts({
                page: nextPage,
                ...promptsManager.currentFilters
            });
            
            if (result.success && result.data.length > 0) {
                console.log(`预加载第${nextPage}页数据成功`);
            }
        } catch (error) {
            console.error('预加载下一页失败:', error);
        }
    }

    // 更新可见项目（虚拟滚动）
    updateVisibleItems() {
        const container = document.querySelector('.prompts-grid');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const items = container.querySelectorAll('.prompt-card');
        
        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const isVisible = itemRect.bottom >= 0 && itemRect.top <= window.innerHeight;
            
            if (isVisible && !item.dataset.loaded) {
                item.dataset.loaded = 'true';
                this.loadItemContent(item);
            }
        });
    }

    // 加载项目内容
    loadItemContent(item) {
        // 懒加载用户交互状态
        if (authManager.isAuthenticated() && !item.dataset.interactionsLoaded) {
            item.dataset.interactionsLoaded = 'true';
            this.loadUserInteractions(item);
        }
    }

    // 观察元素进行懒加载
    observe(element) {
        if (this.intersectionObserver) {
            this.intersectionObserver.observe(element);
        } else {
            // 降级处理：立即加载
            this.loadElement(element);
        }
    }

    // 取消观察
    unobserve(element) {
        if (this.intersectionObserver) {
            this.intersectionObserver.unobserve(element);
        }
    }

    // 批量处理DOM操作
    batchDOMUpdates(updates) {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                updates.forEach(update => update());
                resolve();
            });
        });
    }

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 清理资源
    cleanup() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        this.imageCache.clear();
        this.loadingQueue.clear();
    }
}

// 创建全局性能优化器实例
const performanceOptimizer = new PerformanceOptimizer();

// 导出工具函数
window.performanceOptimizer = performanceOptimizer;
