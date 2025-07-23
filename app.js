// 岡山県内のジムデータ（サンプル）
const gymData = [
    {
        name: "コナミスポーツクラブ岡山",
        address: "岡山県岡山市北区駅前町1-8-18",
        lat: 34.6617,
        lng: 133.9341,
        type: "総合ジム"
    },
    {
        name: "エニタイムフィットネス岡山駅前店",
        address: "岡山県岡山市北区本町6-36",
        lat: 34.6603,
        lng: 133.9348,
        type: "24時間ジム"
    },
    {
        name: "ジョイフィット岡山",
        address: "岡山県岡山市北区表町1-4-64",
        lat: 34.6644,
        lng: 133.9189,
        type: "フィットネス"
    },
    {
        name: "カーブス岡山表町",
        address: "岡山県岡山市北区表町2-3-12",
        lat: 34.6651,
        lng: 133.9201,
        type: "女性専用"
    },
    {
        name: "ゴールドジム岡山",
        address: "岡山県岡山市北区問屋町15-101",
        lat: 34.6789,
        lng: 133.8956,
        type: "ボディビル"
    },
    {
        name: "スポーツクラブルネサンス岡山",
        address: "岡山県岡山市北区今保110",
        lat: 34.6234,
        lng: 133.8789,
        type: "総合ジム"
    },
    {
        name: "エニタイムフィットネス倉敷店",
        address: "岡山県倉敷市阿知2-23-10",
        lat: 34.5956,
        lng: 133.7722,
        type: "24時間ジム"
    },
    {
        name: "コナミスポーツクラブ倉敷",
        address: "岡山県倉敷市笹沖1274-1",
        lat: 34.5834,
        lng: 133.7456,
        type: "総合ジム"
    },
    {
        name: "ジョイフィット津山",
        address: "岡山県津山市河辺1000-1",
        lat: 35.0645,
        lng: 134.0056,
        type: "フィットネス"
    },
    {
        name: "カーブス津山",
        address: "岡山県津山市山下30-9",
        lat: 35.0689,
        lng: 134.0034,
        type: "女性専用"
    }
];

// 地図とマーカーの管理
let map;
let markers = [];
let placesService = null;
let isGoogleMapsLoaded = false;
let isAppInitialized = false; // アプリ初期化フラグ

function initMap() {
    // 既に地図が初期化されている場合はスキップ
    if (map) {
        console.log('地図は既に初期化済みです');
        return;
    }
    
    // DOM要素の存在確認
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('地図コンテナが見つかりません');
        return;
    }
    
    // コンテナのクリーンアップ
    mapContainer.innerHTML = '';
    
    console.log('地図を初期化中...');
    
    // 岡山県の中心座標で地図を初期化
    try {
        map = L.map('map').setView([34.6617, 133.9341], 10);
        console.log('地図初期化成功');
    } catch (error) {
        console.error('地図初期化エラー:', error);
        map = null; // エラー時はリセット
        return;
    }
    
    // OpenStreetMapタイルレイヤーを追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(map);
    
    // ジムマーカーを追加
    addGymMarkers();
    
    // サイドバーにジム一覧を表示
    displayGymList();
}

