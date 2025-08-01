// 用户认证管理
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authCallbacks = [];
        this.lastAuthEvent = null;  // 记录最后一次认证事件
        this.lastEventTime = 0;     // 记录最后一次事件时间
        this.isInitialized = false; // 标记是否已初始化
        this.sessionChecked = false; // 标记是否已检查过会话
        this.authStateSubscription = null; // 认证状态订阅
        this.init();
    }

    // 初始化认证管理器
    async init() {
        if (!supabase) {
            console.error('Supabase 客户端未初始化');
            return;
        }

        if (this.isInitialized) {
            console.log('认证管理器已初始化，跳过重复初始化');
            return;
        }

        // 清理之前的订阅（如果存在）
        if (this.authStateSubscription) {
            this.authStateSubscription.unsubscribe();
        }

        // 监听认证状态变化（确保只绑定一次）
        this.authStateSubscription = supabase.auth.onAuthStateChange((event, session) => {
            console.log('认证状态变化:', event, session?.user?.email || 'no user');

            // 防止重复处理相同的认证事件
            const currentTime = Date.now();
            const eventKey = `${event}_${session?.user?.id || 'null'}`;

            // 如果是相同的事件且时间间隔很短，跳过处理
            if (this.lastAuthEvent === eventKey && (currentTime - this.lastEventTime) < 2000) {
                console.log('跳过重复的认证事件:', event);
                return;
            }

            this.lastAuthEvent = eventKey;
            this.lastEventTime = currentTime;

            if (session?.user) {
                // 极其严格的通知控制：只有在真正的用户登录操作时才显示通知
                // 排除所有自动事件和页面恢复场景
                const isRealLogin = event === 'SIGNED_IN' &&
                                  this.isInitialized &&
                                  !this.currentUser &&
                                  !document.hidden; // 页面必须是可见状态

                console.log(`认证事件详情:`, {
                    event,
                    isInitialized: this.isInitialized,
                    hasCurrentUser: !!this.currentUser,
                    isPageVisible: !document.hidden,
                    showNotification: isRealLogin
                });

                this.handleUserSignIn(session.user, isRealLogin);
            } else {
                // 检查登出事件类型并添加详细日志
                console.log(`登出事件详情:`, {
                    event,
                    isInitialized: this.isInitialized,
                    currentUser: this.currentUser?.email || 'none',
                    eventType: typeof event,
                    eventValue: event
                });

                // 只有在用户主动登出时才显示通知
                const showNotification = event === 'SIGNED_OUT' && this.isInitialized;
                console.log(`处理登出事件: ${event}, 显示通知: ${showNotification}`);
                this.handleUserSignOut(showNotification);
            }
        });

        // 不自动检查会话，让用户手动登录
        // 首页加载时不需要自动登录
        if (!this.sessionChecked) {
            // 只标记为已检查，但不自动恢复会话
            this.sessionChecked = true;
            // 确保初始状态为未登录
            this.handleUserSignOut(false);
        }

        this.isInitialized = true;
        console.log('认证管理器初始化完成');

        // 添加页面关闭时的会话清理
        this.setupPageUnloadHandler();
    }

    // 手动检查并恢复会话（在需要时调用）
    async checkAndRestoreSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                console.log('恢复用户会话:', session.user.email);
                this.handleUserSignIn(session.user, false);
                return true;
            }
            return false;
        } catch (error) {
            console.error('检查会话失败:', error);
            return false;
        }
    }

    // 设置页面关闭时的会话清理
    setupPageUnloadHandler() {
        // 只监听页面真正关闭的事件（beforeunload）
        // 不监听页面隐藏或失焦事件，以保持最小化和切换标签页时的登录状态
        window.addEventListener('beforeunload', () => {
            console.log('页面即将关闭，清除会话信息');
            this.clearSessionOnPageClose();
        });

        // 可选：监听页面卸载事件作为备用
        window.addEventListener('unload', () => {
            console.log('页面卸载，清除会话信息');
            this.clearSessionOnPageClose();
        });
    }

    // 页面关闭时清除会话
    clearSessionOnPageClose() {
        try {
            console.log('页面关闭，清除会话信息');

            // 清除Supabase会话
            supabase.auth.signOut({ scope: 'local' });

            // 清除所有认证相关的localStorage数据
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('supabase') || key.includes('auth') || key.includes('session'))) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            // 重置内部状态
            this.currentUser = null;
            this.sessionChecked = false;

        } catch (error) {
            console.error('清除会话失败:', error);
        }
    }

    // 处理用户登录
    async handleUserSignIn(user, showNotification = true) {
        try {
            // 检查是否是用户切换（已有用户但ID不同）
            const isUserSwitch = this.currentUser && this.currentUser.id !== user.id;

            // 获取用户详细信息
            const { data: userProfile, error } = await supabase
                .from('users')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            this.currentUser = {
                id: user.id,  // 保持 Supabase auth UUID
                email: user.email,
                username: userProfile?.username || user.email,
                avatar_url: userProfile?.avatar_url || APP_CONFIG.defaultAvatar,
                role: userProfile?.role || 'user',
                // 添加用户资料信息，但不覆盖 id
                profile_id: userProfile?.id,  // users表的自增ID
                user_id: userProfile?.user_id,  // users表的UUID字段
                points: userProfile?.points || 0,
                bio: userProfile?.bio,
                status: userProfile?.status || 'active'
            };

            this.updateUI();

            // 根据是否是用户切换发送不同的事件
            if (isUserSwitch) {
                this.notifyAuthCallbacks('userChanged', this.currentUser);
                if (showNotification) {
                    UI.showNotification(`已切换到用户：${this.currentUser.username}`, 'success');
                }
                // 用户切换时也跳转到我的空间
                this.navigateToMySpace();
            } else {
                this.notifyAuthCallbacks('signIn', this.currentUser);
                if (showNotification) {
                    UI.showNotification('登录成功', 'success');
                    // 登录成功后自动跳转到我的空间
                    this.navigateToMySpace();
                }
            }
        } catch (error) {
            console.error('处理用户登录失败:', error);
            if (showNotification) {
                UI.showNotification('登录处理失败', 'error');
            }
        }
    }

    // 导航到我的空间页面
    navigateToMySpace() {
        // 延迟执行，确保UI更新完成
        setTimeout(() => {
            console.log('自动跳转到我的空间页面');

            // 优先使用app实例的showPage方法，它会触发完整的页面切换流程
            if (typeof window.app !== 'undefined' && typeof window.app.showPage === 'function') {
                console.log('使用app.showPage方法跳转');
                window.app.showPage('my-space');
            } else {
                // 备用方案：直接设置hash，触发路由处理
                console.log('app实例不可用，使用hash跳转');
                window.location.hash = '#my-space';

                // 如果使用hash跳转，需要手动触发数据加载
                setTimeout(() => {
                    if (this.isAuthenticated() && typeof window.mySpaceManager !== 'undefined') {
                        console.log('hash跳转后手动触发数据加载');
                        window.mySpaceManager.loadMyPrompts();
                    }
                }, 200);
            }
        }, 100);
    }



    // 处理用户登出
    handleUserSignOut(showNotification = true) {
        this.currentUser = null;

        // 清除API缓存，确保下次登录时获取新数据
        if (typeof apiManager !== 'undefined' && typeof apiManager.clearCache === 'function') {
            console.log('用户登出，清除所有API缓存');
            apiManager.clearCache(); // 清除所有缓存
        }

        // 检查当前是否在"我的空间"相关页面，如果是则返回首页
        const currentPage = document.querySelector('.page.active');
        const mySpaceRelatedPages = ['my-space-page', 'prompt-detail-page'];

        if (currentPage && mySpaceRelatedPages.includes(currentPage.id)) {
            console.log(`检测到在${currentPage.id}页面，登出后返回首页`);
            // 关闭所有模态框
            this.closeAllModals();
            // 返回首页
            if (typeof UI !== 'undefined' && typeof UI.showPage === 'function') {
                UI.showPage('home-page');
            } else {
                // 备用方案：直接操作DOM
                document.querySelectorAll('.page').forEach(page => {
                    page.classList.remove('active');
                });
                const homePage = document.getElementById('home-page');
                if (homePage) {
                    homePage.classList.add('active');
                }
            }
        }

        this.updateUI();
        this.notifyAuthCallbacks('signOut', null);

        // 只有在明确指定显示通知时才显示
        if (showNotification) {
            UI.showNotification('已登出', 'success');
        }
    }

    // 关闭所有模态框
    closeAllModals() {
        try {
            // 关闭所有活动的模态框
            const activeModals = document.querySelectorAll('.modal.active');
            activeModals.forEach(modal => {
                modal.classList.remove('active');
                console.log(`关闭模态框: ${modal.id}`);
            });

            // 如果UI类可用，也尝试使用UI的方法
            if (typeof UI !== 'undefined' && typeof UI.hideModal === 'function') {
                // 常见的模态框ID列表（包括我的空间相关的模态框）
                const commonModals = [
                    'prompt-modal',           // 我的空间创建/编辑提示词模态框
                    'prompt-detail-modal',    // 提示词详情模态框（如果存在）
                    'profile-edit-modal',     // 个人资料编辑模态框
                    'login-modal',            // 登录模态框
                    'register-modal',         // 注册模态框
                    'user-manual-modal'       // 使用手册模态框
                ];

                commonModals.forEach(modalId => {
                    const modal = document.getElementById(modalId);
                    if (modal && modal.classList.contains('active')) {
                        UI.hideModal(modalId);
                        console.log(`通过UI.hideModal关闭模态框: ${modalId}`);
                    }
                });
            }
        } catch (error) {
            console.error('关闭模态框时出错:', error);
        }
    }

    // 更新UI
    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const userMenu = document.getElementById('user-menu');
        const mySpaceLink = document.getElementById('my-space-link');

        if (this.currentUser) {
            // 已登录状态
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            if (mySpaceLink) mySpaceLink.style.display = 'flex';

            // 更新用户信息
            const userAvatar = document.getElementById('user-avatar');
            const username = document.getElementById('username');

            if (userAvatar) {
                // 使用增强的头像加载机制，支持多重回退
                const avatarUrl = this.currentUser.avatar_url;
                const username = this.currentUser.username || this.currentUser.email || 'User';

                if (avatarUrl) {
                    APP_CONFIG.loadAvatarWithFallback(userAvatar, avatarUrl, username);
                } else {
                    APP_CONFIG.loadAvatarWithFallback(userAvatar, null, username);
                }

                userAvatar.alt = `${username}的头像`;
            }
            if (username) username.textContent = this.currentUser.username;
        } else {
            // 未登录状态
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (registerBtn) registerBtn.style.display = 'inline-flex';
            if (userMenu) userMenu.style.display = 'none';
            if (mySpaceLink) mySpaceLink.style.display = 'none';
        }
    }

    // 用户登录
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('登录失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 用户注册
    async signUp(email, password, username, bio = '') {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });

            if (error) throw error;

            // 如果注册成功，更新用户资料
            if (data.user && username) {
                // 等待一下让触发器创建用户记录
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 准备更新的数据
                const updateData = { username };
                if (bio && bio.trim()) {
                    updateData.bio = bio.trim();
                }

                const { error: profileError } = await supabase
                    .from('users')
                    .update(updateData)
                    .eq('user_id', data.user.id);

                if (profileError) {
                    console.warn('更新用户资料失败:', profileError);
                    // 如果更新失败，可能是用户记录还没创建，尝试插入
                    const insertData = {
                        user_id: data.user.id,
                        username: username
                    };
                    if (bio && bio.trim()) {
                        insertData.bio = bio.trim();
                    }

                    const { error: insertError } = await supabase
                        .from('users')
                        .insert([insertData]);

                    if (insertError) {
                        console.warn('插入用户记录失败:', insertError);
                    }
                }
            }

            return { success: true, data };
        } catch (error) {
            console.error('注册失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 更新用户资料
    async updateProfile(profileData) {
        try {
            if (!this.currentUser) {
                throw new Error('用户未登录');
            }

            const { username, bio } = profileData;

            // 准备更新数据
            const updateData = {};
            if (username && username.trim()) {
                updateData.username = username.trim();
            }
            if (bio !== undefined) {
                updateData.bio = bio.trim() || null;
            }

            // 更新数据库中的用户信息
            const { data, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('user_id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;

            // 更新本地用户信息
            if (data) {
                this.currentUser = { ...this.currentUser, ...data };
                this.updateUI();
            }

            return { success: true, data };
        } catch (error) {
            console.error('更新用户资料失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 用户登出
    async signOut() {
        try {
            console.log('开始执行登出操作...');

            // 记录登出前的状态
            const beforeLogout = {
                isAuthenticated: this.isAuthenticated(),
                currentUser: this.currentUser?.email || 'none'
            };
            console.log('登出前状态:', beforeLogout);

            // 使用scope: 'global'确保完全登出
            const { error } = await supabase.auth.signOut({ scope: 'global' });

            console.log('Supabase signOut 结果:', { error });

            if (error) {
                console.error('Supabase signOut 错误:', error);
                throw error;
            }

            // 等待一小段时间让事件处理完成
            await new Promise(resolve => setTimeout(resolve, 100));

            // 检查登出后的状态
            const afterLogout = {
                isAuthenticated: this.isAuthenticated(),
                currentUser: this.currentUser?.email || 'none'
            };
            console.log('登出后状态:', afterLogout);

            // 如果Supabase事件没有正确触发，手动处理登出
            if (this.currentUser) {
                console.log('手动触发登出处理...');
                this.handleUserSignOut(true);
            }

            console.log('登出操作成功完成');
            return { success: true };
        } catch (error) {
            console.error('登出失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 检查用户是否已登录
    isAuthenticated() {
        return !!this.currentUser;
    }

    // 获取当前用户
    getCurrentUser() {
        return this.currentUser;
    }

    // 添加认证状态变化回调
    onAuthStateChange(callback) {
        this.authCallbacks.push(callback);
    }

    // 移除认证状态变化回调
    removeAuthStateChange(callback) {
        const index = this.authCallbacks.indexOf(callback);
        if (index > -1) {
            this.authCallbacks.splice(index, 1);
        }
    }

    // 通知认证状态变化回调
    notifyAuthCallbacks(event, user) {
        this.authCallbacks.forEach(callback => {
            try {
                callback(event, user);
            } catch (error) {
                console.error('认证回调执行失败:', error);
            }
        });
    }

    // 需要登录的操作检查
    requireAuth(action = '执行此操作') {
        if (!this.isAuthenticated()) {
            UI.showNotification(`请先登录后再${action}`, 'warning');
            UI.showModal('login-modal');
            return false;
        }
        return true;
    }
}

// 创建全局认证管理器实例（确保只创建一次）
if (!window.authManager) {
    window.authManager = new AuthManager();
}
const authManager = window.authManager;

// 绑定认证相关事件
document.addEventListener('DOMContentLoaded', () => {
    // 登录按钮
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            UI.showModal('login-modal');
        });
    }

    // 注册按钮
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            UI.showModal('register-modal');
        });
    }

    // 登出按钮
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            console.log('用户点击登出按钮');
            try {
                const result = await authManager.signOut();
                console.log('登出结果:', result);
                if (!result.success) {
                    console.error('登出失败:', result.error);
                    UI.showNotification(`登出失败: ${result.error}`, 'error');
                } else {
                    console.log('登出成功');
                    // 登出成功的通知将由认证状态监听器处理
                }
            } catch (error) {
                console.error('登出过程中发生异常:', error);
                UI.showNotification(`登出异常: ${error.message}`, 'error');
            }
        });
    }

    // 登录表单
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            const result = await authManager.signIn(email, password);
            
            if (result.success) {
                UI.hideModal('login-modal');
                loginForm.reset();
            } else {
                UI.showNotification(result.error, 'error');
            }
        });
    }

    // 注册表单
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const username = document.getElementById('register-username').value;
            const bio = document.getElementById('register-bio').value;

            // 验证个人简介长度
            if (bio && bio.length > 200) {
                UI.showNotification('个人简介不能超过200字符', 'error');
                return;
            }

            const result = await authManager.signUp(email, password, username, bio);
            
            if (result.success) {
                UI.hideModal('register-modal');
                registerForm.reset();
                UI.showNotification('注册成功，请检查邮箱验证链接', 'success');
            } else {
                UI.showNotification(result.error, 'error');
            }
        });
    }

    // 个人简介字符计数
    const bioTextarea = document.getElementById('register-bio');
    if (bioTextarea) {
        const helpText = bioTextarea.parentNode.querySelector('.form-help');

        bioTextarea.addEventListener('input', () => {
            const currentLength = bioTextarea.value.length;
            const maxLength = 200;
            const remaining = maxLength - currentLength;

            if (helpText) {
                if (remaining >= 0) {
                    helpText.textContent = `选填，还可输入${remaining}字`;
                    helpText.style.color = 'var(--text-secondary)';
                } else {
                    helpText.textContent = `超出${Math.abs(remaining)}字，请删减内容`;
                    helpText.style.color = 'var(--error-500)';
                }
            }

            // 添加错误样式
            const formGroup = bioTextarea.parentNode;
            if (remaining < 0) {
                formGroup.classList.add('error');
            } else {
                formGroup.classList.remove('error');
            }
        });
    }

    // 个人资料编辑表单
    const profileEditForm = document.getElementById('profile-edit-form');
    if (profileEditForm) {
        profileEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('profile-username').value;
            const bio = document.getElementById('profile-bio').value;

            // 验证个人简介长度
            if (bio && bio.length > 200) {
                UI.showNotification('个人简介不能超过200字符', 'error');
                return;
            }

            const result = await authManager.updateProfile({
                username,
                bio
            });

            if (result.success) {
                UI.hideModal('profile-edit-modal');
                UI.showNotification('个人资料更新成功', 'success');
            } else {
                UI.showNotification(result.error || '更新失败', 'error');
            }
        });
    }

    // 个人资料编辑页面的个人简介字符计数
    const profileBioTextarea = document.getElementById('profile-bio');
    if (profileBioTextarea) {
        const helpText = profileBioTextarea.parentNode.querySelector('.form-help');

        profileBioTextarea.addEventListener('input', () => {
            const currentLength = profileBioTextarea.value.length;
            const maxLength = 200;
            const remaining = maxLength - currentLength;

            if (helpText) {
                if (remaining >= 0) {
                    helpText.textContent = `选填，还可输入${remaining}字`;
                    helpText.style.color = 'var(--text-secondary)';
                } else {
                    helpText.textContent = `超出${Math.abs(remaining)}字，请删减内容`;
                    helpText.style.color = 'var(--error-500)';
                }
            }

            // 添加错误样式
            const formGroup = profileBioTextarea.parentNode;
            if (remaining < 0) {
                formGroup.classList.add('error');
            } else {
                formGroup.classList.remove('error');
            }
        });
    }



    // 绑定用户信息点击事件
    const userInfoClickable = document.getElementById('user-info-clickable');
    if (userInfoClickable) {
        userInfoClickable.addEventListener('click', () => {
            console.log('用户信息被点击');
            try {
                // 优先使用UI.showProfileEdit，如果不可用则使用全局备用函数
                if (typeof UI !== 'undefined' && typeof UI.showProfileEdit === 'function') {
                    UI.showProfileEdit();
                } else if (typeof showProfileEdit === 'function') {
                    showProfileEdit();
                } else {
                    console.error('所有编辑方法都不可用');
                    alert('编辑功能暂时不可用，请刷新页面重试');
                }
            } catch (error) {
                console.error('显示编辑资料失败:', error);
                alert('显示编辑资料失败: ' + error.message);
            }
        });
    }
});
