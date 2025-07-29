// Global variables
let map;
let markers = [];
let gymsData = []; // エニタイムフィットネスを含む全ジムデータ
let markerClusterGroup;
let currentLocationMarker = null;
let currentLocationAccuracyCircle = null;
let currentPage = 'map';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadGymsData(); // エニタイムフィットネスを含む全ジムデータを読み込み
    setupEventListeners();
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.page) {
            showPage(event.state.page, false);
        } else {
            showPage('map', false);
        }
    });
    
    // Set initial history state
    history.replaceState({ page: 'map' }, '', '/');
});

// Initialize Leaflet map
function initializeMap() {
    // Create map centered on Okayama
    map = L.map('map').setView([34.6617, 133.9341], 11);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 22
    }).addTo(map);
    
    // Initialize marker cluster group with custom clustering logic
    // 5件以下は通常ピン、6件以上でクラスター表示
    markerClusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        // 高ズーム時にクラスター化を無効にして少数グループを個別表示
        disableClusteringAtZoom: 18,
        maxClusterRadius: function(zoom) {
            // ズームレベルに応じてクラスター半径を調整
            // 高ズームでは半径を小さくして5件以下のグループを作りにくくする
            if (zoom >= 16) return 25;
            if (zoom >= 14) return 40;
            return 80;
        },
        iconCreateFunction: function(cluster) {
            var childCount = cluster.getChildCount();
            
            // 5件以下の小さなクラスターは特別なスタイルで表示（少数グループ用）
            if (childCount <= 5) {
                return new L.DivIcon({
                    html: '<div class="small-cluster"><span>' + childCount + '</span></div>',
                    className: 'marker-cluster marker-cluster-small-group',
                    iconSize: new L.Point(30, 30)
                });
            }
            
            var c = ' marker-cluster-';
            if (childCount < 10) {
                c += 'small';
            } else if (childCount < 100) {
                c += 'medium';
            } else {
                c += 'large';
            }
            
            return new L.DivIcon({
                html: '<div><span>' + childCount + '</span></div>',
                className: 'marker-cluster' + c,
                iconSize: new L.Point(40, 40)
            });
        }
    });
    
    map.addLayer(markerClusterGroup);
    
    // Add current location button
    addCurrentLocationButton();
}

// Load gyms data from CSV
async function loadGymsData() {
    try {
        const response = await fetch(`gyms.csv?v=${Date.now()}`);
        const csvText = await response.text();
        
        if (csvText.trim()) {
            gymsData = parseCSV(csvText);
            console.log(`🏢 ジムデータ読み込み完了: ${gymsData.length}件`);
            
            // エニタイムフィットネスが含まれているか確認
            const anytimeCount = gymsData.filter(gym => gym.name.includes('エニタイム')).length;
            console.log(`🏋️ エニタイムフィットネス店舗数: ${anytimeCount}件`);
            
            displayGymsOnMap();
        } else {
            console.warn('CSV file is empty or not found');
            // Create sample data for demonstration
            createSampleData();
        }
    } catch (error) {
        console.error('Error loading gyms data:', error);
        // Create sample data for demonstration
        createSampleData();
    }
}

