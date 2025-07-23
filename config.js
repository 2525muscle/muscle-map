// Google Places API設定
// 注意: 本番環境では環境変数を使用してください

const CONFIG = {
    // Google Places APIキーをここに設定
    GOOGLE_PLACES_API_KEY: 'AIzaSyDVcClDuehOqCfPIRowZ07ZWrIqyNeEtL4',
    
    // 検索設定
    SEARCH_CONFIG: {
        // 岡山県の中心座標
        center: {
            lat: 34.6617,
            lng: 133.9341
        },
        // 検索半径（メートル）
        radius: 50000, // 50km
        // 検索キーワード
        keywords: ['ジム', 'フィットネス', 'スポーツクラブ', 'トレーニング'],
        // 検索タイプ
        types: ['gym', 'health', 'establishment']
    }
};

// 設定をグローバルに公開
window.APP_CONFIG = CONFIG;
