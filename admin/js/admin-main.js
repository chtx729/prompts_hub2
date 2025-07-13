// 管理后台主应用
class AdminMain {
    constructor() {
        this.currentPage = 'dashboard';
        this.sidebarCollapsed = false;
        this.charts = {};
        this.refreshInterval = null;
        
        // 等待认证成功后初始化
        this.initialized = false;
    }
    
    // 初始化管理后台
    init() {
        if (this.initialized) {
            return;
        }
        
        console.log('🎛️ 初始化管理后台主应用...');
        
        try {
            // 绑定事件
            this.bindEvents();
            
            // 初始化导航
            this.initNavigation();
            
            // 初始化数据看板
            this.initDashboard();
            
            // 启动数据刷新
            this.startDataRefresh();
            
            this.initialized = true;
            console.log('✅ 管理后台主应用初始化完成');
            
        } catch (error) {
            console.error('❌ 管理后台初始化失败:', error);
        }
    }
    
    // 绑定事件
    bindEvents() {
        // 侧边栏切换
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
        
        // 登出按钮
        const logoutBtn = document.getElementById('admin-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        // 导航链接
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                if (page) {
                    this.navigateToPage(page);
                }
            });
        });
        
        // 快捷操作按钮
        const refreshBtn = document.querySelector('.quick-action-btn[title="刷新数据"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }
        
        // 响应式侧边栏（移动端）
        if (window.innerWidth <= 768) {
            this.initMobileSidebar();
        }
        
        // 窗口大小变化
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    // 初始化导航
    initNavigation() {
        // 设置默认页面
        this.navigateToPage('dashboard');
        
        // 处理哈希路由
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && this.isValidPage(hash)) {
                this.navigateToPage(hash);
            }
        });
        
        // 处理初始哈希
        const initialHash = window.location.hash.slice(1);
        if (initialHash && this.isValidPage(initialHash)) {
            this.navigateToPage(initialHash);
        }
    }
    
    // 页面导航
    navigateToPage(pageId) {
        if (!this.isValidPage(pageId)) {
            console.warn('无效的页面ID:', pageId);
            return;
        }
        
        // 检查权限
        if (!this.hasPagePermission(pageId)) {
            console.warn('没有访问权限:', pageId);
            return;
        }
        
        // 隐藏所有页面
        document.querySelectorAll('.admin-page').forEach(page => {
            page.classList.remove('active');
        });
        
        // 显示目标页面
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // 更新导航状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-page="${pageId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // 更新URL
        window.location.hash = pageId;
        
        // 更新当前页面
        this.currentPage = pageId;
        
        // 页面特定初始化
        this.handlePageInit(pageId);
        
        console.log(`📄 导航到页面: ${pageId}`);
    }
    
    // 检查页面是否有效
    isValidPage(pageId) {
        const validPages = ['dashboard', 'users', 'prompts', 'categories', 'system', 'logs'];
        return validPages.includes(pageId);
    }
    
    // 检查页面权限
    hasPagePermission(pageId) {
        if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
            return false;
        }
        
        // 这里可以根据具体需求实现更细粒度的权限控制
        return true;
    }
    
    // 页面初始化处理
    handlePageInit(pageId) {
        switch (pageId) {
            case 'dashboard':
                this.initDashboard();
                break;
            case 'users':
                this.initUsersPage();
                break;
            case 'prompts':
                this.initPromptsPage();
                break;
            case 'categories':
                this.initCategoriesPage();
                break;
            case 'system':
                this.initSystemPage();
                break;
            case 'logs':
                this.initLogsPage();
                break;
        }
    }
    
    // 初始化数据看板
    async initDashboard() {
        if (this.currentPage !== 'dashboard') {
            return;
        }
        
        console.log('📊 初始化数据看板...');
        
        try {
            // 加载统计数据
            await this.loadDashboardStats();
            
            // 初始化图表
            this.initCharts();
            
        } catch (error) {
            console.error('数据看板初始化失败:', error);
        }
    }
    
    // 加载数据看板统计数据
    async loadDashboardStats() {
        try {
            const { data, error } = await supabase
                .from('admin_dashboard_stats')
                .select('*')
                .single();
                
            if (error) {
                throw error;
            }
            
            // 更新统计卡片
            this.updateStatCard('total-users', data.total_users || 0);
            this.updateStatCard('total-prompts', data.total_prompts || 0);
            this.updateStatCard('today-active-users', data.today_active_users || 0);
            this.updateStatCard('pending-review', data.pending_review || 0);
            
            console.log('✅ 数据看板统计数据加载完成');
            
        } catch (error) {
            console.error('加载数据看板统计数据失败:', error);
            
            // 显示错误状态
            this.updateStatCard('total-users', 'Error');
            this.updateStatCard('total-prompts', 'Error');
            this.updateStatCard('today-active-users', 'Error');
            this.updateStatCard('pending-review', 'Error');
        }
    }
    
    // 更新统计卡片
    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // 添加动画效果
            element.style.opacity = '0.5';
            setTimeout(() => {
                element.textContent = this.formatNumber(value);
                element.style.opacity = '1';
            }, 150);
        }
    }
    
    // 格式化数字
    formatNumber(num) {
        if (typeof num !== 'number') {
            return num;
        }
        
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        
        return num.toString();
    }
    
    // 初始化图表
    initCharts() {
        this.initUserGrowthChart();
        this.initPromptGrowthChart();
    }
    
    // 初始化用户增长图表
    async initUserGrowthChart() {
        const canvas = document.getElementById('user-growth-chart');
        if (!canvas) return;
        
        try {
            // 获取用户增长数据
            const { data, error } = await supabase
                .from('user_growth_trend')
                .select('*')
                .order('date');
                
            if (error) throw error;
            
            const ctx = canvas.getContext('2d');
            
            // 销毁现有图表
            if (this.charts.userGrowth) {
                this.charts.userGrowth.destroy();
            }
            
            this.charts.userGrowth = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(item => new Date(item.date).toLocaleDateString()),
                    datasets: [{
                        label: '新增用户',
                        data: data.map(item => item.new_users),
                        borderColor: 'rgb(124, 58, 237)',
                        backgroundColor: 'rgba(124, 58, 237, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('用户增长图表初始化失败:', error);
        }
    }
    
    // 初始化提示词增长图表
    async initPromptGrowthChart() {
        const canvas = document.getElementById('prompt-growth-chart');
        if (!canvas) return;
        
        try {
            // 获取提示词增长数据
            const { data, error } = await supabase
                .from('prompt_growth_trend')
                .select('*')
                .order('date');
                
            if (error) throw error;
            
            const ctx = canvas.getContext('2d');
            
            // 销毁现有图表
            if (this.charts.promptGrowth) {
                this.charts.promptGrowth.destroy();
            }
            
            this.charts.promptGrowth = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(item => new Date(item.date).toLocaleDateString()),
                    datasets: [{
                        label: '新增提示词',
                        data: data.map(item => item.new_prompts),
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('提示词增长图表初始化失败:', error);
        }
    }
    
    // 其他页面初始化（占位符）
    initUsersPage() {
        console.log('👥 初始化用户管理页面');
    }
    
    initPromptsPage() {
        console.log('📝 初始化提示词管理页面');
    }
    
    initCategoriesPage() {
        console.log('🏷️ 初始化分类管理页面');
    }
    
    initSystemPage() {
        console.log('⚙️ 初始化系统配置页面');
    }
    
    initLogsPage() {
        console.log('📋 初始化操作日志页面');
    }
    
    // 切换侧边栏
    toggleSidebar() {
        const sidebar = document.getElementById('admin-sidebar');
        if (sidebar) {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            
            if (window.innerWidth <= 768) {
                // 移动端：显示/隐藏侧边栏
                sidebar.classList.toggle('open');
            } else {
                // 桌面端：折叠/展开侧边栏
                sidebar.classList.toggle('collapsed');
            }
        }
    }
    
    // 初始化移动端侧边栏
    initMobileSidebar() {
        // 点击主内容区域时关闭侧边栏
        const mainContent = document.querySelector('.admin-main');
        if (mainContent) {
            mainContent.addEventListener('click', () => {
                const sidebar = document.getElementById('admin-sidebar');
                if (sidebar && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
            });
        }
    }
    
    // 处理窗口大小变化
    handleResize() {
        // 重新调整图表大小
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }
    
    // 刷新数据
    async refreshData() {
        console.log('🔄 刷新数据...');
        
        const refreshBtn = document.querySelector('.quick-action-btn[title="刷新数据"]');
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.classList.add('fa-spin');
            }
        }
        
        try {
            if (this.currentPage === 'dashboard') {
                await this.loadDashboardStats();
                this.initCharts();
            }
            
            console.log('✅ 数据刷新完成');
            
        } catch (error) {
            console.error('数据刷新失败:', error);
        } finally {
            if (refreshBtn) {
                const icon = refreshBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-spin');
                }
            }
        }
    }
    
    // 启动数据自动刷新
    startDataRefresh() {
        const refreshInterval = getAdminConfig('refresh.dashboardInterval', 30000);
        const autoRefresh = getAdminConfig('refresh.autoRefresh', true);
        
        if (autoRefresh && refreshInterval > 0) {
            this.refreshInterval = setInterval(() => {
                if (this.currentPage === 'dashboard' && document.visibilityState === 'visible') {
                    this.loadDashboardStats();
                }
            }, refreshInterval);
            
            console.log(`⏰ 启动自动刷新，间隔: ${refreshInterval / 1000}秒`);
        }
    }
    
    // 停止数据自动刷新
    stopDataRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('⏹️ 停止自动刷新');
        }
    }
    
    // 处理登出
    async handleLogout() {
        if (confirm('确定要退出管理后台吗？')) {
            this.stopDataRefresh();
            
            // 销毁图表
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
            this.charts = {};
            
            // 执行登出
            if (window.adminAuth) {
                await window.adminAuth.logout();
            }
        }
    }
    
    // 获取当前页面
    getCurrentPage() {
        return this.currentPage;
    }
    
    // 销毁实例
    destroy() {
        this.stopDataRefresh();
        
        // 销毁图表
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        this.initialized = false;
        console.log('🗑️ 管理后台主应用已销毁');
    }
}

// 创建全局管理后台主应用实例
if (!window.adminMain) {
    window.adminMain = new AdminMain();
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminMain;
}
