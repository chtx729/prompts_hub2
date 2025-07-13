// 管理员身份验证系统
class AdminAuth {
    constructor() {
        this.currentAdmin = null;
        this.sessionStartTime = null;
        this.loginAttempts = 0;
        this.lockoutEndTime = null;
        this.sessionCheckInterval = null;

        // 检查必要的依赖
        if (typeof supabase === 'undefined') {
            console.error('❌ Supabase 客户端未初始化');
            return;
        }

        // 等待配置加载完成
        if (window.ADMIN_CONFIG) {
            this.init();
        } else {
            window.addEventListener('adminConfigReady', () => {
                this.init();
            });
        }
    }
    
    // 初始化
    init() {
        console.log('🔐 初始化管理员身份验证系统...');
        
        // 检查是否在管理后台路径
        if (!this.isAdminPath()) {
            console.log('📍 非管理后台路径，跳过身份验证');
            return;
        }
        
        // 启动会话检查
        this.startSessionCheck();
        
        // 检查现有会话
        this.checkExistingSession();
        
        console.log('✅ 管理员身份验证系统初始化完成');
    }
    
    // 检查是否为管理后台路径
    isAdminPath() {
        return window.location.pathname.includes('/admin/') || 
               window.location.pathname.endsWith('/admin');
    }
    
