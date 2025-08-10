const fs = require('fs');
const https = require('https');

// エニタイムフィットネス岡山県店舗の個別収集
async function collectAnytimeFitness() {
    const API_KEY = 'AIzaSyDVcClDuehOqCfPIRowZ07ZWrIqyNeEtL4';
    
    // エニタイムフィットネス岡山県店舗の検索クエリ
    const searchQueries = [
        'エニタイムフィットネス 岡山',
        'Anytime Fitness 岡山',
        'エニタイムフィットネス 倉敷',
        'Anytime Fitness 倉敷',
        'エニタイムフィットネス 津山',
        'エニタイムフィットネス 玉野'
    ];
    
    const allGyms = [];
    
    for (const query of searchQueries) {
        console.log(`🔍 検索中: ${query}`);
        
        try {
            // Text Search API を使用
            const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=jp&key=${API_KEY}`;
            
            const response = await fetch(searchUrl);
            const data = await response.json();
            
            if (data.status === 'OK' && data.results) {
                console.log(`✅ ${data.results.length}件の候補が見つかりました`);
                
                for (const place of data.results) {
                    // エニタイムフィットネスの名前が含まれているかチェック
                    if (place.name.includes('エニタイム') || place.name.includes('Anytime')) {
                        console.log(`📍 発見: ${place.name}`);
                        
                        // 詳細情報を取得
                        const details = await getPlaceDetails(place.place_id, API_KEY);
                        if (details) {
                            allGyms.push(details);
                        }
                        
                        // API制限を考慮して少し待機
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
            } else {
                console.log(`❌ 検索エラー: ${data.status}`);
            }
            
            // API制限を考慮して待機
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`検索エラー (${query}):`, error.message);
        }
    }
    
    // 重複除去
    const uniqueGyms = removeDuplicates(allGyms);
    
    console.log(`\n📊 エニタイムフィットネス収集結果:`);
    console.log(`- 発見店舗数: ${allGyms.length}件`);
    console.log(`- 重複除去後: ${uniqueGyms.length}件`);
    
    // CSVに追加
    if (uniqueGyms.length > 0) {
        await appendToCSV(uniqueGyms);
        console.log(`✅ ${uniqueGyms.length}件のエニタイムフィットネス店舗をCSVに追加しました`);
    }
    
    return uniqueGyms;
}

// Place Details API で詳細情報を取得
async function getPlaceDetails(placeId, apiKey) {
    try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,geometry,rating,user_ratings_total,opening_hours,business_status&language=ja&key=${apiKey}`;
        
        const response = await fetch(detailsUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.result) {
            const place = data.result;
            
            return {
                name: place.name || '',
                address: place.formatted_address || '',
                phone: place.formatted_phone_number || '',
                website: place.website || '',
                latitude: place.geometry?.location?.lat || '',
                longitude: place.geometry?.location?.lng || '',
                rating: place.rating || '',
                userRatingsTotal: place.user_ratings_total || '',
                opening_hours: formatOpeningHours(place.opening_hours),
                businessStatus: place.business_status || '',
                searchCity: extractCity(place.formatted_address),
                placeId: placeId
            };
        }
        
        return null;
    } catch (error) {
        console.error(`詳細取得エラー (${placeId}):`, error.message);
        return null;
    }
}

// 営業時間をフォーマット
function formatOpeningHours(openingHours) {
    if (!openingHours || !openingHours.weekday_text) {
        return '';
    }
    return openingHours.weekday_text.join('; ');
}

// 住所から市区町村を抽出
function extractCity(address) {
    if (!address) return '';
    
    const cityPatterns = [
        /岡山県(.+?市)/,
        /岡山県(.+?町)/,
        /岡山県(.+?村)/
    ];
    
    for (const pattern of cityPatterns) {
        const match = address.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return '岡山県';
}

// 重複除去
function removeDuplicates(gyms) {
    const unique = [];
    const seen = new Set();
    
    for (const gym of gyms) {
        const key = `${gym.name}-${gym.address}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(gym);
        }
    }
    
    return unique;
}

// CSVファイルに追加
async function appendToCSV(gyms) {
    const csvPath = 'gyms.csv';
    
    // 既存のCSVを読み込み
    let existingData = '';
    try {
        existingData = fs.readFileSync(csvPath, 'utf8');
    } catch (error) {
        console.log('既存のCSVファイルが見つかりません。新規作成します。');
        // ヘッダーを作成
        existingData = 'name,address,phone,website,latitude,longitude,rating,userRatingsTotal,price_info,opening_hours,businessStatus,searchCity,placeId\n';
    }
    
    // 新しいデータを追加
    for (const gym of gyms) {
        const csvLine = [
            escapeCSV(gym.name),
            escapeCSV(gym.address),
            escapeCSV(gym.phone),
            escapeCSV(gym.website),
            gym.latitude,
            gym.longitude,
            gym.rating,
            gym.userRatingsTotal,
            '', // price_info
            escapeCSV(gym.opening_hours),
            gym.businessStatus,
            escapeCSV(gym.searchCity),
            gym.placeId
        ].join(',');
        
        existingData += csvLine + '\n';
    }
    
    // ファイルに書き込み
    fs.writeFileSync(csvPath, existingData, 'utf8');
}

// CSV用にエスケープ
function escapeCSV(value) {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// 実行
if (require.main === module) {
    console.log('🏋️ エニタイムフィットネス岡山県店舗収集を開始します...');
    collectAnytimeFitness()
        .then(gyms => {
            console.log('\n✅ 収集完了！');
            if (gyms.length > 0) {
                console.log('発見した店舗:');
                gyms.forEach((gym, index) => {
                    console.log(`${index + 1}. ${gym.name} - ${gym.address}`);
                });
            }
        })
        .catch(error => {
            console.error('❌ エラー:', error);
        });
}

module.exports = { collectAnytimeFitness };