// Parse CSV data with enhanced error handling and validation
function parseCSV(csvText) {
    try {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            console.error('CSVファイルが空または不正です');
            return [];
        }
        
        const headers = parseCSVLine(lines[0]).map(header => header.trim());
        console.log(`CSV ヘッダー:`, headers);
        console.log(`CSV 総行数: ${lines.length}行（ヘッダー含む）`);
        
        // 必須フィールドの存在確認
        const requiredFields = ['name', 'latitude', 'longitude'];
        const missingFields = requiredFields.filter(field => !headers.includes(field));
        if (missingFields.length > 0) {
            console.error('必須フィールドが不足:', missingFields);
            return [];
        }
        
        const data = [];
        let duplicateCount = 0;
        let parseErrors = 0;
        
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = parseCSVLine(lines[i]);
                
                // 空行や無効な行をスキップ
                if (!values[0] || !values[0].trim()) {
                    continue;
                }
                
                if (values.length === headers.length) {
                    const gym = {};
                    headers.forEach((header, index) => {
                        gym[header] = values[index] ? values[index].trim() : '';
                    });
                    
                    // 必須フィールドの有効性チェック
                    const lat = parseFloat(gym.latitude);
                    const lng = parseFloat(gym.longitude);
                    
                    if (gym.name && !isNaN(lat) && !isNaN(lng)) {
                        // 重複チェック
                        if (!isDuplicate(gym, data)) {
                            data.push(gym);
                            if (data.length <= 10) {
                                console.log(`ジム追加 #${data.length}:`, gym.name, `(${gym.city || '不明'})`);
                            }
                        } else {
                            duplicateCount++;
                            console.log(`重複除外: ${gym.name}`);
                        }
                    } else {
                        parseErrors++;
                        console.warn(`無効データ (行${i+1}): ${gym.name || '名前なし'} - lat=${gym.latitude}, lng=${gym.longitude}`);
                    }
                } else {
                    parseErrors++;
                    console.warn(`行 ${i+1}: フィールド数不一致 (期待: ${headers.length}, 実際: ${values.length})`);
                }
            } catch (error) {
                parseErrors++;
                console.warn(`行 ${i+1}: 解析エラー`, error.message);
            }
        }
        
        console.log(`\n📊 CSVデータ読み込み完了:`);
        console.log(`- 元データ: ${lines.length - 1}件`);
        console.log(`- 正常データ: ${data.length}件`);
        console.log(`- 重複除外: ${duplicateCount}件`);
        console.log(`- エラー: ${parseErrors}件`);
        
        return data;
        
    } catch (error) {
        console.error('CSV解析で重大エラーが発生:', error);
        return [];
    }
}

// 新しいCSV形式を旧形式にマッピング
function mapNewFormatToOld(rawGym) {
    return {
        name: rawGym.name || '',
        address: rawGym.address || '',
        latitude: rawGym.latitude || '',
        longitude: rawGym.longitude || '',
        opening_hours: rawGym.opening_hours || '要確認',
        price_info: rawGym.price_info || '要確認',
        visitor_price: rawGym.visitor_price || '要確認',
        photo_permission: rawGym.photo_permission || '要確認',
        website: rawGym.website || '',
        phone: rawGym.phone || '',
        rating: rawGym.rating || '',
        userRatingsTotal: rawGym.userRatingsTotal || '',
        businessStatus: rawGym.businessStatus || '',
        searchCity: rawGym.searchCity || '',
        placeId: rawGym.placeId || ''
    };
}

// Check if gym data is duplicate with optimized logic
function isDuplicate(newGym, existingData) {
    const COORDINATE_THRESHOLD = 0.001; // 約100m以内（緩和）
    
    for (const existingGym of existingData) {
        // 1. ジム名が完全一致かつ住所も一致する場合のみ重複と判定
        if (newGym.name === existingGym.name && newGym.address === existingGym.address) {
            return true;
        }
        
        // 2. 座標が非常に近い場合（同じ建物内の可能性）- 閾値を緩和
        const lat1 = parseFloat(newGym.latitude);
        const lng1 = parseFloat(newGym.longitude);
        const lat2 = parseFloat(existingGym.latitude);
        const lng2 = parseFloat(existingGym.longitude);
        
        if (!isNaN(lat1) && !isNaN(lng1) && !isNaN(lat2) && !isNaN(lng2)) {
            const latDiff = Math.abs(lat1 - lat2);
            const lngDiff = Math.abs(lng1 - lng2);
            
            // より厳格な条件：座標が非常に近く、かつ名前が類似している場合のみ重複
            if (latDiff < COORDINATE_THRESHOLD && lngDiff < COORDINATE_THRESHOLD) {
                const nameSimilarity = calculateNameSimilarity(newGym.name, existingGym.name);
                if (nameSimilarity > 0.8) { // 80%以上の類似度
                    return true;
                }
            }
        }
    }
    
    return false;
}