    // 检查现有会话
    async checkExistingSession() {
        try {
            // 检查 Supabase 会话
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('获取会话失败:', error);
                this.showLoginForm();
                return;
            }
            
            if (session && session.user) {
                // 验证管理员角色
                const isAdmin = await this.verifyAdminRole(session.user.id);
                if (isAdmin) {
                    await this.handleSuccessfulAuth(session.user);
                    return;
                }
            }
            
            // 没有有效会话或非管理员，显示登录表单
            this.showLoginForm();
            
        } catch (error) {
            console.error('检查会话时发生错误:', error);
            this.showLoginForm();
        }
    }
    
    // 显示登录表单
    showLoginForm() {
        // 隐藏主要内容
        const mainContent = document.getElementById('admin-main-content');
        if (mainContent) {
            mainContent.style.display = 'none';
        }
        
        // 显示登录表单
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.style.display = 'flex';
        } else {
            this.createLoginForm();
        }
        
        // 检查是否被锁定
        if (this.isLockedOut()) {
            this.showLockoutMessage();
        }
    }
    
    // 创建登录表单
    createLoginForm() {
        const loginHtml = `
            <div id="admin-login-form" class="admin-login-overlay">
                <div class="admin-login-container">
                    <div class="admin-login-header">
                        <h1>管理后台登录</h1>
                        <p>请使用管理员账户登录</p>
                    </div>
                    
                    <form id="admin-login-form-element" class="admin-login-form">
                        <div class="form-group">
                            <label for="admin-email">邮箱地址</label>
                            <input type="email" id="admin-email" name="email" required 
                                   placeholder="请输入管理员邮箱">
                        </div>
                        
                        <div class="form-group">
                            <label for="admin-password">密码</label>
                            <input type="password" id="admin-password" name="password" required 
                                   placeholder="请输入密码">
                        </div>
                        
                        <div id="admin-login-error" class="error-message" style="display: none;"></div>
                        <div id="admin-login-lockout" class="lockout-message" style="display: none;"></div>
                        
                        <button type="submit" id="admin-login-btn" class="admin-login-btn">
                            <span class="btn-text">登录</span>
                            <span class="btn-loading" style="display: none;">
                                <i class="fas fa-spinner fa-spin"></i> 验证中...
                            </span>
                        </button>
                    </form>
                    
                    <div class="admin-login-footer">
                        <p>仅限系统管理员访问</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loginHtml);
        
        // 绑定登录表单事件
        this.bindLoginFormEvents();
    }
    
    // 绑定登录表单事件
    bindLoginFormEvents() {
        const form = document.getElementById('admin-login-form-element');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // 回车键登录
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.getElementById('admin-login-form').style.display !== 'none') {
                e.preventDefault();
                this.handleLogin();
            }
        });
    }
    
    // 处理登录
    async handleLogin() {
        if (this.isLockedOut()) {
            this.showLockoutMessage();
            return;
        }
        
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value;
        
        if (!email || !password) {
            this.showError('请输入邮箱和密码');
            return;
        }
        
        this.setLoginLoading(true);
        this.hideError();
        
        try {
            const result = await this.verifyAdminAccess(email, password);
            
            if (result.success) {
                await this.handleSuccessfulAuth(result.user);
                this.resetLoginAttempts();
            } else {
                this.handleFailedLogin(result.error);
            }
            
        } catch (error) {
            console.error('登录过程中发生错误:', error);
            this.handleFailedLogin('登录过程中发生错误，请稍后重试');
        } finally {
            this.setLoginLoading(false);
        }
    }
    
    // 验证管理员访问权限
    async verifyAdminAccess(email, password) {
        try {
            // 1. Supabase 身份验证
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (authError) {
                throw new Error(authError.message);
            }
            
            // 2. 角色验证
            const isAdmin = await this.verifyAdminRole(authData.user.id);
            
            if (!isAdmin) {
                // 登出非管理员用户
                await supabase.auth.signOut();
                throw new Error('您没有管理员权限');
            }
            
            return { success: true, user: authData.user };
            
        } catch (error) {
            console.error('身份验证失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 验证管理员角色
    async verifyAdminRole(userId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('role')
                .eq('user_id', userId)
                .single();
                
            if (error) {
                console.error('角色验证失败:', error);
                return false;
            }
            
            return data && data.role === 'admin';
            
        } catch (error) {
            console.error('角色验证过程中发生错误:', error);
            return false;
        }
    }
    
    // 处理成功认证
    async handleSuccessfulAuth(user) {
        this.currentAdmin = user;
        this.sessionStartTime = Date.now();
        
        // 记录登录日志
        await this.logAdminAction('login', 'system', null, {
            email: user.email,
            loginTime: new Date().toISOString()
        });
        
        // 隐藏登录表单
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.style.display = 'none';
        }
        
        // 显示主要内容
        const mainContent = document.getElementById('admin-main-content');
        if (mainContent) {
            mainContent.style.display = 'block';
        }
        
        // 触发认证成功事件
        window.dispatchEvent(new CustomEvent('adminAuthSuccess', {
            detail: { user: this.currentAdmin }
        }));
        
        console.log('✅ 管理员登录成功:', user.email);
    }
    
    // 处理登录失败
    handleFailedLogin(errorMessage) {
        this.loginAttempts++;
        
        const maxAttempts = getAdminConfig('maxLoginAttempts', 5);
        const remainingAttempts = maxAttempts - this.loginAttempts;
        
        if (remainingAttempts <= 0) {
            this.lockoutEndTime = Date.now() + getAdminConfig('lockoutDuration', 15 * 60 * 1000);
            this.showLockoutMessage();
        } else {
            this.showError(`${errorMessage}${remainingAttempts > 0 ? ` (剩余尝试次数: ${remainingAttempts})` : ''}`);
        }
        
        // 记录失败登录
        this.logAdminAction('login_failed', 'system', null, {
            error: errorMessage,
            attempts: this.loginAttempts
        });
    }
    
    // 检查是否被锁定
    isLockedOut() {
        return this.lockoutEndTime && Date.now() < this.lockoutEndTime;
    }
    
    // 显示锁定消息
    showLockoutMessage() {
        const lockoutDiv = document.getElementById('admin-login-lockout');
        if (lockoutDiv && this.lockoutEndTime) {
            const remainingTime = Math.ceil((this.lockoutEndTime - Date.now()) / 1000 / 60);
            lockoutDiv.textContent = `登录尝试次数过多，请 ${remainingTime} 分钟后再试`;
            lockoutDiv.style.display = 'block';
        }
        
        // 禁用登录按钮
        const loginBtn = document.getElementById('admin-login-btn');
        if (loginBtn) {
            loginBtn.disabled = true;
        }
    }
    
    // 重置登录尝试次数
    resetLoginAttempts() {
        this.loginAttempts = 0;
        this.lockoutEndTime = null;
    }
    
    // 显示错误信息
    showError(message) {
        const errorDiv = document.getElementById('admin-login-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }
    
    // 隐藏错误信息
    hideError() {
        const errorDiv = document.getElementById('admin-login-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
        
        const lockoutDiv = document.getElementById('admin-login-lockout');
        if (lockoutDiv) {
            lockoutDiv.style.display = 'none';
        }
    }
    
    // 设置登录加载状态
    setLoginLoading(loading) {
        const btn = document.getElementById('admin-login-btn');
        const btnText = btn?.querySelector('.btn-text');
        const btnLoading = btn?.querySelector('.btn-loading');
        
        if (btn && btnText && btnLoading) {
            btn.disabled = loading;
            btnText.style.display = loading ? 'none' : 'inline';
            btnLoading.style.display = loading ? 'inline' : 'none';
        }
    }
    
    // 启动会话检查
    startSessionCheck() {
        const checkInterval = 60000; // 每分钟检查一次
        
        this.sessionCheckInterval = setInterval(() => {
            if (this.currentAdmin && this.sessionStartTime) {
                const sessionTimeout = getSessionTimeout();
                if (Date.now() - this.sessionStartTime > sessionTimeout) {
                    this.handleSessionTimeout();
                }
            }
        }, checkInterval);
    }
    
    // 处理会话超时
    async handleSessionTimeout() {
        console.log('⏰ 管理员会话超时');
        
        await this.logAdminAction('session_timeout', 'system', null, {
            sessionDuration: Date.now() - this.sessionStartTime
        });
        
        await this.logout();
    }
    
    // 登出
    async logout() {
        if (this.currentAdmin) {
            await this.logAdminAction('logout', 'system', null, {
                sessionDuration: this.sessionStartTime ? Date.now() - this.sessionStartTime : 0
            });
        }
        
        // 清理会话
        this.currentAdmin = null;
        this.sessionStartTime = null;
        
        // 清理定时器
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
        
        // Supabase 登出
        await supabase.auth.signOut();
        
        // 显示登录表单
        this.showLoginForm();
        
        console.log('👋 管理员已登出');
    }
    
    // 记录管理员操作
    async logAdminAction(action, targetType, targetId = null, details = null) {
        if (!getAdminConfig('logging.enabled', false)) {
            return;
        }
        
        try {
            const logData = {
                admin_id: this.currentAdmin?.id || null,
                action,
                target_type: targetType,
                target_id: targetId,
                details: details ? JSON.stringify(details) : null,
                ip_address: await this.getClientIP(),
                user_agent: navigator.userAgent
            };
            
            // 发送到数据库
            const { error } = await supabase
                .from('admin_logs')
                .insert([logData]);
                
            if (error) {
                console.error('记录管理员操作失败:', error);
            }
            
        } catch (error) {
            console.error('记录管理员操作时发生错误:', error);
        }
    }
    
    // 获取客户端IP（简单实现）
    async getClientIP() {
        try {
            // 这里可以调用IP获取服务，暂时返回null
            return null;
        } catch (error) {
            return null;
        }
    }
    
    // 获取当前管理员信息
    getCurrentAdmin() {
        return this.currentAdmin;
    }
    
    // 检查是否已认证
    isAuthenticated() {
        return this.currentAdmin !== null;
    }
    
    // 检查权限
    hasPermission(module, action) {
        if (!this.isAuthenticated()) {
            return false;
        }

        return hasAdminPermission(module, action);
    }

    // 刷新会话
    refreshSession() {
        if (this.currentAdmin) {
            this.sessionStartTime = Date.now();
        }
    }

    // 获取会话剩余时间
    getSessionRemainingTime() {
        if (!this.currentAdmin || !this.sessionStartTime) {
            return 0;
        }

        const sessionTimeout = getSessionTimeout();
        const elapsed = Date.now() - this.sessionStartTime;
        return Math.max(0, sessionTimeout - elapsed);
    }

    // 检查管理员状态
    async checkAdminStatus() {
        if (!this.currentAdmin) {
            return false;
        }

        try {
            const { data, error } = await supabase
                .from('users')
                .select('role, status')
                .eq('user_id', this.currentAdmin.id)
                .single();

            if (error || !data) {
                console.error('检查管理员状态失败:', error);
                return false;
            }

            // 检查角色和状态
            if (data.role !== 'admin' || data.status !== 'active') {
                console.warn('管理员权限已变更或账户被禁用');
                await this.logout();
                return false;
            }

            return true;

        } catch (error) {
            console.error('检查管理员状态时发生错误:', error);
            return false;
        }
    }

    // 强制重新认证
    forceReauth() {
        this.logout();
    }
}

// 工具函数：要求管理员权限
function requireAdminAuth(callback) {
    if (window.adminAuth && window.adminAuth.isAuthenticated()) {
        callback();
    } else {
        console.warn('需要管理员权限');
        if (window.adminAuth) {
            window.adminAuth.showLoginForm();
        }
    }
}

// 工具函数：要求特定权限
function requirePermission(module, action, callback) {
    if (window.adminAuth && window.adminAuth.hasPermission(module, action)) {
        callback();
    } else {
        console.warn(`需要权限: ${module}.${action}`);
        // 这里可以显示权限不足的提示
    }
}

// 创建全局管理员认证实例
if (!window.adminAuth) {
    window.adminAuth = new AdminAuth();
}

// 导出工具函数
window.requireAdminAuth = requireAdminAuth;
window.requirePermission = requirePermission;

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AdminAuth,
        requireAdminAuth,
        requirePermission
    };
}
