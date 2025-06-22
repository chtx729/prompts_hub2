// 配置示例文件
// 复制此文件为 js/config.js 并填入您的实际配置

// Supabase 配置
const SUPABASE_CONFIG = {
    // 替换为您的 Supabase 项目 URL
    url: 'https://your-project-id.supabase.co',
    
    // 替换为您的 Supabase 匿名密钥
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here'
};

// 应用配置
const APP_CONFIG = {
    name: 'AI提示词宝库',
    description: '发现最佳AI提示词，让您的AI更智能、更高效',
    version: '1.0.0',
    
    // 分页配置
    pagination: {
        defaultPageSize: 12,    // 默认每页显示数量
        maxPageSize: 50         // 最大每页显示数量
    },
    
    // 搜索配置
    search: {
        debounceDelay: 300,     // 搜索防抖延迟（毫秒）
        minQueryLength: 2       // 最小搜索查询长度
    },
    
    // 通知配置
    notification: {
        duration: 3000,         // 通知显示时长（毫秒）
        position: 'top-right'   // 通知位置
    },
    
    // 默认头像
    defaultAvatar: 'https://via.placeholder.com/40x40/4f46e5/ffffff?text=U',
    
    // API 配置（如果需要额外的 API 服务）
    api: {
        baseUrl: '',            // 额外 API 服务的基础 URL
        timeout: 10000          // 请求超时时间（毫秒）
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

/* 
配置说明：

1. Supabase 配置获取方法：
   - 登录 https://supabase.com
   - 选择您的项目
   - 进入 Settings > API
   - 复制 Project URL 和 anon public key

2. 数据库设置：
   - 在 Supabase SQL 编辑器中执行 tables_sql.txt 中的 SQL 语句
   - 确保所有表和触发器都创建成功

3. 可选配置：
   - 可以根据需要调整 APP_CONFIG 中的各项设置
   - 如果需要自定义主题，可以修改 CSS 变量

4. 安全注意事项：
   - anon key 是公开的，可以在前端使用
   - 确保在 Supabase 中正确配置 RLS（行级安全）策略
   - 生产环境建议启用额外的安全措施
*/