// 名前の類似度を計算（簡易版）
function calculateNameSimilarity(name1, name2) {
    // 空白・記号を除去して正規化
    const normalize = (str) => str.replace(/[\s\-・（）()]/g, '').toLowerCase();
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    
    // 完全一致
    if (n1 === n2) return 1.0;
    
    // 一方が他方を含む場合
    if (n1.includes(n2) || n2.includes(n1)) return 0.9;
    
    // レーベンシュタイン距離による類似度計算
    const maxLen = Math.max(n1.length, n2.length);
    if (maxLen === 0) return 1.0;
    
    const distance = levenshteinDistance(n1, n2);
    return 1 - (distance / maxLen);
}

// レーベンシュタイン距離計算
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Parse CSV line handling commas within quotes
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

// Create sample data for demonstration
function createSampleData() {
    gymsData = [
        {
            name: 'エニタイムフィットネス岡山駅前店',
            address: '岡山県岡山市北区駅前町1-1-1',
            latitude: '34.6617',
            longitude: '133.9341',
            opening_hours: '24時間営業',
            price_info: '月額7,480円',
            visitor_price: '2,200円/回',
            photo_permission: '可（一部制限あり）',
            website: 'https://www.anytimefitness.co.jp/'
        },
        {
            name: 'JOYFIT岡山高柳',
            address: '岡山県岡山市北区高柳西町1-23',
            latitude: '34.6850',
            longitude: '133.8900',
            opening_hours: '6:00-24:00',
            price_info: '月額6,999円',
            visitor_price: '1,650円/回',
            photo_permission: '要確認',
            website: 'https://joyfit.jp/'
        },
        {
            name: 'ゴールドジム岡山',
            address: '岡山県岡山市北区表町2-3-45',
            latitude: '34.6700',
            longitude: '133.9200',
            opening_hours: '7:00-23:00',
            price_info: '月額9,900円',
            visitor_price: '2,750円/回',
            photo_permission: '可',
            website: 'https://www.goldsgym.jp/'
        },
        {
            name: 'カーブス岡山西川',
            address: '岡山県岡山市北区西川原1-2-3',
            latitude: '34.6500',
            longitude: '133.9500',
            opening_hours: '10:00-19:00',
            price_info: '月額6,270円',
            visitor_price: '体験無料',
            photo_permission: '不可',
            website: 'https://www.curves.co.jp/'
        },
        {
            name: 'スポーツクラブ ルネサンス岡山',
            address: '岡山県岡山市北区問屋町15-101',
            latitude: '34.6400',
            longitude: '133.8800',
            opening_hours: '9:30-23:00',
            price_info: '月額8,800円',
            visitor_price: '2,200円/回',
            photo_permission: '可（プール除く）',
            website: 'https://www.s-re.jp/'
        }
    ];
    
    displayGymsOnMap();
}

// Display gyms on map
function displayGymsOnMap() {
    // Clear existing markers
    markerClusterGroup.clearLayers();
    markers = [];
    
    gymsData.forEach(gym => {
        const lat = parseFloat(gym.latitude);
        const lng = parseFloat(gym.longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
            const marker = L.marker([lat, lng])
                .bindTooltip(gym.name, {
                    permanent: false,
                    direction: 'top',
                    offset: [0, -10]
                })
                .bindPopup(createPopupContent(gym));
            
            markers.push({ marker, gym });
            markerClusterGroup.addLayer(marker);
        }
    });
}

// Create popup content for gym marker
function createPopupContent(gym) {
    const shortAddress = gym.address.length > 30 ? 
        gym.address.substring(0, 30) + '...' : gym.address;
    
    return `
        <div class="popup-content">
            <div class="popup-gym-name">🏋️ ${gym.name}</div>
            <div class="popup-address">📍 ${shortAddress}</div>
            <button class="popup-detail-btn" onclick="showGymDetails('${gym.name}')">
                🔗 詳細を見る
            </button>
        </div>
    `;
}

