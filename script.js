// Global variables
let map;
let markers = [];
let markerClusterGroup;
let gymsData = [];
let currentPage = 'map';
let currentLocationMarker = null;
let currentLocationCircle = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadGymsData();
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
    
    // Initialize marker cluster group
    markerClusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
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

// Parse CSV data with duplicate removal (新形式対応)
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    console.log(`CSV ヘッダー:`, headers);
    console.log(`CSV 総行数: ${lines.length}行（ヘッダー含む）`);
    
    const data = [];
    let duplicateCount = 0;
    let processedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
        try {
            const values = parseCSVLine(lines[i]);
            if (values.length === headers.length && values[0] && values[0].trim()) {
                const rawGym = {};
                headers.forEach((header, index) => {
                    rawGym[header] = values[index] ? values[index].trim() : '';
                });
                
                // 新しいCSV形式を旧形式にマッピング
                const gym = mapNewFormatToOld(rawGym);
                
                // 有効なジムデータかチェック
                if (gym.name && gym.latitude && gym.longitude) {
                    // 重複チェック
                    if (!isDuplicate(gym, data)) {
                        data.push(gym);
                        processedCount++;
                        if (processedCount <= 5) {
                            console.log(`ジム追加 #${processedCount}:`, gym.name, `(${gym.address})`);
                        }
                    } else {
                        duplicateCount++;
                    }
                }
            } else if (values[0] && values[0].trim()) {
                console.warn(`行 ${i+1}: フィールド数不一致 (期待: ${headers.length}, 実際: ${values.length})`);
            }
        } catch (error) {
            console.warn(`行 ${i+1}: 解析エラー`, error.message);
        }
    }
    
    console.log(`\n📊 CSVデータ読み込み完了:`);
    console.log(`- 元データ: ${lines.length - 1}件`);
    console.log(`- 重複除外: ${duplicateCount}件`);
    console.log(`- 最終データ: ${data.length}件のジム情報`);
    return data;
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

// Check if gym data is duplicate (緩和版)
function isDuplicate(newGym, existingData) {
    const COORDINATE_THRESHOLD = 0.002; // 約200m以内（緩和）
    const NAME_SIMILARITY_THRESHOLD = 0.8; // 名前類似度閾値
    
    for (const existingGym of existingData) {
        // 1. ジム名が完全一致する場合のみ重複と判定（住所は考慮しない）
        if (newGym.name === existingGym.name) {
            console.log(`重複除外（名前完全一致）: ${newGym.name}`);
            return true;
        }
        
        // 2. 座標が近い場合（約200m以内）
        const latDiff = Math.abs(parseFloat(newGym.latitude) - parseFloat(existingGym.latitude));
        const lngDiff = Math.abs(parseFloat(newGym.longitude) - parseFloat(existingGym.longitude));
        
        if (latDiff < COORDINATE_THRESHOLD && lngDiff < COORDINATE_THRESHOLD) {
            // 座標が近い場合は、名前の類似度もチェック
            const nameSimilarity = calculateNameSimilarity(newGym.name, existingGym.name);
            if (nameSimilarity > NAME_SIMILARITY_THRESHOLD) {
                console.log(`重複除外（座標近接+名前類似）: ${newGym.name} vs ${existingGym.name} - 類似度: ${nameSimilarity.toFixed(2)}`);
                return true;
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

// Create popup content for markers
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

// Show gym details in modal
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
    const searchCity = gym.searchCity ? `📍 ${gym.searchCity}` : '';
    
    detailsDiv.innerHTML = `
        <h3>🏋️ ${gym.name}</h3>
        <p><strong>📍 住所:</strong> ${gym.address}</p>
        <p><strong>📞 電話番号:</strong> ${phone}</p>
        <p><strong>🕒 営業時間:</strong> ${openingHours}</p>
        <p><strong>⭐ 評価:</strong> ${rating} ${ratingsCount}</p>
        <p><strong>🏙️ エリア:</strong> ${searchCity}</p>
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

// Perform search
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        // Reset all markers to normal
        markers.forEach(({ marker }) => {
            marker.getElement()?.classList.remove('highlight-marker');
        });
        return;
    }
    
    // Find matching gyms (search in name and address)
    const matchingGyms = gymsData.filter(gym => 
        gym.name.toLowerCase().includes(searchTerm) ||
        gym.address.toLowerCase().includes(searchTerm)
    );
    
    if (matchingGyms.length === 0) {
        alert('該当するジムが見つかりませんでした。');
        return;
    }
    
    // Reset all markers
    markers.forEach(({ marker }) => {
        marker.getElement()?.classList.remove('highlight-marker');
    });
    
    // Highlight matching markers
    const matchingMarkers = [];
    markers.forEach(({ marker, gym }) => {
        if (gym.name.toLowerCase().includes(searchTerm) ||
            gym.address.toLowerCase().includes(searchTerm)) {
            marker.getElement()?.classList.add('highlight-marker');
            matchingMarkers.push(marker);
        }
    });
    
    // Zoom to show all matching markers
    if (matchingMarkers.length === 1) {
        map.setView(matchingMarkers[0].getLatLng(), 15);
        matchingMarkers[0].openPopup();
    } else if (matchingMarkers.length > 1) {
        const group = new L.featureGroup(matchingMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
    
    // Switch to map page if not already there
    if (currentPage !== 'map') {
        showPage('map', true);
    }
}

// Add current location button to map
function addCurrentLocationButton() {
    // Create custom control
    const CurrentLocationControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            
            container.style.backgroundColor = 'white';
            container.style.backgroundImage = 'none';
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
    
    // Add control to map
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
