const https = require('https');

// 最初の収集スクリプトと全く同じ条件でエニタイムフィットネスが検索されるか検証
async function reproduceOriginalSearch() {
    const apiKey = 'AIzaSyDVcClDuehOqCfPIRowZ07ZWrIqyNeEtL4';
    
    console.log('🔬 最初の収集スクリプトの再現実験を開始...\n');
    
    // 1. 岡山市の座標を取得（最初のスクリプトと同じ方法）
    console.log('📍 岡山市の座標を取得中...');
    const coordinates = await geocodeCity('岡山市, 岡山県, 日本', apiKey);
    
    if (!coordinates) {
        console.error('❌ 座標取得失敗');
        return;
    }
    
    console.log(`✅ 岡山市座標: ${coordinates.lat}, ${coordinates.lng}`);
    
    // 2. 近くのジムを検索（最初のスクリプトと全く同じ方法）
    console.log('\n🏋️ 岡山市周辺のジムを検索中（type=gym, radius=15000）...');
    const nearbyGyms = await searchNearbyGyms(coordinates.lat, coordinates.lng, 15000, apiKey);
    
    console.log(`🔍 検索結果: ${nearbyGyms.length}件のジム候補`);
    
    // 3. エニタイムフィットネスが含まれているかチェック
    console.log('\n🎯 エニタイムフィットネスの検索結果分析:');
    console.log('='.repeat(60));
    
    const anytimeGyms = nearbyGyms.filter(gym => 
        gym.name.includes('エニタイム') || 
        gym.name.toLowerCase().includes('anytime')
    );
    
    if (anytimeGyms.length > 0) {
        console.log(`✅ エニタイムフィットネス発見: ${anytimeGyms.length}件`);
        anytimeGyms.forEach((gym, index) => {
            console.log(`${index + 1}. ${gym.name}`);
            console.log(`   Place ID: ${gym.place_id}`);
            console.log(`   Rating: ${gym.rating || 'なし'}`);
            console.log(`   Status: ${gym.business_status || 'なし'}`);
            console.log('');
        });
    } else {
        console.log('❌ エニタイムフィットネスが見つかりません！');
        console.log('\n🔍 検索された全ジムリスト:');
        nearbyGyms.slice(0, 20).forEach((gym, index) => {
            console.log(`${index + 1}. ${gym.name} (Rating: ${gym.rating || 'なし'})`);
        });
    }
    
    // 4. 最初のスクリプトの20件制限を適用した場合の分析
    console.log('\n📊 最初のスクリプトの20件制限適用時の分析:');
    const limitedGyms = nearbyGyms.slice(0, 20);
    const limitedAnytime = limitedGyms.filter(gym => 
        gym.name.includes('エニタイム') || 
        gym.name.toLowerCase().includes('anytime')
    );
    
    console.log(`🏋️ 20件制限内のジム: ${limitedGyms.length}件`);
    console.log(`🎯 20件制限内のエニタイム: ${limitedAnytime.length}件`);
    
    if (limitedAnytime.length === 0 && anytimeGyms.length > 0) {
        console.log('🚨 重大発見: エニタイムフィットネスは20件制限で除外されました！');
        
        // エニタイムフィットネスが何番目に出現するかチェック
        for (let i = 0; i < nearbyGyms.length; i++) {
            if (nearbyGyms[i].name.includes('エニタイム') || 
                nearbyGyms[i].name.toLowerCase().includes('anytime')) {
                console.log(`💡 最初のエニタイムフィットネスは${i + 1}番目に出現`);
                break;
            }
        }
    }
    
    // 5. 距離分析
    console.log('\n📏 距離分析:');
    const okayamaCenterLat = coordinates.lat;
    const okayamaCenterLng = coordinates.lng;
    
    anytimeGyms.forEach(gym => {
        const distance = calculateDistance(
            okayamaCenterLat, okayamaCenterLng,
            gym.geometry.location.lat, gym.geometry.location.lng
        );
        console.log(`📍 ${gym.name}: ${distance.toFixed(2)}km`);
    });
    
    // 結果をファイルに保存
    const reportData = {
        timestamp: new Date().toISOString(),
        okayamaCoordinates: coordinates,
        totalGymsFound: nearbyGyms.length,
        anytimeInTotal: anytimeGyms.length,
        anytimeInTop20: limitedAnytime.length,
        excludedByLimit: anytimeGyms.length > 0 && limitedAnytime.length === 0,
        anytimeGyms: anytimeGyms.map(gym => ({
            name: gym.name,
            placeId: gym.place_id,
            rating: gym.rating,
            distance: calculateDistance(
                okayamaCenterLat, okayamaCenterLng,
                gym.geometry.location.lat, gym.geometry.location.lng
            )
        })),
        allGyms: nearbyGyms.slice(0, 30).map(gym => ({
            name: gym.name,
            rating: gym.rating,
            distance: calculateDistance(
                okayamaCenterLat, okayamaCenterLng,
                gym.geometry.location.lat, gym.geometry.location.lng
            )
        }))
    };
    
    const fs = require('fs');
    fs.writeFileSync('original-search-reproduction.json', JSON.stringify(reportData, null, 2), 'utf8');
    console.log('\n✅ 詳細分析結果を original-search-reproduction.json に保存しました');
    
    return reportData;
}

// Geocoding API（最初のスクリプトと同じ）
function geocodeCity(cityName, apiKey) {
    return new Promise((resolve, reject) => {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityName)}&key=${apiKey}`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.status === 'OK' && result.results.length > 0) {
                        resolve(result.results[0].geometry.location);
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

// Nearby Search API（最初のスクリプトと同じ）
function searchNearbyGyms(lat, lng, radius, apiKey) {
    return new Promise((resolve, reject) => {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=gym&key=${apiKey}`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.status === 'OK') {
                        resolve(result.results);
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

// 距離計算（ハーバーサイン公式）
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 実行
if (require.main === module) {
    reproduceOriginalSearch()
        .then(results => {
            console.log('\n🎉 再現実験完了！');
        })
        .catch(error => {
            console.error('❌ エラー:', error);
        });
}