// Show gym details in modal (エリア項目削除版)
function showGymDetails(gymName) {
    const gym = gymsData.find(g => g.name === gymName);
    if (!gym) return;
    
    const modal = document.getElementById('gymModal');
    const detailsDiv = document.getElementById('gymDetails');
    
    const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${gym.latitude},${gym.longitude}`;
    
    // Format collected data for display
    const rating = gym.rating ? `⭐ ${gym.rating}点` : '評価なし';
    const ratingsCount = gym.userRatingsTotal ? `(${gym.userRatingsTotal}件の評価)` : '';
    const phone = gym.phone ? gym.phone : '電話番号なし';
    const website = gym.website ? gym.website : '公式サイトなし';
    const openingHours = gym.opening_hours || gym.openingHours || '営業時間情報なし';
    
    // 営業時間を見やすく整形（曜日グループ化でコンパクト表示）
    const formatOpeningHours = (hours) => {
        if (hours === '営業時間情報なし') {
            return hours;
        }
        
        // 24時間営業などの簡単なケース
        if (hours.includes('24時間') || hours.includes('24h') || hours === '24時間営業') {
            return '24時間営業';
        }
        
        // 曜日別の営業時間をパース
        const daySchedules = [];
        const lines = hours.split(/[;\n]/).map(line => line.trim()).filter(line => line);
        
        lines.forEach(line => {
            // 曜日パターンをマッチ
            const dayMatch = line.match(/(月|火|水|木|金|土|日)曜?日?[：:]?\s*(.+)/);
            if (dayMatch) {
                const day = dayMatch[1];
                const time = dayMatch[2].trim();
                daySchedules.push({ day, time });
            } else if (line.includes('平日')) {
                const time = line.replace(/平日[：:]?\s*/, '').trim();
                ['月', '火', '水', '木', '金'].forEach(day => {
                    daySchedules.push({ day, time });
                });
            } else if (line.includes('土日') || line.includes('週末')) {
                const time = line.replace(/(土日|週末)[：:]?\s*/, '').trim();
                ['土', '日'].forEach(day => {
                    daySchedules.push({ day, time });
                });
            }
        });
        
        // 同じ時間帯の曜日をグループ化
        const groupedSchedules = {};
        daySchedules.forEach(({ day, time }) => {
            if (!groupedSchedules[time]) {
                groupedSchedules[time] = [];
            }
            groupedSchedules[time].push(day);
        });
        
        // グループ化された結果を整形
        const formattedGroups = [];
        Object.entries(groupedSchedules).forEach(([time, days]) => {
            const sortedDays = days.sort((a, b) => {
                const dayOrder = ['月', '火', '水', '木', '金', '土', '日'];
                return dayOrder.indexOf(a) - dayOrder.indexOf(b);
            });
            
            // 連続する曜日をまとめる
            const dayRanges = [];
            let start = 0;
            
            for (let i = 1; i <= sortedDays.length; i++) {
                const dayOrder = ['月', '火', '水', '木', '金', '土', '日'];
                const currentIndex = dayOrder.indexOf(sortedDays[i]);
                const prevIndex = dayOrder.indexOf(sortedDays[i - 1]);
                
                if (i === sortedDays.length || currentIndex !== prevIndex + 1) {
                    if (i - 1 === start) {
                        dayRanges.push(sortedDays[start]);
                    } else {
                        dayRanges.push(`${sortedDays[start]}～${sortedDays[i - 1]}`);
                    }
                    start = i;
                }
            }
            
            const dayText = dayRanges.join('・');
            formattedGroups.push(`${dayText}: ${time}`);
        });
        
        // グループ化できなかった場合は元の形式で表示
        if (formattedGroups.length === 0) {
            return hours
                .replace(/;/g, '<br>')
                .replace(/\n/g, '<br>')
                .replace(/^<br>/, '')
                .trim();
        }
        
        return formattedGroups.join('<br>');
    };
    
    const formattedOpeningHours = formatOpeningHours(openingHours);
    
    // Google評価ページへのリンクを作成
    const ratingDisplay = gym.rating && gym.placeId ? 
        `<a href="https://www.google.com/maps/place/?q=place_id:${gym.placeId}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: none;">${rating}</a>` : 
        rating;
    
    detailsDiv.innerHTML = `
        <h3>🏋️ ${gym.name}</h3>
        <p><strong>📍 住所:</strong> ${gym.address}</p>
        <p><strong>📞 電話番号:</strong> ${phone}</p>
        <div class="opening-hours-section">
            <p><strong>🕒 営業時間:</strong></p>
            <div class="opening-hours-content">${formattedOpeningHours}</div>
        </div>
        <p><strong>⭐ 評価:</strong> ${ratingDisplay} ${ratingsCount}</p>
        <p><strong>🌐 公式サイト:</strong> ${website !== '公式サイトなし' ? `<a href="${website}" target="_blank" rel="noopener noreferrer">${website}</a>` : website}</p>
        <a href="${navUrl}" target="_blank" rel="noopener" class="nav-button">
            🧭 Googleマップでナビ
        </a>
    `;
    
    modal.style.display = 'block';
}

// Setup event listeners
function setupEventListeners() {
    // Hamburger menu
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const navMenu = document.getElementById('navMenu');
    
    hamburgerMenu.addEventListener('click', function() {
        hamburgerMenu.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // Navigation menu items
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page, true);
            
            // Close menu on mobile
            hamburgerMenu.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Modal close
    const modal = document.getElementById('gymModal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Contact form
    const contactForm = document.getElementById('contactForm');
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('contactName').value;
        const email = document.getElementById('contactEmail').value;
        const message = document.getElementById('contactMessage').value;
        
        // Create mailto link
        const subject = encodeURIComponent('Muscle Map お問い合わせ');
        const body = encodeURIComponent(`お名前: ${name}\nメールアドレス: ${email}\n\nメッセージ:\n${message}`);
        const mailtoLink = `mailto:example@example.com?subject=${subject}&body=${body}`;
        
        window.location.href = mailtoLink;
        
        // Reset form
        contactForm.reset();
        alert('メールクライアントが開きます。送信を完了してください。');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!navMenu.contains(e.target) && !hamburgerMenu.contains(e.target)) {
            hamburgerMenu.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });
}

// Show specific page
function showPage(pageId, addToHistory = true) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    // Show selected page
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = pageId;
        
        // Add to browser history
        if (addToHistory) {
            const url = pageId === 'map' ? '/' : `/#${pageId}`;
            history.pushState({ page: pageId }, '', url);
        }
        
        // Refresh map if returning to map page
        if (pageId === 'map') {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    }
}

