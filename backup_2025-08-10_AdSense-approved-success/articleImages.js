// 記事画像設定ファイル
// 各記事に対応する専用画像を管理

const articleImages = {
    // 記事画像の設定
    images: {
        // 記事1: 初めてのジム選び
        article1: {
            id: 'article1',
            title: '初めてのジム選びで迷ったら？初心者が安心して始められる方法',
            category: 'gym-selection',
            thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
            alt: 'ジム初心者向け - モダンなフィットネスジムの内観',
            description: '初心者に優しいジムの雰囲気'
        },

        // 記事2: ベンチプレス週2回
        article2: {
            id: 'article2',
            title: 'トレーニングが続かない時は、ベンチプレスだけを週2回やる方法',
            category: 'bench-press',
            thumbnail: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
            alt: 'ベンチプレス - 効果的なトレーニング方法',
            description: 'ベンチプレスに集中したトレーニング'
        },

        // 記事3: 自宅トレーニング
        article3: {
            id: 'article3',
            title: '自宅トレーニングで結果を出すための5つのコツ',
            category: 'home-training',
            thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
            alt: '自宅トレーニング - ホームワークアウト環境',
            description: '自宅でできる効果的なトレーニング'
        },

        // 記事4: 筋トレ食事
        article4: {
            id: 'article4',
            title: '筋トレ効果を最大化する食事のタイミングと内容',
            category: 'nutrition',
            thumbnail: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
            alt: '筋トレ食事 - プロテインと栄養バランス',
            description: '筋トレに最適な栄養摂取'
        },

        // 記事5: モチベーション維持
        article5: {
            id: 'article5',
            title: 'モチベーションが下がった時の対処法と継続のコツ',
            category: 'motivation',
            thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
            alt: 'モチベーション維持 - 継続の重要性',
            description: 'トレーニング継続のためのマインドセット'
        }
    },

    // カテゴリ別のデフォルト画像
    categoryDefaults: {
        'gym-selection': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'bench-press': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'home-training': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'nutrition': 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'motivation': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'equipment': 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'training-tips': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    },

    // ヘルパー関数
    getImageByArticleId: function(articleId) {
        return this.images[articleId] || null;
    },

    getImageByCategory: function(category) {
        return this.categoryDefaults[category] || this.categoryDefaults['gym-selection'];
    },

    getAllImages: function() {
        return Object.values(this.images);
    },

    // 新しい記事画像を追加
    addArticleImage: function(articleId, imageData) {
        this.images[articleId] = {
            id: articleId,
            ...imageData
        };
    },

    // 記事画像を更新
    updateArticleImage: function(articleId, updates) {
        if (this.images[articleId]) {
            this.images[articleId] = {
                ...this.images[articleId],
                ...updates
            };
        }
    },

    // 記事画像を削除
    removeArticleImage: function(articleId) {
        delete this.images[articleId];
    }
};

// グローバルに公開
window.articleImages = articleImages;
