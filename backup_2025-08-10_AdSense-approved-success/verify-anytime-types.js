const https = require('https');
const fs = require('fs');

// エニタイムフィットネスのGoogle Places API分類を検証
async function verifyAnytimeTypes() {
    const apiKey = 'AIzaSyDVcClDuehOqCfPIRowZ07ZWrIqyNeEtL4';
    
    console.log('🔬 エニタイムフィットネスのGoogle Places API分類検証を開始...\n');
    
    // 検証用のエニタイムフィットネス店舗
    const testGyms = [
        'エニタイムフィットネス 岡山今店',
        'エニタイムフィットネス 倉敷笹沖店',
        'エニタイムフィットネス 岡山益野店'
    ];
    
    const results = [];
    
    for (const gymName of testGyms) {
        console.log(`🔍 検証中: ${gymName}`);
        
        try {
            // Text Searchで詳細情報を取得
            const searchResults = await textSearch(gymName, apiKey);
            
            if (searchResults && searchResults.length > 0) {
                const gym = searchResults[0];
                
                // Place Details APIで完全な情報を取得
                const details = await getPlaceDetails(gym.place_id, apiKey);
                
                if (details) {
                    const analysis = {
                        name: details.name,
                        placeId: details.place_id,
                        types: details.types || [],
                        businessStatus: details.business_status,
                        address: details.formatted_address,
                        hasGymType: details.types ? details.types.includes('gym') : false,
                        allTypes: details.types ? details.types.join(', ') : 'なし'
                    };
                    
                    results.push(analysis);
                    
                    console.log(`✅ ${analysis.name}`);
                    console.log(`   Place ID: ${analysis.placeId}`);
                    console.log(`   Types: ${analysis.allTypes}`);
                    console.log(`   'gym'タイプ含有: ${analysis.hasGymType ? 'YES' : 'NO'}`);
                    console.log('');
                    
                } else {
                    console.log(`❌ 詳細情報取得失敗`);
                }
            } else {
                console.log(`❌ 検索結果なし`);
            }
            
            // API制限回避
            await sleep(2000);
            
        } catch (error) {
            console.error(`❌ エラー (${gymName}):`, error.message);
        }
    }
    
    // 分析結果をまとめ
    console.log('\n📊 分析結果サマリー:');
    console.log('='.repeat(50));
    
    const gymTypeCount = results.filter(r => r.hasGymType).length;
    const totalCount = results.length;
    
    console.log(`🏋️ 検証対象: ${totalCount}件のエニタイムフィットネス`);
    console.log(`📋 'gym'タイプ: ${gymTypeCount}件 (${Math.round(gymTypeCount/totalCount*100)}%)`);
    console.log(`🚫 'gym'タイプなし: ${totalCount - gymTypeCount}件 (${Math.round((totalCount-gymTypeCount)/totalCount*100)}%)`);
    
    if (gymTypeCount < totalCount) {
        console.log('\n🚨 重大な発見:');
        console.log(`   エニタイムフィットネスの${Math.round((totalCount-gymTypeCount)/totalCount*100)}%が'gym'タイプに分類されていません！`);
        console.log('   これが最初の収集で除外された根本原因です。');
    }
    
    // 共通するタイプを分析
    const allTypesFlat = results.flatMap(r => r.types);
    const typeCounts = {};
    allTypesFlat.forEach(type => {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    console.log('\n📈 エニタイムフィットネスの共通タイプ:');
    Object.entries(typeCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
            const percentage = Math.round(count / totalCount * 100);
            console.log(`   ${type}: ${count}件 (${percentage}%)`);
        });
    
    // 結果をファイルに保存
    const reportData = {
        timestamp: new Date().toISOString(),
        summary: {
            totalGyms: totalCount,
            withGymType: gymTypeCount,
            withoutGymType: totalCount - gymTypeCount,
            gymTypePercentage: Math.round(gymTypeCount/totalCount*100)
        },
        typeCounts: typeCounts,
        detailedResults: results
    };
    
    fs.writeFileSync('anytime-type-analysis.json', JSON.stringify(reportData, null, 2), 'utf8');
    console.log('\n✅ 詳細分析結果を anytime-type-analysis.json に保存しました');
    
    return results;
}

// Text Search API
function textSearch(query, apiKey) {
    return new Promise((resolve, reject) => {
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=jp&language=ja&key=${apiKey}`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.status === 'OK') {
                        resolve(result.results);
                    } else {
                        resolve([]);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Place Details API
function getPlaceDetails(placeId, apiKey) {
    return new Promise((resolve, reject) => {
        const fields = 'place_id,name,types,business_status,formatted_address';
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
                        resolve(null);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// 待機関数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 実行
if (require.main === module) {
    verifyAnytimeTypes()
        .then(results => {
            console.log('\n🎉 検証完了！');
        })
        .catch(error => {
            console.error('❌ エラー:', error);
        });
}
