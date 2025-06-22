// API 接口管理
class APIManager {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10分钟缓存
        this.longCacheTimeout = 30 * 60 * 1000; // 30分钟长缓存（用于分类等相对静态数据）
        this.requestQueue = new Map(); // 请求队列，防止重复请求
    }

    // 获取缓存键
    getCacheKey(table, params) {
        return `${table}_${JSON.stringify(params)}`;
    }

    // 检查缓存
    getFromCache(key, isLongCache = false) {
        const cached = this.cache.get(key);
        const timeout = isLongCache ? this.longCacheTimeout : this.cacheTimeout;
        if (cached && Date.now() - cached.timestamp < timeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    // 设置缓存
    setCache(key, data, isLongCache = false) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            isLongCache
        });
    }

    // 防重复请求
    async dedupeRequest(key, requestFn) {
        if (this.requestQueue.has(key)) {
            return this.requestQueue.get(key);
        }

        const promise = requestFn();
        this.requestQueue.set(key, promise);

        try {
            const result = await promise;
            return result;
        } finally {
            this.requestQueue.delete(key);
        }
    }

    // 清除缓存
    clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    // 获取分类列表
    async getCategories() {
        const cacheKey = this.getCacheKey('categories', {});
        const cached = this.getFromCache(cacheKey, true); // 使用长缓存
        if (cached) return cached;

        return this.dedupeRequest(cacheKey, async () => {
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('category_id, name, slug, icon, color, sort_order') // 只选择需要的字段
                    .eq('is_active', true)
                    .order('sort_order');

                if (error) throw error;

                const result = { success: true, data };
                this.setCache(cacheKey, result, true); // 使用长缓存
                return result;
            } catch (error) {
                console.error('获取分类失败:', error);
                return { success: false, error: error.message };
            }
        });
    }

    // 获取提示词列表
    async getPrompts(params = {}) {
        const {
            page = 1,
            pageSize = APP_CONFIG.pagination.defaultPageSize,
            search = '',
            category = '',
            sortBy = 'created_at',
            sortOrder = 'desc',
            tags = [],
            userId = null
        } = params;

        const cacheKey = this.getCacheKey('prompts', params);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        return this.dedupeRequest(cacheKey, async () => {
            try {
                // 使用简化查询，避免关联查询问题
                let query = supabase
                    .from('prompts')
                    .select(`
                        prompt_id,
                        title,
                        description,
                        content,
                        tags,
                        status,
                        is_public,
                        created_at,
                        updated_at,
                        view_count,
                        use_count,
                        like_count,
                        rating_average,
                        category_id,
                        user_id
                    `, { count: 'exact' });

            // 基础过滤条件
            if (!userId) {
                // 首页：显示所有公开的已发布提示词
                query = query.eq('status', 'published').eq('is_public', true);
            } else {
                // 用户空间：显示指定用户的提示词
                query = query.eq('user_id', userId);
            }

            // 搜索条件
            if (search) {
                query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`);
            }

            // 分类过滤
            if (category) {
                query = query.eq('category_id', category);
            }

            // 标签过滤
            if (tags.length > 0) {
                query = query.overlaps('tags', tags);
            }

            // 排序
            query = query.order(sortBy, { ascending: sortOrder === 'asc' });

            // 分页
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

                const { data, error, count } = await query;

                if (error) throw error;

                // 手动关联分类和用户信息
                let processedData = data;
                if (data && data.length > 0) {
                    // 获取分类信息
                    const categoryIds = [...new Set(data.map(p => p.category_id).filter(id => id))];
                    let categoryMap = {};

                    if (categoryIds.length > 0) {
                        try {
                            const { data: categories } = await supabase
                                .from('categories')
                                .select('category_id, name, slug, icon, color')
                                .in('category_id', categoryIds);

                            if (categories) {
                                categories.forEach(cat => {
                                    categoryMap[cat.category_id] = cat;
                                });
                            }
                        } catch (catError) {
                            console.warn('获取分类信息失败:', catError);
                        }
                    }

                    // 获取用户信息
                    const userIds = [...new Set(data.map(p => p.user_id).filter(id => id))];
                    let userMap = {};

                    if (userIds.length > 0) {
                        try {
                            // 从users表获取用户信息
                            const { data: users } = await supabase
                                .from('users')
                                .select('user_id, username, avatar_url')
                                .in('user_id', userIds);

                            if (users) {
                                users.forEach(user => {
                                    userMap[user.user_id] = user;
                                });
                            }
                        } catch (userError) {
                            console.warn('获取用户信息失败，使用默认值:', userError);
                        }
                    }

                    // 处理关联数据
                    processedData = data.map(item => {
                        // 处理分类信息
                        const category = categoryMap[item.category_id];
                        if (category) {
                            item.category_name = category.name;
                            item.categories = category;
                        }

                        // 处理作者信息
                        const user = userMap[item.user_id];
                        if (user) {
                            item.author_name = user.username;
                            item.author_avatar = user.avatar_url;
                        } else {
                            item.author_name = '匿名用户';
                            item.author_avatar = APP_CONFIG.defaultAvatar;
                        }

                        return item;
                    });
                }

                const result = {
                    success: true,
                    data: processedData,
                    pagination: {
                        page,
                        pageSize,
                        total: count,
                        totalPages: Math.ceil(count / pageSize)
                    }
                };

                this.setCache(cacheKey, result);
                return result;
            } catch (error) {
                console.error('获取提示词失败:', error);
                return { success: false, error: error.message };
            }
        });
    }

    // 获取单个提示词详情
    async getPrompt(id) {
        const cacheKey = this.getCacheKey('prompt', { id });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const { data, error } = await supabase
                .from('prompts')
                .select('*')
                .eq('prompt_id', id)
                .single();

            if (error) throw error;

            // 处理数据格式
            if (data) {
                // 获取分类信息
                if (data.category_id) {
                    try {
                        const { data: category } = await supabase
                            .from('categories')
                            .select('category_id, name, slug, icon, color')
                            .eq('category_id', data.category_id)
                            .single();

                        if (category) {
                            data.category_name = category.name;
                            data.categories = category;
                        }
                    } catch (catError) {
                        console.warn('获取分类信息失败:', catError);
                    }
                }

                // 获取用户信息
                if (data.user_id) {
                    try {
                        const { data: user } = await supabase
                            .from('users')
                            .select('username, avatar_url')
                            .eq('user_id', data.user_id)
                            .single();

                        if (user) {
                            data.author_name = user.username;
                            data.author_avatar = user.avatar_url;
                        } else {
                            data.author_name = '匿名用户';
                            data.author_avatar = APP_CONFIG.defaultAvatar;
                        }
                    } catch (userError) {
                        console.warn('获取用户信息失败:', userError);
                        data.author_name = '匿名用户';
                        data.author_avatar = APP_CONFIG.defaultAvatar;
                    }
                }
            }

            this.setCache(cacheKey, { success: true, data });
            return { success: true, data };
        } catch (error) {
            console.error('获取提示词详情失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 获取我的提示词列表
    async getMyPrompts(params = {}) {
        const userId = authManager.getCurrentUser()?.id;
        if (!userId) {
            return { success: false, error: '请先登录' };
        }

        const {
            page = 1,
            pageSize = APP_CONFIG.pagination.defaultPageSize,
            search = '',
            category = '',
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = params;

        const cacheKey = this.getCacheKey('my-prompts', params);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            let query = supabase
                .from('prompts')
                .select('*', { count: 'exact' })
                .eq('user_id', userId);

            // 搜索过滤
            if (search) {
                query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`);
            }

            // 分类过滤
            if (category) {
                query = query.eq('category_id', category);
            }

            // 排序
            query = query.order(sortBy, { ascending: sortOrder === 'asc' });

            // 分页
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            // 手动关联分类和用户信息
            let processedData = data;
            if (data && data.length > 0) {
                // 获取分类信息
                const categoryIds = [...new Set(data.map(p => p.category_id).filter(id => id))];
                let categoryMap = {};

                if (categoryIds.length > 0) {
                    try {
                        const { data: categories } = await supabase
                            .from('categories')
                            .select('category_id, name, slug, icon, color')
                            .in('category_id', categoryIds);

                        if (categories) {
                            categories.forEach(cat => {
                                categoryMap[cat.category_id] = cat;
                            });
                        }
                    } catch (catError) {
                        console.warn('获取分类信息失败:', catError);
                    }
                }

                // 获取当前用户信息
                let currentUser = null;
                try {
                    const { data: user } = await supabase
                        .from('users')
                        .select('username, avatar_url')
                        .eq('user_id', userId)
                        .single();
                    currentUser = user;
                } catch (userError) {
                    console.warn('获取当前用户信息失败:', userError);
                }

                // 处理数据格式
                processedData = data.map(item => {
                    // 处理分类信息
                    const category = categoryMap[item.category_id];
                    if (category) {
                        item.category_name = category.name;
                        item.categories = category;
                    }

                    // 处理作者信息（我的提示词，作者就是当前用户）
                    if (currentUser) {
                        item.author_name = currentUser.username;
                        item.author_avatar = currentUser.avatar_url;
                    } else {
                        item.author_name = '我';
                        item.author_avatar = APP_CONFIG.defaultAvatar;
                    }

                    return item;
                });
            }

            const result = {
                success: true,
                data: processedData,
                pagination: {
                    page,
                    pageSize,
                    total: count,
                    totalPages: Math.ceil(count / pageSize)
                }
            };

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('获取我的提示词失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 创建提示词
    async createPrompt(promptData) {
        try {
            const { data, error } = await supabase
                .from('prompts')
                .insert([{
                    ...promptData,
                    user_id: authManager.getCurrentUser()?.id,
                    slug: this.generateSlug(promptData.title),
                    status: 'published',
                    published_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            this.clearCache('prompts');
            return { success: true, data };
        } catch (error) {
            console.error('创建提示词失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 更新提示词
    async updatePrompt(id, promptData) {
        try {
            const { data, error } = await supabase
                .from('prompts')
                .update({
                    ...promptData,
                    updated_at: new Date().toISOString()
                })
                .eq('prompt_id', id)
                .eq('user_id', authManager.getCurrentUser()?.id)
                .select()
                .single();

            if (error) throw error;

            this.clearCache('prompts');
            this.clearCache('prompt');
            return { success: true, data };
        } catch (error) {
            console.error('更新提示词失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 删除提示词
    async deletePrompt(id) {
        try {
            const { error } = await supabase
                .from('prompts')
                .delete()
                .eq('prompt_id', id)
                .eq('user_id', authManager.getCurrentUser()?.id);

            if (error) throw error;

            this.clearCache('prompts');
            this.clearCache('prompt');
            return { success: true };
        } catch (error) {
            console.error('删除提示词失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 点赞/取消点赞
    async toggleLike(promptId) {
        const userId = authManager.getCurrentUser()?.id;
        if (!userId) return { success: false, error: '请先登录' };

        // 验证userId是否为有效的UUID格式
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
            console.error('用户ID不是有效的UUID格式:', userId);
            return { success: false, error: '用户身份验证失败' };
        }

        try {
            // 检查是否已点赞
            const { data: existingLike } = await supabase
                .from('user_likes')
                .select('like_id')
                .eq('user_id', userId)
                .eq('prompt_id', promptId)
                .single();

            if (existingLike) {
                // 取消点赞
                const { error } = await supabase
                    .from('user_likes')
                    .delete()
                    .eq('like_id', existingLike.like_id);

                if (error) throw error;
                return { success: true, liked: false };
            } else {
                // 添加点赞
                const { error } = await supabase
                    .from('user_likes')
                    .insert([{ user_id: userId, prompt_id: promptId }]);

                if (error) throw error;
                return { success: true, liked: true };
            }
        } catch (error) {
            console.error('点赞操作失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 收藏/取消收藏
    async toggleFavorite(promptId) {
        const userId = authManager.getCurrentUser()?.id;
        if (!userId) return { success: false, error: '请先登录' };

        // 验证userId是否为有效的UUID格式
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
            console.error('用户ID不是有效的UUID格式:', userId);
            return { success: false, error: '用户身份验证失败' };
        }

        try {
            // 检查是否已收藏
            const { data: existingFavorite } = await supabase
                .from('user_favorites')
                .select('favorite_id')
                .eq('user_id', userId)
                .eq('prompt_id', promptId)
                .single();

            if (existingFavorite) {
                // 取消收藏
                const { error } = await supabase
                    .from('user_favorites')
                    .delete()
                    .eq('favorite_id', existingFavorite.favorite_id);

                if (error) throw error;
                return { success: true, favorited: false };
            } else {
                // 添加收藏
                const { error } = await supabase
                    .from('user_favorites')
                    .insert([{ user_id: userId, prompt_id: promptId }]);

                if (error) throw error;
                return { success: true, favorited: true };
            }
        } catch (error) {
            console.error('收藏操作失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 记录使用日志
    async logUsage(promptId, actionType = 'use') {
        try {
            const userId = authManager.getCurrentUser()?.id;

            // 如果用户未登录或userId无效，仍然记录日志但user_id为null
            let validUserId = null;
            if (userId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(userId)) {
                    validUserId = userId;
                } else {
                    console.warn('用户ID不是有效的UUID格式，记录匿名使用日志:', userId);
                }
            }

            const { error } = await supabase
                .from('usage_logs')
                .insert([{
                    user_id: validUserId,
                    prompt_id: promptId,
                    action_type: actionType
                }]);

            if (error) throw error;

            // 更新使用计数
            if (actionType === 'use' || actionType === 'copy') {
                await supabase.rpc('increment_use_count', { prompt_id: promptId });
            } else if (actionType === 'view') {
                await supabase.rpc('increment_view_count', { prompt_id: promptId });
            }

            return { success: true };
        } catch (error) {
            console.error('记录使用日志失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 生成 slug
    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            + '-' + Date.now();
    }

    // 获取用户的点赞和收藏状态
    async getUserInteractions(promptIds) {
        const userId = authManager.getCurrentUser()?.id;
        if (!userId || !promptIds.length) {
            return { success: true, data: { likes: [], favorites: [] } };
        }

        // 验证userId是否为有效的UUID格式
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
            console.warn('用户ID不是有效的UUID格式:', userId);
            return { success: true, data: { likes: [], favorites: [] } };
        }

        const cacheKey = this.getCacheKey('user-interactions', { userId, promptIds: promptIds.sort() });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        return this.dedupeRequest(cacheKey, async () => {
            try {
                const [likesResult, favoritesResult] = await Promise.all([
                    supabase
                        .from('user_likes')
                        .select('prompt_id')
                        .eq('user_id', userId)
                        .in('prompt_id', promptIds),
                    supabase
                        .from('user_favorites')
                        .select('prompt_id')
                        .eq('user_id', userId)
                        .in('prompt_id', promptIds)
                ]);

                if (likesResult.error) {
                    console.error('查询点赞状态失败:', likesResult.error);
                    return { success: true, data: { likes: [], favorites: [] } };
                }

                if (favoritesResult.error) {
                    console.error('查询收藏状态失败:', favoritesResult.error);
                    return { success: true, data: { likes: [], favorites: [] } };
                }

                const result = {
                    success: true,
                    data: {
                        likes: likesResult.data?.map(item => item.prompt_id) || [],
                        favorites: favoritesResult.data?.map(item => item.prompt_id) || []
                    }
                };

                this.setCache(cacheKey, result);
                return result;
            } catch (error) {
                console.error('获取用户交互状态失败:', error);
                // 即使获取交互状态失败，也不应该影响主要功能
                return { success: true, data: { likes: [], favorites: [] } };
            }
        });
    }

    // 获取热门标签
    async getPopularTags(limit = 10) {
        const cacheKey = this.getCacheKey('popular-tags', { limit });
        const cached = this.getFromCache(cacheKey, true); // 使用长缓存
        if (cached) return cached;

        return this.dedupeRequest(cacheKey, async () => {
            try {
                // 使用数据库函数来获取热门标签，避免在前端处理大量数据
                const { data, error } = await supabase.rpc('get_popular_tags', {
                    tag_limit: limit
                });

                if (error) {
                    // 如果数据库函数不存在，回退到原始方法
                    console.warn('数据库函数get_popular_tags不存在，使用备用方法');
                    return this.getPopularTagsFallback(limit);
                }

                const result = {
                    success: true,
                    data: data || []
                };

                this.setCache(cacheKey, result, true); // 使用长缓存
                return result;
            } catch (error) {
                console.error('获取热门标签失败:', error);
                return this.getPopularTagsFallback(limit);
            }
        });
    }

    // 热门标签备用方法
    async getPopularTagsFallback(limit = 10) {
        try {
            // 只获取标签字段，减少数据传输
            const { data, error } = await supabase
                .from('prompts')
                .select('tags')
                .eq('status', 'published')
                .eq('is_public', true)
                .not('tags', 'is', null)
                .limit(1000); // 限制查询数量

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
            const popularTags = Object.entries(tagCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);

            return {
                success: true,
                data: popularTags.length > 0 ? popularTags : [
                    { name: '写作', count: 0 },
                    { name: '编程', count: 0 },
                    { name: '营销', count: 0 },
                    { name: 'AI', count: 0 },
                    { name: '创意', count: 0 }
                ]
            };
        } catch (error) {
            console.error('获取热门标签备用方法失败:', error);
            return {
                success: true,
                data: [
                    { name: '写作', count: 0 },
                    { name: '编程', count: 0 },
                    { name: '营销', count: 0 },
                    { name: 'AI', count: 0 },
                    { name: '创意', count: 0 }
                ]
            };
        }
    }
}

// 创建全局 API 管理器实例
const apiManager = new APIManager();
