const https = require('https');
const fs = require('fs');

// エニタイムフィットネスの詳細情報を収集（Place Details API使用）
async function collectDetailedAnytimeData() {
    const apiKey = 'AIzaSyDVcClDuehOqCfPIRowZ07ZWrIqyNeEtL4';
    
    console.log('🔍 エニタイムフィットネス詳細情報収集を開始...\n');
    
    // 現在のCSVから基本情報を読み込み
    const csvContent = fs.readFileSync('anytime-fitness-only.csv', 'utf8');
    const lines = csvContent.trim().split('\n').filter(line => line.trim()); // 空行を除去
    const headers = parseCSVLine(lines[0]);
    
    console.log(`📄 現在のCSV: ${lines.length - 1}件のエニタイムフィットネス`);
    console.log(`📋 ヘッダー:`, headers);
    
    const detailedGyms = [];
    let processedCount = 0;
    let errorCount = 0;
    
    // ヘッダー行をスキップして各店舗の詳細情報を取得
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // 空行をスキップ
        
        const values = parseCSVLine(line);
        const gymName = values[0];
        const placeId = values[12]; // placeIdの位置
        
        console.log(`\n🔍 処理中 (${i}/${lines.length - 1}): ${gymName}`);
        console.log(`   Place ID: ${placeId}`);
        
        if (!placeId || placeId.trim() === '') {
            console.log(`⚠️ Place ID不明: ${gymName} - スキップ`);
            errorCount++;
            continue;
        }
        
        try {
            const detailedInfo = await getPlaceDetails(placeId.trim(), apiKey);
            
            if (detailedInfo) {
                const enrichedGym = {
                    name: detailedInfo.name || gymName,
                    address: detailedInfo.formatted_address || values[1],
                    phone: detailedInfo.formatted_phone_number || '',
                    website: detailedInfo.website || '',
                    latitude: detailedInfo.geometry?.location?.lat || values[5],
                    longitude: detailedInfo.geometry?.location?.lng || values[6],
                    rating: detailedInfo.rating || values[7],
                    userRatingsTotal: detailedInfo.user_ratings_total || values[8],
                    price_info: detailedInfo.price_level ? `価格レベル: ${detailedInfo.price_level}` : '',
                    opening_hours: formatOpeningHours(detailedInfo.opening_hours),
                    businessStatus: detailedInfo.business_status || 'OPERATIONAL',
                    searchCity: '岡山県',
                    placeId: placeId.trim(),
                    googleMapsUrl: detailedInfo.url || `https://maps.google.com/?place_id=${placeId.trim()}`,
                    types: detailedInfo.types ? detailedInfo.types.join(', ') : '',
                    vicinity: detailedInfo.vicinity || ''
                };
                
                detailedGyms.push(enrichedGym);
                processedCount++;
                
                console.log(`✅ ${gymName}`);
                console.log(`   電話: ${enrichedGym.phone || '情報なし'}`);
                console.log(`   ウェブサイト: ${enrichedGym.website || '情報なし'}`);
                console.log(`   営業時間: ${enrichedGym.opening_hours ? '取得済み' : '情報なし'}`);
                
            } else {
                console.log(`❌ 詳細情報取得失敗: ${gymName}`);
                errorCount++;
            }
            
            // API制限回避のため待機
            await sleep(2000);
            
        } catch (error) {
            console.error(`❌ エラー (${gymName}):`, error.message);
            errorCount++;
            // エラーが発生してもスクリプトを継続
            await sleep(1000);
        }
    }
    
    // 詳細CSVファイルを生成
    await generateDetailedCSV(detailedGyms);
    
    console.log(`\n📊 詳細情報収集完了:`);
    console.log(`- 処理対象: ${lines.length - 1}件`);
    console.log(`- 成功: ${detailedGyms.length}件`);
    console.log(`- 失敗: ${(lines.length - 1) - detailedGyms.length}件`);
    
    // 情報充実度の分析
    analyzeDataCompleteness(detailedGyms);
    
    return detailedGyms;
}

// Place Details APIで詳細情報を取得
function getPlaceDetails(placeId, apiKey) {
    return new Promise((resolve, reject) => {
        const fields = [
            'place_id', 'name', 'formatted_address', 'geometry',
            'formatted_phone_number', 'website', 'opening_hours',
            'rating', 'user_ratings_total', 'price_level',
            'business_status', 'types', 'url', 'vicinity'
        ].join(',');
        
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=ja&key=${apiKey}`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.status === 'OK') {
                        resolve(result.result);
                    } else {
                        console.log(`API応答エラー: ${result.status}`);
                        resolve(null);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// 営業時間をフォーマット
function formatOpeningHours(openingHours) {
    if (!openingHours || !openingHours.weekday_text) {
        return '';
    }
    
    return openingHours.weekday_text.join('; ');
}

// 詳細CSVファイルを生成
async function generateDetailedCSV(gyms) {
    const headers = [
        'name', 'address', 'phone', 'website', 'latitude', 'longitude',
        'rating', 'userRatingsTotal', 'price_info', 'opening_hours',
        'businessStatus', 'searchCity', 'placeId', 'googleMapsUrl', 'types', 'vicinity'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    for (const gym of gyms) {
        const row = headers.map(field => escapeCSV(gym[field] || '')).join(',');
        csvContent += row + '\n';
    }
    
    fs.writeFileSync('anytime-fitness-detailed.csv', csvContent, 'utf8');
    console.log('✅ 詳細CSVファイルを生成: anytime-fitness-detailed.csv');
}

// データ充実度を分析
function analyzeDataCompleteness(gyms) {
    console.log('\n📈 データ充実度分析:');
    console.log('='.repeat(40));
    
    const fields = ['phone', 'website', 'opening_hours', 'price_info'];
    
    fields.forEach(field => {
        const hasData = gyms.filter(gym => gym[field] && gym[field].trim()).length;
        const percentage = Math.round((hasData / gyms.length) * 100);
        console.log(`${field}: ${hasData}/${gyms.length} (${percentage}%)`);
    });
    
    // 完全なデータを持つ店舗数
    const completeData = gyms.filter(gym => 
        gym.phone && gym.website && gym.opening_hours
    ).length;
    
    console.log(`\n完全データ: ${completeData}/${gyms.length} (${Math.round((completeData / gyms.length) * 100)}%)`);
}

// CSV行をパース
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
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
    collectDetailedAnytimeData()
        .then(results => {
            console.log('\n🎉 詳細情報収集完了！');
        })
        .catch(error => {
            console.error('❌ エラー:', error);
        });
}
