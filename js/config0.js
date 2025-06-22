// Supabase 配置
const SUPABASE_CONFIG = {
    url: 'https://qnqzoxkejxshsxvmprhs.supabase.co', // 请替换为您的 Supabase URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucXpveGtlanhzaHN4dm1wcmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMDQ0NzMsImV4cCI6MjA2NDU4MDQ3M30.ZPBSdEAz-ncPOfAEwwYEJyd3cpF05U-hIQKyOZKCMaw' // 请替换为您的 Supabase 匿名密钥
};

// 应用配置
const APP_CONFIG = {
    name: 'AI提示词宝库',
    description: '发现最佳AI提示词，让您的AI更智能、更高效',
    version: '1.0.0',
    
    // 分页配置
    pagination: {
        defaultPageSize: 12,
        maxPageSize: 50
    },
    
    // 搜索配置
    search: {
        debounceDelay: 300, // 搜索防抖延迟（毫秒）
        minQueryLength: 2   // 最小搜索查询长度
    },
    
    // 通知配置
    notification: {
        duration: 3000, // 通知显示时长（毫秒）
        position: 'top-right'
    },
    
    // 默认头像
    defaultAvatar: 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U',
    
    // API 端点（如果需要）
    api: {
        baseUrl: '', // 如果有额外的 API 服务
        timeout: 10000
    }
};

// 初始化 Supabase 客户端
let supabase;

try {
    if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
        supabase = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey
        );
        console.log('Supabase 客户端初始化成功');
    } else {
        console.warn('请配置 Supabase URL 和 API Key');
    }
} catch (error) {
    console.error('Supabase 客户端初始化失败:', error);
}

// 导出配置（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        APP_CONFIG,
        supabase
    };
}
