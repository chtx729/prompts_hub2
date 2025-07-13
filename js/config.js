// 配置示例文件
// 复制此文件为 js/config.js 并填入您的实际配置

// Supabase 配置
const SUPABASE_CONFIG = {
    // 替换为您的 Supabase 项目 URL
    url: 'https://qnqzoxkejxshsxvmprhs.supabase.co',
    
    // 替换为您的 Supabase 匿名密钥
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucXpveGtlanhzaHN4dm1wcmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMDQ0NzMsImV4cCI6MjA2NDU4MDQ3M30.ZPBSdEAz-ncPOfAEwwYEJyd3cpF05U-hIQKyOZKCMaw'
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
    
    // 默认头像 - 使用更稳定的服务
    defaultAvatar: 'https://ui-avatars.com/api/?name=User&background=8b5cf6&color=ffffff&size=128&font-size=0.6&rounded=true',

    // 备用默认头像（如果主要服务不可用）
    fallbackAvatars: [
        'https://api.dicebear.com/7.x/initials/svg?seed=User&backgroundColor=8b5cf6',
        'https://robohash.org/default.png?size=128x128&set=set4',
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iNjQiIGZpbGw9IiM4YjVjZjYiLz4KPHN2ZyB4PSIzMiIgeT0iMzIiIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzEzLjEgMiAxNCAyLjkgMTQgNEMxNCA1LjEgMTMuMSA2IDEyIDZDMTAuOSA2IDEwIDUuMSAxMCA0QzEwIDIuOSAxMC45IDIgMTIgMlpNMjEgOVYyMkgxNVYxNi41SDlWMjJIM1Y5QzMgNi44IDQuOCA1IDcgNUgxN0MxOS4yIDUgMjEgNi44IDIxIDlaIi8+Cjwvc3ZnPgo8L3N2Zz4K'
    ],

    // 头像加载工具函数
    loadAvatarWithFallback: function(imgElement, primaryUrl, username = 'User') {
        let currentIndex = -1;
        const allUrls = [
            primaryUrl,
            this.defaultAvatar,
            ...this.fallbackAvatars
        ].filter(url => url); // 过滤掉空值

        const tryNextAvatar = () => {
            currentIndex++;
            if (currentIndex >= allUrls.length) {
                // 所有头像都失败了，使用最后的SVG备用方案
                imgElement.src = this.fallbackAvatars[this.fallbackAvatars.length - 1];
                return;
            }

            const currentUrl = allUrls[currentIndex];

            // 如果是用户名相关的服务，替换用户名
            let finalUrl = currentUrl;
            if (currentUrl.includes('name=User') && username !== 'User') {
                finalUrl = currentUrl.replace('name=User', `name=${encodeURIComponent(username)}`);
            }
            if (currentUrl.includes('seed=User') && username !== 'User') {
                finalUrl = currentUrl.replace('seed=User', `seed=${encodeURIComponent(username)}`);
            }

            imgElement.onerror = tryNextAvatar;
            imgElement.src = finalUrl;
        };

        tryNextAvatar();
    },

    // API 配置（如果需要额外的 API 服务）
    api: {
        baseUrl: '',            // 额外 API 服务的基础 URL
        timeout: 10000          // 请求超时时间（毫秒）
    }
};

// 初始化 Supabase 客户端
let supabase;

function initSupabase() {
    try {
        if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
            if (typeof window.supabase !== 'undefined') {
                supabase = window.supabase.createClient(
                    SUPABASE_CONFIG.url,
                    SUPABASE_CONFIG.anonKey
                );
                console.log('✅ Supabase 客户端初始化成功');
                return true;
            } else {
                console.warn('⚠️ Supabase CDN 尚未加载');
                return false;
            }
        } else {
            console.warn('⚠️ 请配置 Supabase URL 和 API Key');
            return false;
        }
    } catch (error) {
        console.error('❌ Supabase 客户端初始化失败:', error);
        return false;
    }
}

// 尝试立即初始化
if (!initSupabase()) {
    // 如果初始化失败，等待 DOM 加载完成后重试
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initSupabase, 100);
    });
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
