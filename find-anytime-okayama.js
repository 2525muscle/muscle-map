const https = require('https');
const fs = require('fs');

// 岡山県内のエニタイムフィットネスを徹底調査
async function findAnytimeInOkayama() {
    const apiKey = 'AIzaSyDVcClDuehOqCfPIRowZ07ZWrIqyNeEtL4';
    
    // より具体的な検索クエリ
    const searchQueries = [
        'エニタイムフィットネス 岡山県',
        'Anytime Fitness 岡山県',
        'エニタイムフィットネス 岡山市',
        'Anytime Fitness 岡山市',
        'エニタイムフィットネス 倉敷市',
        'Anytime Fitness 倉敷市',
        '24時間ジム 岡山',
        'フィットネス24 岡山'
    ];
    
    console.log('🔍 岡山県内のエニタイムフィットネス徹底調査を開始...\n');
    
    const allResults = [];
    
    for (const query of searchQueries) {
        console.log(`🔍 検索クエリ: "${query}"`);
        
        try {
            // Text Search API を使用
            const results = await textSearch(query, apiKey);
            
            if (results && results.length > 0) {
                console.log(`✅ ${results.length}件の候補が見つかりました`);
                
                // エニタイムフィットネス関連のみフィルタリング
                const anytimeResults = results.filter(place => {
                    const name = place.name.toLowerCase();
                    return name.includes('エニタイム') || 
                           name.includes('anytime') || 
                           name.includes('24時間') ||
                           (name.includes('fitness') && name.includes('24'));
                });
                
                if (anytimeResults.length > 0) {
                    console.log(`🎯 エニタイム関連: ${anytimeResults.length}件`);
                    anytimeResults.forEach(place => {
                        console.log(`   - ${place.name} (${place.address})`);
                    });
                    allResults.push(...anytimeResults);
                } else {
                    console.log(`❌ エニタイム関連なし`);
                }
            } else {
                console.log(`❌ 検索結果なし`);
            }
            
            console.log(''); // 空行
            
            // API制限を考慮して待機
            await sleep(2000);
            
        } catch (error) {
            console.error(`❌ 検索エラー (${query}):`, error.message);
        }
    }
    
    // 重複除去
    const uniqueResults = removeDuplicates(allResults);
    
    console.log(`\n📊 最終結果:`);
    console.log(`- 総発見数: ${allResults.length}件`);
    console.log(`- 重複除去後: ${uniqueResults.length}件`);
    
    if (uniqueResults.length > 0) {
        console.log('\n🏋️ 発見したエニタイムフィットネス関連店舗:');
        uniqueResults.forEach((gym, index) => {
            console.log(`${index + 1}. ${gym.name}`);
            console.log(`   住所: ${gym.address}`);
            console.log(`   座標: ${gym.latitude}, ${gym.longitude}`);
            console.log('');
        });
        
        // 結果をファイルに保存
        const resultData = {
            timestamp: new Date().toISOString(),
            searchQueries: searchQueries,
            totalFound: allResults.length,
            uniqueResults: uniqueResults.length,
            gyms: uniqueResults
        };
        
        fs.writeFileSync('anytime-search-results.json', JSON.stringify(resultData, null, 2), 'utf8');
        console.log('✅ 結果を anytime-search-results.json に保存しました');
        
    } else {
        console.log('\n❌ 岡山県内にエニタイムフィットネスは見つかりませんでした');
        console.log('💡 可能性:');
        console.log('   1. 岡山県にはエニタイムフィットネスの店舗がない');
        console.log('   2. 別の名称で登録されている');
        console.log('   3. 検索範囲外の場所にある');
    }
    
    return uniqueResults;
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
                        const gyms = result.results.map(place => ({
                            name: place.name,
                            address: place.formatted_address || '',
                            latitude: place.geometry.location.lat,
                            longitude: place.geometry.location.lng,
                            rating: place.rating || '',
                            userRatingsTotal: place.user_ratings_total || '',
                            placeId: place.place_id,
                            businessStatus: place.business_status || 'OPERATIONAL'
                        }));
                        resolve(gyms);
                    } else {
                        console.log(`API応答: ${result.status}`);
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

// 待機関数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 実行
if (require.main === module) {
    findAnytimeInOkayama()
        .then(results => {
            console.log('\n🎉 調査完了！');
        })
        .catch(error => {
            console.error('❌ エラー:', error);
        });
}