// Perform search (距離ベース検索)
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        // Reset all markers to normal
        markers.forEach(({ marker }) => {
            marker.getElement()?.classList.remove('highlight-marker');
        });
        return;
    }
    
    // 現在地を取得して距離ベースで検索
    getCurrentLocationForSearch(searchTerm);
}

// 検索用の現在地取得
function getCurrentLocationForSearch(searchTerm) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                performDistanceBasedSearch(searchTerm, userLat, userLng);
            },
            (error) => {
                console.log('現在地取得失敗、地図中心を使用:', error.message);
                // 現在地が取得できない場合は地図中心を使用
                const mapCenter = map.getCenter();
                performDistanceBasedSearch(searchTerm, mapCenter.lat, mapCenter.lng);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 300000 // 5分間キャッシュ
            }
        );
    } else {
        // Geolocationがサポートされていない場合
        const mapCenter = map.getCenter();
        performDistanceBasedSearch(searchTerm, mapCenter.lat, mapCenter.lng);
    }
}

// 距離ベース検索の実行
function performDistanceBasedSearch(searchTerm, userLat, userLng) {
    // 1. 地図表示範囲内のジムを取得
    const visibleGyms = getGymsInMapBounds();
    
    // 2. 検索キーワードでフィルタリング
    const matchingGyms = filterGymsByKeyword(visibleGyms, searchTerm);
    
    if (matchingGyms.length === 0) {
        // フォールバック: 全データから最寄りのジムを検索
        console.log('表示範囲内に該当なし、全データから最寄りを検索中...');
        const fallbackResult = findNearestGymFallback(searchTerm, userLat, userLng);
        
        if (fallbackResult) {
            displayFallbackResult(fallbackResult, searchTerm);
        } else {
            alert(`「${searchTerm}」に該当するジムが見つかりませんでした。\n\n検索のコツ：\n・ジム名の一部を入力（例：「エニタイム」「ゴールド」）\n・別のキーワードをお試しください`);
        }
        return;
    }
    
    // 3. 各ジムの距離を計算
    const gymsWithDistance = matchingGyms.map(gym => {
        const distance = calculateDistance(userLat, userLng, parseFloat(gym.latitude), parseFloat(gym.longitude));
        return {
            ...gym,
            distance: distance,
            distanceText: formatDistance(distance)
        };
    });
    
    // 4. 距離順でソート（近い順）
    gymsWithDistance.sort((a, b) => a.distance - b.distance);
    
    // 5. 検索結果を表示
    displayDistanceBasedResults(gymsWithDistance, searchTerm, false);
    
    console.log(`距離ベース検索結果: 「${searchTerm}」で${gymsWithDistance.length}件のジムが見つかりました`);
}

