-- 更新users表中的avatar_url字段，添加测试头像数据
-- 使用多种不同风格的头像服务

-- 方案1: 使用Gravatar风格的头像（基于用户邮箱）
UPDATE users 
SET avatar_url = CASE 
    WHEN id % 10 = 0 THEN 'https://i.pravatar.cc/150?img=1'
    WHEN id % 10 = 1 THEN 'https://i.pravatar.cc/150?img=2'
    WHEN id % 10 = 2 THEN 'https://i.pravatar.cc/150?img=3'
    WHEN id % 10 = 3 THEN 'https://i.pravatar.cc/150?img=4'
    WHEN id % 10 = 4 THEN 'https://i.pravatar.cc/150?img=5'
    WHEN id % 10 = 5 THEN 'https://i.pravatar.cc/150?img=6'
    WHEN id % 10 = 6 THEN 'https://i.pravatar.cc/150?img=7'
    WHEN id % 10 = 7 THEN 'https://i.pravatar.cc/150?img=8'
    WHEN id % 10 = 8 THEN 'https://i.pravatar.cc/150?img=9'
    WHEN id % 10 = 9 THEN 'https://i.pravatar.cc/150?img=10'
END
WHERE avatar_url IS NULL;

-- 方案2: 如果pravatar不可用，使用DiceBear API（卡通风格头像）
-- 取消注释以下代码来使用这个方案：

/*
UPDATE users 
SET avatar_url = CASE 
    WHEN id % 8 = 0 THEN 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || username || '&backgroundColor=b6e3f4'
    WHEN id % 8 = 1 THEN 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || username || '&backgroundColor=c0aede'
    WHEN id % 8 = 2 THEN 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || username || '&backgroundColor=d1d4f9'
    WHEN id % 8 = 3 THEN 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || username || '&backgroundColor=ffd5cc'
    WHEN id % 8 = 4 THEN 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || username || '&backgroundColor=ffdfba'
    WHEN id % 8 = 5 THEN 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || username || '&backgroundColor=c7f9cc'
    WHEN id % 8 = 6 THEN 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || username || '&backgroundColor=ffc9c9'
    WHEN id % 8 = 7 THEN 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || username || '&backgroundColor=b4f8c8'
END
WHERE avatar_url IS NULL;
*/

-- 方案3: 使用UI Avatars（基于用户名首字母）
-- 取消注释以下代码来使用这个方案：

/*
UPDATE users 
SET avatar_url = 'https://ui-avatars.com/api/?name=' || 
    COALESCE(username, email) || 
    '&background=' || 
    CASE 
        WHEN id % 6 = 0 THEN '8b5cf6'
        WHEN id % 6 = 1 THEN '10b981'
        WHEN id % 6 = 2 THEN 'f59e0b'
        WHEN id % 6 = 3 THEN 'ef4444'
        WHEN id % 6 = 4 THEN '3b82f6'
        WHEN id % 6 = 5 THEN 'ec4899'
    END || 
    '&color=ffffff&size=150&font-size=0.6'
WHERE avatar_url IS NULL;
*/

-- 方案4: 混合使用多种头像服务
-- 取消注释以下代码来使用这个方案：

/*
UPDATE users 
SET avatar_url = CASE 
    WHEN id % 15 = 0 THEN 'https://i.pravatar.cc/150?img=' || (id % 70 + 1)
    WHEN id % 15 = 1 THEN 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || username
    WHEN id % 15 = 2 THEN 'https://ui-avatars.com/api/?name=' || COALESCE(username, email) || '&background=8b5cf6&color=ffffff&size=150'
    WHEN id % 15 = 3 THEN 'https://api.dicebear.com/7.x/personas/svg?seed=' || username
    WHEN id % 15 = 4 THEN 'https://ui-avatars.com/api/?name=' || COALESCE(username, email) || '&background=10b981&color=ffffff&size=150'
    WHEN id % 15 = 5 THEN 'https://i.pravatar.cc/150?img=' || (id % 70 + 1)
    WHEN id % 15 = 6 THEN 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=' || username
    WHEN id % 15 = 7 THEN 'https://ui-avatars.com/api/?name=' || COALESCE(username, email) || '&background=f59e0b&color=ffffff&size=150'
    WHEN id % 15 = 8 THEN 'https://api.dicebear.com/7.x/bottts/svg?seed=' || username
    WHEN id % 15 = 9 THEN 'https://ui-avatars.com/api/?name=' || COALESCE(username, email) || '&background=ef4444&color=ffffff&size=150'
    WHEN id % 15 = 10 THEN 'https://i.pravatar.cc/150?img=' || (id % 70 + 1)
    WHEN id % 15 = 11 THEN 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || username
    WHEN id % 15 = 12 THEN 'https://ui-avatars.com/api/?name=' || COALESCE(username, email) || '&background=3b82f6&color=ffffff&size=150'
    WHEN id % 15 = 13 THEN 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' || username
    WHEN id % 15 = 14 THEN 'https://ui-avatars.com/api/?name=' || COALESCE(username, email) || '&background=ec4899&color=ffffff&size=150'
END
WHERE avatar_url IS NULL;
*/

-- 查看更新结果
SELECT id, username, email, avatar_url 
FROM users 
WHERE avatar_url IS NOT NULL 
ORDER BY id 
LIMIT 10;

-- 统计信息
SELECT 
    COUNT(*) as total_users,
    COUNT(avatar_url) as users_with_avatar,
    COUNT(*) - COUNT(avatar_url) as users_without_avatar
FROM users;
