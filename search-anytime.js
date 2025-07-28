const https = require('https');
const fs = require('fs');

// エニタイムフィットネス専用検索
async function searchAnytimeFitness() {
    const apiKey = 'AIzaSyDVcClDuehOqCfPIRowZ07ZWrIqyNeEtL4';
    
    // 岡山県の主要都市でエニタイムフィットネスを検索
    const locations = [
        { name: '岡山市', lat: 34.6617, lng: 133.9341 },
        { name: '倉敷市', lat: 34.5966, lng: 133.7722 },
        { name: '津山市', lat: 35.0586, lng: 134.0042 },
        { name: '玉野市', lat: 34.4901, lng: 133.9456 }
    ];
    
    const allResults = [];
    
    for (const location of locations) {
        console.log(`🔍 ${location.name}でエニタイムフィットネスを検索中...`);
        
        // Nearby Search APIでエニタイムフィットネスを検索
        const searchQuery = 'エニタイムフィットネス';
        const radius = 20000; // 20km
        
        try {
            const results = await searchNearby(location.lat, location.lng, searchQuery, radius, apiKey);
            
            if (results && results.length > 0) {
                console.log(`✅ ${location.name}で${results.length}件発見`);
                allResults.push(...results);
            } else {
                console.log(`❌ ${location.name}では見つかりませんでした`);
            }
            
            // API制限を考慮して待機
            await sleep(2000);
            
        } catch (error) {
            console.error(`❌ ${location.name}の検索でエラー:`, error.message);
        }
    }
    
    // 重複除去
    const uniqueResults = removeDuplicates(allResults);
    
    console.log(`\n📊 エニタイムフィットネス検索結果:`);
    console.log(`- 総発見数: ${allResults.length}件`);
    console.log(`- 重複除去後: ${uniqueResults.length}件`);
    
    if (uniqueResults.length > 0) {
        console.log('\n🏋️ 発見したエニタイムフィットネス店舗:');
        uniqueResults.forEach((gym, index) => {
            console.log(`${index + 1}. ${gym.name} - ${gym.address}`);
        });
        
        // CSVに追加
        await appendToExistingCSV(uniqueResults);
        console.log(`\n✅ ${uniqueResults.length}件をgyms.csvに追加しました！`);
    } else {
        console.log('\n❌ エニタイムフィットネスが見つかりませんでした');
    }
    
    return uniqueResults;
}

// Nearby Search API
function searchNearby(lat, lng, keyword, radius, apiKey) {
    return new Promise((resolve, reject) => {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&type=gym&language=ja&key=${apiKey}`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.status === 'OK') {
                        const gyms = result.results.map(place => ({
                            name: place.name,
                            address: place.vicinity || place.formatted_address || '',
                            latitude: place.geometry.location.lat,
                            longitude: place.geometry.location.lng,
                            rating: place.rating || '',
                            userRatingsTotal: place.user_ratings_total || '',
                            placeId: place.place_id,
                            businessStatus: place.business_status || 'OPERATIONAL'
                        }));
                        resolve(gyms);
                    } else {
                        console.log(`API応答エラー: ${result.status}`);
                        resolve([]);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// 重複除去
function removeDuplicates(gyms) {
    const unique = [];
    const seen = new Set();
    
    for (const gym of gyms) {
        const key = `${gym.name}-${gym.latitude}-${gym.longitude}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(gym);
        }
    }
    
    return unique;
}

// 既存CSVに追加
async function appendToExistingCSV(newGyms) {
    const csvPath = 'gyms.csv';
    
    // 既存CSVを読み込み
    let csvContent = '';
    try {
        csvContent = fs.readFileSync(csvPath, 'utf8');
    } catch (error) {
        console.error('CSVファイルの読み込みエラー:', error.message);
        return;
    }
    
    // 新しいデータを追加
    for (const gym of newGyms) {
        const csvLine = [
            escapeCSV(gym.name),
            escapeCSV(gym.address),
            '', // phone
            '', // website
            gym.latitude,
            gym.longitude,
            gym.rating,
            gym.userRatingsTotal,
            '', // price_info
            '', // opening_hours
            gym.businessStatus,
            '岡山県', // searchCity
            gym.placeId
        ].join(',');
        
        csvContent += csvLine + '\n';
    }
    
    // ファイルに書き戻し
    fs.writeFileSync(csvPath, csvContent, 'utf8');
}

// CSV用エスケープ
function escapeCSV(value) {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// 待機関数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 実行
if (require.main === module) {
    console.log('🏋️ エニタイムフィットネス岡山県検索を開始...');
    searchAnytimeFitness()
        .then(results => {
            console.log('\n🎉 検索完了！');
        })
        .catch(error => {
            console.error('❌ エラー:', error);
        });
}
