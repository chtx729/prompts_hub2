// 管理后台配置文件
// 复用主站配置并添加管理后台特有配置

// 检查主站配置是否已加载
if (typeof SUPABASE_CONFIG === 'undefined' || typeof supabase === 'undefined') {
    console.error('❌ 主站配置未加载，请确保 config.js 在此文件之前加载');
    throw new Error('主站配置未加载');
}

// 管理后台特有配置
const ADMIN_CONFIG = {
    // 基础信息
    name: 'AI提示词宝库 - 管理后台',
    version: '1.0.0',
    
    // 安全配置
    adminOnly: true,
    sessionTimeout: 30 * 60 * 1000, // 30分钟会话超时
    loginRequired: true,
    maxLoginAttempts: 5, // 最大登录尝试次数
    lockoutDuration: 15 * 60 * 1000, // 锁定时长15分钟
    
    // 分页配置（管理后台通常需要更多数据）
    pagination: {
        defaultPageSize: 20,
        maxPageSize: 100,
        pageSizeOptions: [10, 20, 50, 100]
    },
    
    // 日志配置
    logging: {
        enabled: true,
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        logActions: [
            'login', 'logout', 'create', 'update', 'delete', 
            'view', 'export', 'import', 'config_change'
        ]
    },
    
    // 通知配置
    notification: {
        duration: 5000, // 管理后台通知显示更久
        position: 'top-right',
        showStack: true // 显示通知堆栈
    },
    
    // 数据刷新配置
    refresh: {
        dashboardInterval: 30000, // 30秒刷新数据看板
        autoRefresh: true,
        realTimeUpdates: true
    },
    
    // 导出配置
    export: {
        formats: ['csv', 'json', 'xlsx'],
        maxRecords: 10000,
        batchSize: 1000
    },
    
    // 权限配置
    permissions: {
        modules: {
            dashboard: ['view'],
            users: ['view', 'create', 'update', 'delete', 'export'],
            prompts: ['view', 'create', 'update', 'delete', 'export'],
            categories: ['view', 'create', 'update', 'delete'],
            system: ['view', 'update'],
            logs: ['view', 'export']
        }
    },
    
    // UI配置
    ui: {
        theme: 'light', // 'light', 'dark', 'auto'
        sidebarCollapsed: false,
        tableRowHeight: 'medium', // 'compact', 'medium', 'large'
        showTooltips: true,
        animationsEnabled: true
    },
    
    // API配置
    api: {
        timeout: 15000, // 管理后台API超时时间更长
        retryAttempts: 3,
        retryDelay: 1000,
        batchSize: 50
    }
};

// 初始化管理后台配置
function initAdminConfig() {
    // 合并主站配置
    Object.assign(ADMIN_CONFIG, {
        supabase: SUPABASE_CONFIG,
        app: APP_CONFIG || {}
    });

    console.log('✅ 管理后台配置初始化成功');
    console.log('📊 配置信息:', {
        name: ADMIN_CONFIG.name,
        version: ADMIN_CONFIG.version,
        sessionTimeout: ADMIN_CONFIG.sessionTimeout / 1000 / 60 + '分钟',
        supabaseUrl: SUPABASE_CONFIG.url ? '已配置' : '未配置'
    });

    // 触发配置完成事件
    window.dispatchEvent(new CustomEvent('adminConfigReady', {
        detail: ADMIN_CONFIG
    }));
}

// 立即初始化配置
initAdminConfig();

// 获取配置值的工具函数
function getAdminConfig(key, defaultValue = null) {
    const keys = key.split('.');
    let value = ADMIN_CONFIG;
    
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return defaultValue;
        }
    }
    
    return value;
}

// 更新配置值的工具函数
function setAdminConfig(key, value) {
    const keys = key.split('.');
    let config = ADMIN_CONFIG;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!(k in config) || typeof config[k] !== 'object') {
            config[k] = {};
        }
        config = config[k];
    }
    
    config[keys[keys.length - 1]] = value;
    
    // 记录配置变更
    console.log(`📝 配置更新: ${key} = ${JSON.stringify(value)}`);
}

// 验证管理员权限的工具函数
function hasAdminPermission(module, action) {
    const permissions = getAdminConfig('permissions.modules.' + module, []);
    return permissions.includes(action);
}

// 记录管理员操作的工具函数
function logAdminAction(action, targetType, targetId = null, details = null) {
    if (!getAdminConfig('logging.enabled', false)) {
        return;
    }
    
    const logLevel = getAdminConfig('logging.logLevel', 'info');
    const logActions = getAdminConfig('logging.logActions', []);
    
    if (!logActions.includes(action)) {
        return;
    }
    
    const logData = {
        timestamp: new Date().toISOString(),
        action,
        targetType,
        targetId,
        details,
        userAgent: navigator.userAgent,
        url: window.location.href
    };
    
    // 控制台输出
    if (logLevel === 'debug' || action === 'error') {
        console.log(`🔍 管理员操作:`, logData);
    }
    
    // 这里可以添加发送到服务器的逻辑
    // 在 admin-api.js 中实现具体的日志记录功能
}

// 会话管理工具函数
function getSessionTimeout() {
    return getAdminConfig('sessionTimeout', 30 * 60 * 1000);
}

function isSessionExpired(lastActivity) {
    const timeout = getSessionTimeout();
    return Date.now() - lastActivity > timeout;
}

// 导出配置对象和工具函数
if (typeof window !== 'undefined') {
    window.ADMIN_CONFIG = ADMIN_CONFIG;
    window.getAdminConfig = getAdminConfig;
    window.setAdminConfig = setAdminConfig;
    window.hasAdminPermission = hasAdminPermission;
    window.logAdminAction = logAdminAction;
    window.getSessionTimeout = getSessionTimeout;
    window.isSessionExpired = isSessionExpired;
}

// 模块导出（如果支持）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ADMIN_CONFIG,
        getAdminConfig,
        setAdminConfig,
        hasAdminPermission,
        logAdminAction,
        getSessionTimeout,
        isSessionExpired
    };
}