// 地図表示範囲内のジムを取得
function getGymsInMapBounds() {
    const bounds = map.getBounds();
    return gymsData.filter(gym => {
        const lat = parseFloat(gym.latitude);
        const lng = parseFloat(gym.longitude);
        return bounds.contains([lat, lng]);
    });
}

// キーワードでジムをフィルタリング
function filterGymsByKeyword(gyms, searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    return gyms.filter(gym => {
        const gymName = gym.name.toLowerCase();
        const gymAddress = gym.address.toLowerCase();
        
        return gymName.includes(searchLower) || 
               gymAddress.includes(searchLower);
    });
}

// Haversine式による距離計算（km）
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 地球の半径（km）
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
}

// 度をラジアンに変換
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// 距離を読みやすい形式にフォーマット
function formatDistance(distance) {
    if (distance < 1) {
        return Math.round(distance * 1000) + 'm';
    } else {
        return distance.toFixed(1) + 'km';
    }
}

// 全データから最寄りのジムを検索（フォールバック）
function findNearestGymFallback(searchTerm, userLat, userLng) {
    // 全ジムデータからキーワードでフィルタリング
    const allMatchingGyms = filterGymsByKeyword(gymsData, searchTerm);
    
    if (allMatchingGyms.length === 0) {
        return null;
    }
    
    // 各ジムの距離を計算
    const gymsWithDistance = allMatchingGyms.map(gym => {
        const distance = calculateDistance(userLat, userLng, parseFloat(gym.latitude), parseFloat(gym.longitude));
        return {
            ...gym,
            distance: distance,
            distanceText: formatDistance(distance)
        };
    });
    
    // 距離順でソートして最寄りを返す
    gymsWithDistance.sort((a, b) => a.distance - b.distance);
    return gymsWithDistance[0];
}

// フォールバック結果の表示
function displayFallbackResult(nearestGym, searchTerm) {
    // Reset all markers
    markers.forEach(({ marker }) => {
        marker.getElement()?.classList.remove('highlight-marker');
    });
    
    // 最寄りのジムをハイライト
    const nearestMarker = markers.find(m => m.gym.name === nearestGym.name)?.marker;
    if (nearestMarker) {
        nearestMarker.getElement()?.classList.add('highlight-marker');
        
        // 最寄りのジムにフォーカス
        map.setView([parseFloat(nearestGym.latitude), parseFloat(nearestGym.longitude)], 15);
        
        setTimeout(() => {
            nearestMarker.openPopup();
        }, 500);
    }
    
    // Switch to map page if not already there
    if (currentPage !== 'map') {
        showPage('map', true);
    }
    
    // ユーザーにフォールバックで表示したことを通知
    setTimeout(() => {
        alert(`表示範囲内に「${searchTerm}」が見つからなかったため、\n最寄りのジムを表示しました：\n\n🏆 ${nearestGym.name}\n📍 ${nearestGym.distanceText}先\n🗺️ ${nearestGym.address}`);
    }, 1000);
    
    console.log(`フォールバック検索: 最寄りの「${searchTerm}」は ${nearestGym.name} (${nearestGym.distanceText})`);
}

