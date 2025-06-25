// 主应用程序
class App {
    constructor() {
        this.currentPage = 'home';
        this.init();
    }

    // 初始化应用
    async init() {
        console.log('🚀 初始化 AI提示词宝库...');

        try {
            // 检查 Supabase 配置
            console.log('🔧 检查 Supabase 配置...');
            if (!this.checkSupabaseConfig()) {
                console.error('❌ Supabase 配置检查失败');
                return;
            }
            console.log('✅ Supabase 配置正常');

            // 绑定全局事件
            console.log('📡 绑定全局事件...');
            this.bindGlobalEvents();
            console.log('✅ 全局事件绑定完成');

            // 初始化各个管理器
            console.log('⚙️ 初始化管理器...');
            await this.initializeManagers();
            console.log('✅ 管理器初始化完成');

            // 设置路由
            console.log('🛣️ 设置路由...');
            this.setupRouting();
            console.log('✅ 路由设置完成');

            // 显示首页（现在管理器已经初始化完成）
            console.log('🏠 显示首页...');
            this.showPage('home');
            console.log('✅ 首页显示完成');

            console.log('🎉 应用初始化完成');
        } catch (error) {
            console.error('❌ 应用初始化过程中发生错误:', error);
            this.showInitError(error);
        }
    }

    // 显示初始化错误
    showInitError(error) {
        console.error('显示初始化错误:', error);
        const container = document.getElementById('prompts-container');
        if (container) {
            container.innerHTML = `
                <div class="error-state" style="text-align: center; padding: 2rem; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>应用初始化失败</h3>
                    <p style="margin: 1rem 0; color: #666;">${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 1rem;">
                        <i class="fas fa-redo"></i> 重新加载
                    </button>
                    <details style="margin-top: 1rem; text-align: left;">
                        <summary style="cursor: pointer; color: #007bff;">查看详细错误信息</summary>
                        <pre style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-top: 0.5rem; overflow-x: auto;">${error.stack || error.message}</pre>
                    </details>
                </div>
            `;
        }
    }

    // 检查 Supabase 配置
    checkSupabaseConfig() {
        if (!supabase) {
            UI.showNotification(
                '请在 js/config.js 中配置您的 Supabase URL 和 API Key',
                'error',
                '配置错误'
            );
            
            // 显示配置说明
            this.showConfigInstructions();
            return false;
        }
        return true;
    }