function addGymMarkers() {
    gymData.forEach((gym, index) => {
        // 高品質カスタムアイコンの作成
        const gymIcon = L.divIcon({
            className: 'gym-marker',
            html: `<div style="
                background: linear-gradient(135deg, ${getTypeColor(gym.type)}, ${getDarkerColor(gym.type)});
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                position: relative;
                transition: all 0.3s ease;
            " class="gym-pin-icon">
                <div style="color: white; font-size: 20px; font-weight: bold;">${getGymSymbol(gym.type)}</div>
                <div style="
                    position: absolute;
                    bottom: -8px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-top: 8px solid ${getTypeColor(gym.type)};
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
                "></div>
            </div>`,
            iconSize: [40, 48],
            iconAnchor: [20, 48]
        });
        
        // マーカーを作成
        const marker = L.marker([gym.lat, gym.lng], { icon: gymIcon })
            .addTo(map)
            .bindPopup(`
                <div style="min-width: 200px;">
                    <h4 style="margin: 0 0 10px 0; color: #2c3e50;">${gym.name}</h4>
                    <p style="margin: 5px 0; color: #7f8c8d; font-size: 14px;">📍 ${gym.address}</p>
                    <span style="
                        background-color: ${getTypeColor(gym.type)};
                        color: white;
                        padding: 3px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                    ">${gym.type}</span>
                </div>
            `);
        
        // 店名ラベルを常時表示
        const label = L.divIcon({
            className: 'gym-label',
            html: `<div style="
                background-color: rgba(255, 255, 255, 0.95);
                color: #2c3e50;
                padding: 5px 10px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: bold;
                border: 1px solid #ddd;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                white-space: nowrap;
                text-align: center;
                backdrop-filter: blur(2px);
            ">${gym.name}</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, -55] // 新しいアイコンサイズに合わせて調整
        });
        
        const labelMarker = L.marker([gym.lat, gym.lng], { icon: label })
            .addTo(map);
        
        markers.push(marker);
        markers.push(labelMarker);
    });
}

function displayGymList() {
    const gymListElement = document.getElementById('gym-list');
    
    const gymListHTML = gymData.map((gym, index) => `
        <div class="gym-info" onclick="focusOnGym(${index})">
            <div class="gym-name">${gym.name}</div>
            <div class="gym-address">${gym.address}</div>
            <span class="gym-type" style="background-color: ${getTypeColor(gym.type)};">${gym.type}</span>
        </div>
    `).join('');
    
    gymListElement.innerHTML = gymListHTML;
}

function focusOnGym(index) {
    const gym = gymData[index];
    const marker = markers[index];
    
    // 地図をジムの位置に移動
    map.setView([gym.lat, gym.lng], 15);
    
    // マーカーのポップアップを開く
    marker.openPopup();
}

function getTypeColor(type) {
    const colors = {
        '総合ジム': '#3498db',
        '24時間ジム': '#e74c3c',
        'フィットネス': '#2ecc71',
        '女性専用': '#e91e63',
        'ボディビル': '#f39c12'
    };
    return colors[type] || '#95a5a6';
}

function getDarkerColor(type) {
    const colors = {
        '総合ジム': '#2980b9',
        '24時間ジム': '#c0392b',
        'フィットネス': '#27ae60',
        '女性専用': '#ad1457',
        'ボディビル': '#e67e22'
    };
    return colors[type] || '#7f8c8d';
}

function getGymSymbol(type) {
    const symbols = {
        '総合ジム': '🏋️',
        '24時間ジム': '🕰️',
        'フィットネス': '🏃',
        '女性専用': '👩',
        'ボディビル': '💪'
    };
    return symbols[type] || '🏋️';
}

// Google Maps API読み込み完了時のコールバック
window.initGoogleMaps = function() {
    console.log('Google Maps API読み込み完了');
    isGoogleMapsLoaded = true;
    
    // Places APIサービスを初期化
    if (window.PlacesAPIService) {
        placesService = new PlacesAPIService();
        
        // 地図が既に初期化されている場合、Places Serviceを設定
        if (map) {
            placesService.initializeService(map.getContainer());
        }
    }
    
    // Google Places APIからジム情報を取得するボタンを表示
    showPlacesAPIControls();
};

// Places API制御ボタンを表示
function showPlacesAPIControls() {
    const sidebar = document.querySelector('.sidebar');
    
    // 既存のボタンがある場合は削除
    const existingButton = document.getElementById('fetch-places-btn');
    if (existingButton) {
        existingButton.remove();
    }
    
    // Places API取得ボタンを作成
    const fetchButton = document.createElement('button');
    fetchButton.id = 'fetch-places-btn';
    fetchButton.innerHTML = '🔄 Google Placesからジム情報を取得';
    fetchButton.style.cssText = `
        width: 100%;
        padding: 12px;
        margin: 10px 0;
        background: linear-gradient(135deg, #3498db, #2980b9);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
    `;
    
    fetchButton.addEventListener('click', fetchGymsFromPlaces);
    fetchButton.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.3)';
    });
    fetchButton.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'none';
    });
    
    // ジムリストの前に挿入
    const gymList = document.getElementById('gym-list');
    sidebar.insertBefore(fetchButton, gymList);
}

// Google Places APIからジム情報を取得
async function fetchGymsFromPlaces() {
    if (!placesService || !isGoogleMapsLoaded) {
        alert('Google Places APIが利用できません。APIキーを確認してください。');
        return;
    }
    
    const button = document.getElementById('fetch-places-btn');
    const originalText = button.innerHTML;
    
    try {
        // ローディング状態
        button.innerHTML = '⏳ 取得中...';
        button.disabled = true;
        
        // Places APIでジム検索
        const places = await placesService.searchGymsInOkayama();
        console.log(`${places.length}件のジムが見つかりました`);
        
        // 詳細情報を取得
        const detailedGyms = [];
        for (let i = 0; i < Math.min(places.length, 20); i++) { // 最大20件
            try {
                const details = await placesService.getPlaceDetails(places[i].place_id);
                const gymData = placesService.convertToGymData(places[i], details);
                detailedGyms.push(gymData);
                
                // プログレス表示
                button.innerHTML = `⏳ 取得中... (${i + 1}/${Math.min(places.length, 20)})`;
            } catch (error) {
                console.error('詳細情報取得エラー:', error);
            }
        }
        
        // 既存のマーカーをクリア
        clearMarkers();
        
        // 新しいデータで更新
        gymData.length = 0; // 既存データをクリア
        gymData.push(...detailedGyms);
        
        // 地図とリストを更新
        addGymMarkers();
        populateGymList();
        
        button.innerHTML = `✅ ${detailedGyms.length}件取得完了`;
        
        // 3秒後に元のテキストに戻す
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 3000);
        
    } catch (error) {
        console.error('Places API取得エラー:', error);
        button.innerHTML = '❌ 取得失敗';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 3000);
    }
}

// マーカーをクリア
function clearMarkers() {
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
}

// CSVアップロード機能を追加
function addCSVUploadControls() {
    const sidebar = document.querySelector('.sidebar');
    
    // CSVアップロードセクションを作成
    const csvSection = document.createElement('div');
    csvSection.id = 'csv-upload-section';
    csvSection.style.cssText = `
        margin: 15px 0;
        padding: 15px;
        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
        border-radius: 10px;
        border: 2px dashed #6c757d;
    `;
    
    csvSection.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #495057; font-size: 16px;">
            📊 CSVからジム情報をインポート
        </h3>
        <input type="file" id="csv-file-input" accept=".csv" style="
            width: 100%;
            padding: 8px;
            margin: 5px 0;
            border: 1px solid #ced4da;
            border-radius: 5px;
            background: white;
        ">
        <button id="csv-upload-btn" style="
            width: 100%;
            padding: 10px;
            margin: 5px 0;
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            border: none;
            border-radius: 5px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        ">📤 CSVをアップロード</button>
        <button id="csv-sample-btn" style="
            width: 100%;
            padding: 8px;
            margin: 5px 0;
            background: linear-gradient(135deg, #17a2b8, #138496);
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 12px;
            cursor: pointer;
        ">📋 サンプルCSVをダウンロード</button>
    `;
    
    // ジムリストの前に挿入
    const gymList = document.getElementById('gym-list');
    sidebar.insertBefore(csvSection, gymList);
    
    // イベントリスナーを追加
    setupCSVEventListeners();
}

// CSVイベントリスナーを設定
function setupCSVEventListeners() {
    const fileInput = document.getElementById('csv-file-input');
    const uploadBtn = document.getElementById('csv-upload-btn');
    const sampleBtn = document.getElementById('csv-sample-btn');
    
    // アップロードボタン
    uploadBtn.addEventListener('click', handleCSVUpload);
    
    // サンプルダウンロードボタン
    sampleBtn.addEventListener('click', downloadSampleCSV);
    
    // ファイル選択時の処理
    fileInput.addEventListener('change', function() {
        const fileName = this.files[0]?.name || '';
        uploadBtn.textContent = fileName ? `📤 ${fileName} をアップロード` : '📤 CSVをアップロード';
    });
    
    // ホバーエフェクト
    [uploadBtn, sampleBtn].forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        });
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });
}

// CSVアップロード処理
async function handleCSVUpload() {
    const fileInput = document.getElementById('csv-file-input');
    const uploadBtn = document.getElementById('csv-upload-btn');
    
    if (!fileInput.files[0]) {
        alert('CSVファイルを選択してください');
        return;
    }
    
    const file = fileInput.files[0];
    const originalText = uploadBtn.textContent;
    
    try {
        // ローディング状態
        uploadBtn.textContent = '⏳ 処理中...';
        uploadBtn.disabled = true;
        
        // CSVインポーター初期化
        const importer = new CSVImporter();
        
        // CSVファイルを読み込み
        const importedGyms = await importer.importCSV(file);
        
        if (importedGyms.length === 0) {
            throw new Error('有効なジムデータが見つかりませんでした');
        }
        
        // 既存のマーカーをクリア
        clearMarkers();
        
        // 新しいデータで更新
        gymData.length = 0; // 既存データをクリア
        gymData.push(...importedGyms);
        
        // 地図とリストを更新
        addGymMarkers();
        populateGymList();
        
        // 成功メッセージ
        uploadBtn.textContent = `✅ ${importedGyms.length}件インポート完了`;
        
        // 3秒後に元のテキストに戻す
        setTimeout(() => {
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
            fileInput.value = ''; // ファイル選択をクリア
        }, 3000);
        
        console.log(`CSVから${importedGyms.length}件のジム情報をインポートしました`);
        
    } catch (error) {
        console.error('CSVアップロードエラー:', error);
        uploadBtn.textContent = '❌ アップロード失敗';
        alert(`エラー: ${error.message}`);
        
        setTimeout(() => {
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
        }, 3000);
    }
}

// サンプルCSVダウンロード
function downloadSampleCSV() {
    const importer = new CSVImporter();
    const sampleCSV = importer.generateSampleCSV();
    
    // Blobを作成してダウンロード
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'ジム情報サンプル.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', function() {
    // 重複初期化を防ぐ
    if (isAppInitialized) {
        console.log('アプリは既に初期化済みです');
        return;
    }
    
    console.log('DOM読み込み完了 - アプリ初期化開始');
    
    // DOM要素の存在確認
    const mapContainer = document.getElementById('map');
    const gymList = document.getElementById('gym-list');
    const sidebar = document.querySelector('.sidebar');
    
    if (!mapContainer) {
        console.error('地図コンテナ(#map)が見つかりません');
    }
    if (!gymList) {
        console.error('ジムリスト(#gym-list)が見つかりません');
    }
    if (!sidebar) {
        console.error('サイドバー(.sidebar)が見つかりません');
    }
    
    // Leafletライブラリの確認
    if (typeof L === 'undefined') {
        console.error('Leafletライブラリが読み込まれていません');
        return;
    }
    
    // 地図初期化
    if (mapContainer) {
        initMap();
    }
    
    // ジムリスト表示
    if (gymList) {
        populateGymList();
    }
    
    // CSVアップロード機能を追加
    if (sidebar) {
        addCSVUploadControls();
    }
    
    // Google Maps APIが既に読み込まれている場合
    if (window.google && window.google.maps) {
        initGoogleMaps();
    }
    
    // 初期化完了フラグを設定
    isAppInitialized = true;
    console.log('アプリ初期化完了');
});