// 距離ベース検索結果の表示
function displayDistanceBasedResults(gymsWithDistance, searchTerm, isFallback = false) {
    // Reset all markers
    markers.forEach(({ marker }) => {
        marker.getElement()?.classList.remove('highlight-marker');
    });
    
    // Highlight matching markers
    const matchingMarkers = [];
    gymsWithDistance.forEach(gym => {
        const marker = markers.find(m => m.gym.name === gym.name)?.marker;
        if (marker) {
            marker.getElement()?.classList.add('highlight-marker');
            matchingMarkers.push(marker);
        }
    });
    
    // 最も近いジムを中心に表示
    if (matchingMarkers.length === 1) {
        map.setView(matchingMarkers[0].getLatLng(), 15);
        matchingMarkers[0].openPopup();
    } else if (matchingMarkers.length > 1) {
        // 最も近いジムにフォーカス
        const nearestGym = gymsWithDistance[0];
        const nearestMarker = matchingMarkers[0];
        
        map.setView([parseFloat(nearestGym.latitude), parseFloat(nearestGym.longitude)], 14);
        
        setTimeout(() => {
            nearestMarker.openPopup();
        }, 500);
    }
    
    // Switch to map page if not already there
    if (currentPage !== 'map') {
        showPage('map', true);
    }
    
    // 検索結果をコンソールに表示（デバッグ用）
    console.log('距離順検索結果:');
    gymsWithDistance.slice(0, 5).forEach((gym, index) => {
        console.log(`${index + 1}. ${gym.name} - ${gym.distanceText}`);
    });
}



// Add current location button to map
function addCurrentLocationButton() {
    const CurrentLocationControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.style.backgroundColor = 'white';
            container.style.width = '34px';
            container.style.height = '34px';
            container.style.cursor = 'pointer';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.fontSize = '16px';
            container.innerHTML = '📍';
            container.title = '現在地を表示';
            
            container.onclick = function(){
                getCurrentLocation();
            };
            
            return container;
        },
        onRemove: function(map) {
            // Nothing to do here
        }
    });
    
    const currentLocationControl = new CurrentLocationControl({ position: 'topleft' });
    currentLocationControl.addTo(map);
}



// Get current location and show on map
function getCurrentLocation() {
    if (!navigator.geolocation) {
        alert('お使いのブラウザは位置情報をサポートしていません。');
        return;
    }
    
    // Show loading state
    const button = document.querySelector('.leaflet-control-custom');
    const originalContent = button.innerHTML;
    button.innerHTML = '⏳';
    button.style.pointerEvents = 'none';
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            // Remove existing current location marker and circle
            if (currentLocationMarker) {
                map.removeLayer(currentLocationMarker);
            }
            if (currentLocationCircle) {
                map.removeLayer(currentLocationCircle);
            }
                
            // Add accuracy circle
            currentLocationCircle = L.circle([lat, lng], {
                radius: accuracy,
                color: '#136AEC',
                fillColor: '#136AEC',
                fillOpacity: 0.15,
                weight: 2
            }).addTo(map);
                
            // Add current location marker
            currentLocationMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'current-location-marker',
                    html: '<div style="background: #136AEC; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            }).addTo(map);
                
            // Add popup
            currentLocationMarker.bindPopup('📍 あなたの現在地').openPopup();
                
            // Zoom to current location
            map.setView([lat, lng], 16);
                
            // Restore button
            button.innerHTML = originalContent;
            button.style.pointerEvents = 'auto';
        },
        function(error) {
            let errorMessage = '現在地を取得できませんでした。位置情報の許可が必要です。';
                
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = '現在地を取得できませんでした。位置情報の許可が必要です。';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = '位置情報が利用できません。';
                    break;
                case error.TIMEOUT:
                    errorMessage = '位置情報の取得がタイムアウトしました。';
                    break;
            }
                
            alert(errorMessage);
                
            // Restore button
            button.innerHTML = originalContent;
            button.style.pointerEvents = 'auto';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// Utility function to make gym details globally accessible
window.showGymDetails = showGymDetails;

// Handle window resize
window.addEventListener('resize', function() {
    if (map && currentPage === 'map') {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }
});

// Service Worker registration for PWA (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed');
            });
    });
}