    // 显示配置说明
    showConfigInstructions() {
        const container = document.getElementById('prompts-container');
        if (container) {
            container.innerHTML = `
                <div class="config-instructions">
                    <div class="config-card">
                        <h3><i class="fas fa-cog"></i> 配置说明</h3>
                        <p>请按照以下步骤配置 Supabase：</p>
                        <ol>
                            <li>访问 <a href="https://supabase.com" target="_blank">Supabase 官网</a> 创建项目</li>
                            <li>在项目设置中找到 API 配置</li>
                            <li>复制 Project URL 和 anon public key</li>
                            <li>在 <code>js/config.js</code> 文件中替换相应配置</li>
                            <li>在 Supabase SQL 编辑器中执行 <code>tables_sql.txt</code> 中的 SQL 语句</li>
                        </ol>
                        <div class="config-code">
                            <h4>配置示例：</h4>
                            <pre><code>const SUPABASE_CONFIG = {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key-here'
};</code></pre>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // 初始化管理器
    async initializeManagers() {
        try {
            // 等待认证管理器初始化完成
            await new Promise(resolve => {
                if (authManager.currentUser !== undefined) {
                    resolve();
                } else {
                    const checkAuth = () => {
                        if (authManager.currentUser !== undefined) {
                            resolve();
                        } else {
                            setTimeout(checkAuth, 100);
                        }
                    };
                    checkAuth();
                }
            });

            // 初始化提示词管理器
            window.promptsManager = new PromptsManager();

            // 等待PromptsManager完全初始化
            await window.promptsManager.init();

            console.log('所有管理器初始化完成');
        } catch (error) {
            console.error('管理器初始化失败:', error);
            UI.showNotification('应用初始化失败: ' + error.message, 'error');

            // 显示错误信息到页面
            const container = document.getElementById('prompts-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>初始化失败</h3>
                        <p>应用初始化时发生错误：${error.message}</p>
                        <button class="btn btn-primary" onclick="location.reload()">重新加载</button>
                    </div>
                `;
            }
            throw error; // 重新抛出错误，阻止后续初始化
        }
    }

    // 绑定全局事件
    bindGlobalEvents() {
        // 导航链接
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.showPage(page);
            });
        });

        // 全局键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });

        // 全局点击事件（关闭下拉菜单等）
        document.addEventListener('click', (e) => {
            this.handleGlobalClick(e);
        });

        // 窗口大小变化
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // 页面卸载时清理资源
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    // 设置路由
    setupRouting() {
        // 简单的哈希路由
        window.addEventListener('hashchange', () => {
            this.handleRouteChange();
        });

        // 处理初始路由
        this.handleRouteChange();
    }

    // 处理路由变化
    handleRouteChange() {
        const hash = window.location.hash.slice(1);
        const [page, ...params] = hash.split('/');

        switch (page) {
            case 'home':
            case '':
                this.showPage('home');
                break;
            case 'my-space':
                if (authManager.isAuthenticated()) {
                    this.showPage('my-space');
                } else {
                    UI.showNotification('请先登录', 'warning');
                    UI.showModal('login-modal');
                    this.showPage('home');
                }
                break;
            case 'prompt':
                if (params[0]) {
                    this.showPromptDetail(params[0]);
                } else {
                    this.showPage('home');
                }
                break;
            default:
                this.showPage('home');
        }
    }

    // 显示页面
    showPage(pageId) {
        this.currentPage = pageId;
        UI.showPage(pageId + '-page');
        
        // 更新 URL 哈希
        if (pageId !== 'home') {
            window.location.hash = pageId;
        } else {
            window.location.hash = '';
        }

        // 页面特定的初始化
        this.handlePageInit(pageId);
    }

    // 页面初始化处理
    handlePageInit(pageId) {
        switch (pageId) {
            case 'home':
                // 首页已在 PromptsManager 中处理
                break;
            case 'my-space':
                if (authManager.isAuthenticated() && window.mySpaceManager) {
                    window.mySpaceManager.loadMyPrompts();
                }
                break;
        }
    }

    // 显示提示词详情
    showPromptDetail(promptId) {
        if (window.promptsManager) {
            window.promptsManager.showPromptDetail(promptId);
        }
    }

    // 处理全局键盘事件
    handleGlobalKeydown(e) {
        // Ctrl/Cmd + K 打开搜索
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // ESC 关闭模态框
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                UI.hideModal(activeModal.id);
            }
        }
    }

    // 处理全局点击事件
    handleGlobalClick(e) {
        // 关闭搜索建议
        if (!e.target.closest('.search-input-group') && !e.target.closest('.search-suggestions')) {
            if (window.searchManager) {
                window.searchManager.hideSearchSuggestions();
            }
        }
    }

    // 处理窗口大小变化
    handleWindowResize() {
        // 可以在这里处理响应式布局调整
    }

    // 处理页面可见性变化
    handleVisibilityChange() {
        if (document.hidden) {
            // 页面隐藏时的处理
            console.log('页面隐藏');
        } else {
            // 页面显示时的处理
            console.log('页面恢复显示');
            // 页面恢复时不重新检查认证状态，避免显示不必要的通知
            // 认证状态由Supabase的onAuthStateChange自动处理
        }
    }

    // 错误处理
    handleError(error, context = '') {
        console.error(`应用错误 ${context}:`, error);
        UI.showNotification(
            `发生错误: ${error.message || '未知错误'}`,
            'error'
        );
    }

    // 获取应用状态
    getAppState() {
        return {
            currentPage: this.currentPage,
            isAuthenticated: authManager.isAuthenticated(),
            currentUser: authManager.getCurrentUser()
        };
    }

    // 清理资源
    cleanup() {
        console.log('🧹 清理应用资源...');

        // 清理提示词管理器的订阅
        if (window.promptsManager) {
            window.promptsManager.cleanup();
        }

        // 清理性能优化器
        if (window.performanceOptimizer) {
            window.performanceOptimizer.cleanup();
        }

        console.log('✅ 应用资源清理完成');
    }
}

// 全局错误处理
window.addEventListener('error', (e) => {
    console.error('全局错误:', e.error);
    if (window.app) {
        window.app.handleError(e.error, '全局');
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('未处理的 Promise 拒绝:', e.reason);
    if (window.app) {
        window.app.handleError(e.reason, 'Promise');
    }
});

// 添加配置说明样式
const configStyles = document.createElement('style');
configStyles.textContent = `
    .config-instructions {
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1rem;
    }

    .config-card {
        background: var(--surface-color);
        border-radius: var(--radius-lg);
        padding: 2rem;
        box-shadow: var(--shadow-md);
        border: 1px solid var(--border-color);
    }

    .config-card h3 {
        color: var(--primary-color);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .config-card ol {
        margin: 1rem 0;
        padding-left: 1.5rem;
    }

    .config-card li {
        margin-bottom: 0.5rem;
        line-height: 1.6;
    }

    .config-card a {
        color: var(--primary-color);
        text-decoration: none;
    }

    .config-card a:hover {
        text-decoration: underline;
    }

    .config-code {
        background: var(--background-color);
        border-radius: var(--radius-md);
        padding: 1rem;
        margin-top: 1rem;
    }

    .config-code h4 {
        margin-bottom: 0.5rem;
        color: var(--text-primary);
    }

    .config-code pre {
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 1rem;
        border-radius: var(--radius-sm);
        overflow-x: auto;
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
        line-height: 1.4;
    }

    .config-code code {
        color: inherit;
    }
`;
document.head.appendChild(configStyles);

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
