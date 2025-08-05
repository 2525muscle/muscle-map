// 動的メニュー設定ファイル
// AdSense審査対応 + 将来拡張可能な構成

const menuConfig = {
    // メニュー項目の定義
    items: [
        {
            id: 'home',
            name: '🏠 トップ',
            route: '#',
            page: 'map',
            type: 'page',
            visible: true,
            order: 1
        },
        {
            id: 'columns',
            name: '📖 おすすめジムコラム',
            route: 'articles.html',
            type: 'external',
            visible: false, // 一時的に非表示
            order: 2,
            // 将来のカテゴリ階層対応
            children: [
                {
                    id: 'training-tips',
                    name: 'トレーニング方法',
                    route: '/columns/training',
                    visible: false // 将来実装予定
                },
                {
                    id: 'nutrition',
                    name: '栄養・食事',
                    route: '/columns/nutrition',
                    visible: false // 将来実装予定
                },
                {
                    id: 'equipment',
                    name: '器具紹介',
                    route: '/columns/equipment',
                    visible: false // 将来実装予定
                }
            ]
        },
        {
            id: 'about',
            name: '👤 運営者情報',
            route: '#',
            page: 'about',
            type: 'page',
            visible: true,
            order: 3,
            // AdSense審査必須項目
            adsenseRequired: true
        },
        {
            id: 'privacy',
            name: '🔐 プライバシーポリシー',
            route: '#',
            page: 'privacy',
            type: 'page',
            visible: true,
            order: 4,
            // AdSense審査必須項目
            adsenseRequired: true
        },
        {
            id: 'contact',
            name: '📩 お問い合わせ',
            route: '#',
            page: 'contact',
            type: 'page',
            visible: true,
            order: 5,
            // AdSense審査必須項目
            adsenseRequired: true
        }
    ],

    // メニュー表示設定
    settings: {
        // ハンバーガーメニューの設定
        hamburger: {
            enabled: true,
            position: 'right', // left, right
            animation: 'slide', // slide, fade, scale
            closeOnClick: true
        },
        
        // サイドメニューの設定
        sidebar: {
            enabled: false, // 将来実装予定
            position: 'left',
            width: '280px'
        },

        // AdSense審査対応設定
        adsense: {
            showRequiredPages: true,
            hideInternalLinks: false
        }
    },

    // メニュー生成用のヘルパー関数
    getVisibleItems: function() {
        return this.items
            .filter(item => item.visible)
            .sort((a, b) => a.order - b.order);
    },

    getItemById: function(id) {
        return this.items.find(item => item.id === id);
    },

    getAdsenseRequiredItems: function() {
        return this.items.filter(item => item.adsenseRequired);
    },

    // 将来のカテゴリ階層対応
    getItemsWithChildren: function() {
        return this.items.filter(item => item.children && item.children.length > 0);
    }
};

// グローバルに公開
window.menuConfig = menuConfig;
