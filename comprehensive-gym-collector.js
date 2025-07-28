const https = require('https');
const fs = require('fs');

/**
 * 完全再構築版：包括的ジム情報収集システム
 * - 多層収集戦略（Nearby Search + Text Search + チェーン別検索）
 * - 品質検証システム
 * - 重複除去アルゴリズム
 * - 詳細情報自動取得
 */
class ComprehensiveGymCollector {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.allGyms = [];
        this.processedPlaceIds = new Set();
        this.chainKeywords = [
            'エニタイムフィットネス', 'Anytime Fitness',
            'RIZAP', 'ライザップ',
            'Gold\'s Gym', 'ゴールドジム',
            'Konami Sports', 'コナミスポーツ',
            'Central Sports', 'セントラルスポーツ',
            'Curves', 'カーブス',
            'Joyfit', 'ジョイフィット',
            'Tipness', 'ティップネス',
            'Renaissance', 'ルネサンス',
            'Dunlop Sports', 'ダンロップスポーツ'
        ];
        
        this.cities = [
            '岡山市', '倉敷市', '津山市', '玉野市', '笠岡市',
            '井原市', '総社市', '高梁市', '新見市', '備前市',
            '瀬戸内市', '赤磐市', '真庭市', '美作市', '浅口市'
        ];
    }

    /**
     * メイン収集処理
     */
    async collectAllGyms() {
        console.log('🚀 包括的ジム情報収集を開始...\n');
        console.log('📊 収集戦略:');
        console.log('  1. 地域別Nearby Search（網羅性重視）');
        console.log('  2. 大手チェーン別Text Search（漏れ防止）');
        console.log('  3. 詳細情報自動取得');
        console.log('  4. 品質検証・重複除去\n');

        // Phase 1: 地域別Nearby Search
        await this.collectByRegions();
        
        // Phase 2: 大手チェーン別Text Search
        await this.collectByChains();
        
        // Phase 3: 詳細情報取得
        await this.enrichWithDetails();
        
        // Phase 4: 品質検証・重複除去
        await this.qualityAssurance();
        
        // Phase 5: CSV出力
        await this.generateCSV();
        
        return this.allGyms;
    }

    /**
     * Phase 1: 地域別Nearby Search
     */
    async collectByRegions() {
        console.log('📍 Phase 1: 地域別Nearby Search開始\n');
        
        for (const city of this.cities) {
            console.log(`🔍 ${city}のジム情報を収集中...`);
            
            // 都市の座標を取得
            const coordinates = await this.geocodeCity(`${city}, 岡山県, 日本`);
            if (!coordinates) {
                console.log(`❌ ${city}の座標取得失敗`);
                continue;
            }
            
            // 複数半径で検索（網羅性向上）
            const radiuses = [5000, 10000, 15000];
            
            for (const radius of radiuses) {
                console.log(`  📡 半径${radius}m圏内を検索...`);
                const gyms = await this.searchNearbyGyms(coordinates.lat, coordinates.lng, radius);
                
                let newCount = 0;
                for (const gym of gyms) {
                    if (!this.processedPlaceIds.has(gym.place_id)) {
                        this.allGyms.push({
                            ...gym,
                            searchCity: city,
                            collectionMethod: 'nearby_search',
                            searchRadius: radius
                        });
                        this.processedPlaceIds.add(gym.place_id);
                        newCount++;
                    }
                }
                
                console.log(`  ✅ 新規発見: ${newCount}件`);
                await this.sleep(1000); // API制限回避
            }
            
            console.log(`✅ ${city}完了 (累計: ${this.allGyms.length}件)\n`);
            await this.sleep(2000);
        }
        
        console.log(`📊 Phase 1完了: ${this.allGyms.length}件のジムを発見\n`);
    }

    /**
     * Phase 2: 大手チェーン別Text Search
     */
    async collectByChains() {
        console.log('🏢 Phase 2: 大手チェーン別Text Search開始\n');
        
        for (const keyword of this.chainKeywords) {
            console.log(`🔍 「${keyword}」で岡山県内を検索中...`);
            
            const query = `${keyword} 岡山県`;
            const gyms = await this.textSearchGyms(query);
            
            let newCount = 0;
            for (const gym of gyms) {
                if (!this.processedPlaceIds.has(gym.place_id)) {
                    this.allGyms.push({
                        ...gym,
                        searchCity: '岡山県',
                        collectionMethod: 'text_search',
                        searchKeyword: keyword
                    });
                    this.processedPlaceIds.add(gym.place_id);
                    newCount++;
                }
            }
            
            console.log(`  ✅ 新規発見: ${newCount}件`);
            await this.sleep(2000); // API制限回避
        }
        
        console.log(`📊 Phase 2完了: 累計${this.allGyms.length}件\n`);
    }

    /**
     * Phase 3: 詳細情報取得
     */
    async enrichWithDetails() {
        console.log('📋 Phase 3: 詳細情報取得開始\n');
        console.log(`対象: ${this.allGyms.length}件のジム`);
        
        let processedCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < this.allGyms.length; i++) {
            const gym = this.allGyms[i];
            console.log(`🔍 詳細情報取得中 (${i + 1}/${this.allGyms.length}): ${gym.name}`);
            
            try {
                const details = await this.getPlaceDetails(gym.place_id);
                if (details) {
                    // 詳細情報をマージ
                    this.allGyms[i] = {
                        ...gym,
                        ...this.extractDetailedInfo(details)
                    };
                    processedCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.log(`  ❌ エラー: ${error.message}`);
                errorCount++;
            }
            
            await this.sleep(1500); // API制限回避
        }
        
        console.log(`📊 Phase 3完了:`);
        console.log(`  ✅ 成功: ${processedCount}件`);
        console.log(`  ❌ エラー: ${errorCount}件\n`);
    }

    /**
     * Phase 4: 品質検証・重複除去
     */
    async qualityAssurance() {
        console.log('🔍 Phase 4: 品質検証・重複除去開始\n');
        
        const originalCount = this.allGyms.length;
        
        // 重複除去
        this.allGyms = this.removeDuplicates(this.allGyms);
        const afterDeduplication = this.allGyms.length;
        
        // データ品質検証
        this.allGyms = this.allGyms.filter(gym => this.validateGymData(gym));
        const afterValidation = this.allGyms.length;
        
        console.log(`📊 品質検証結果:`);
        console.log(`  元データ: ${originalCount}件`);
        console.log(`  重複除去後: ${afterDeduplication}件 (除去: ${originalCount - afterDeduplication}件)`);
        console.log(`  検証後: ${afterValidation}件 (無効: ${afterDeduplication - afterValidation}件)\n`);
    }

    /**
     * Phase 5: CSV生成
     */
    async generateCSV() {
        console.log('📄 Phase 5: CSV生成開始\n');
        
        const headers = [
            'id', 'name', 'chain_type', 'address', 'phone', 'website',
            'latitude', 'longitude', 'rating', 'reviews_count', 'price_level',
            'opening_hours', 'business_status', 'types', 'vicinity',
            'searchCity', 'collectionMethod', 'placeId', 'googleMapsUrl',
            'last_updated', 'data_confidence'
        ];
        
        let csvContent = headers.join(',') + '\n';
        
        for (let i = 0; i < this.allGyms.length; i++) {
            const gym = this.allGyms[i];
            const row = [
                i + 1, // id
                this.escapeCSV(gym.name),
                this.escapeCSV(this.detectChainType(gym.name)),
                this.escapeCSV(gym.formatted_address || gym.vicinity || ''),
                this.escapeCSV(gym.formatted_phone_number || ''),
                this.escapeCSV(gym.website || ''),
                gym.geometry?.location?.lat || gym.lat || '',
                gym.geometry?.location?.lng || gym.lng || '',
                gym.rating || '',
                gym.user_ratings_total || '',
                gym.price_level || '',
                this.escapeCSV(this.formatOpeningHours(gym.opening_hours)),
                gym.business_status || 'OPERATIONAL',
                this.escapeCSV((gym.types || []).join(', ')),
                this.escapeCSV(gym.vicinity || ''),
                this.escapeCSV(gym.searchCity || ''),
                gym.collectionMethod || '',
                gym.place_id,
                `https://maps.google.com/?place_id=${gym.place_id}`,
                new Date().toISOString().split('T')[0],
                this.calculateConfidenceScore(gym)
            ];
            
            csvContent += row.join(',') + '\n';
        }
        
        // 新しいCSVファイルを生成
        const filename = `gyms_comprehensive_${new Date().toISOString().split('T')[0]}.csv`;
        fs.writeFileSync(filename, csvContent, 'utf8');
        
        console.log(`✅ CSV生成完了: ${filename}`);
        console.log(`📊 最終結果: ${this.allGyms.length}件のジム情報\n`);
        
        // 収集統計を表示
        this.displayCollectionStats();
    }

    /**
     * 収集統計表示
     */
    displayCollectionStats() {
        console.log('📈 収集統計:');
        console.log('='.repeat(50));
        
        // 収集方法別統計
        const methodStats = {};
        this.allGyms.forEach(gym => {
            const method = gym.collectionMethod || 'unknown';
            methodStats[method] = (methodStats[method] || 0) + 1;
        });
        
        console.log('📊 収集方法別:');
        Object.entries(methodStats).forEach(([method, count]) => {
            console.log(`  ${method}: ${count}件`);
        });
        
        // チェーン別統計
        const chainStats = {};
        this.allGyms.forEach(gym => {
            const chain = this.detectChainType(gym.name);
            chainStats[chain] = (chainStats[chain] || 0) + 1;
        });
        
        console.log('\n🏢 主要チェーン別:');
        Object.entries(chainStats)
            .filter(([chain, count]) => chain !== 'その他' && count > 0)
            .sort(([,a], [,b]) => b - a)
            .forEach(([chain, count]) => {
                console.log(`  ${chain}: ${count}件`);
            });
        
        // 品質統計
        const withPhone = this.allGyms.filter(gym => gym.formatted_phone_number).length;
        const withWebsite = this.allGyms.filter(gym => gym.website).length;
        const withHours = this.allGyms.filter(gym => gym.opening_hours).length;
        
        console.log('\n📋 データ品質:');
        console.log(`  電話番号: ${withPhone}/${this.allGyms.length} (${Math.round(withPhone/this.allGyms.length*100)}%)`);
        console.log(`  ウェブサイト: ${withWebsite}/${this.allGyms.length} (${Math.round(withWebsite/this.allGyms.length*100)}%)`);
        console.log(`  営業時間: ${withHours}/${this.allGyms.length} (${Math.round(withHours/this.allGyms.length*100)}%)`);
    }

    // ユーティリティメソッド群
    async geocodeCity(cityName) {
        return new Promise((resolve, reject) => {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityName)}&key=${this.apiKey}`;
            
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
                        resolve(null);
                    }
                });
            }).on('error', () => resolve(null));
        });
    }

    async searchNearbyGyms(lat, lng, radius) {
        return new Promise((resolve, reject) => {
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=gym&language=ja&key=${this.apiKey}`;
            
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (result.status === 'OK') {
                            resolve(result.results || []);
                        } else {
                            resolve([]);
                        }
                    } catch (error) {
                        resolve([]);
                    }
                });
            }).on('error', () => resolve([]));
        });
    }

    async textSearchGyms(query) {
        return new Promise((resolve, reject) => {
            const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=ja&key=${this.apiKey}`;
            
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (result.status === 'OK') {
                            // ジム関連のみフィルタリング
                            const gymResults = result.results.filter(place => 
                                this.isGymRelated(place)
                            );
                            resolve(gymResults);
                        } else {
                            resolve([]);
                        }
                    } catch (error) {
                        resolve([]);
                    }
                });
            }).on('error', () => resolve([]));
        });
    }

    async getPlaceDetails(placeId) {
        return new Promise((resolve, reject) => {
            const fields = [
                'place_id', 'name', 'formatted_address', 'geometry',
                'formatted_phone_number', 'website', 'opening_hours',
                'rating', 'user_ratings_total', 'price_level',
                'business_status', 'types', 'url', 'vicinity'
            ].join(',');
            
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=ja&key=${this.apiKey}`;
            
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
                        resolve(null);
                    }
                });
            }).on('error', () => resolve(null));
        });
    }

    isGymRelated(place) {
        const name = place.name.toLowerCase();
        const types = place.types || [];
        
        // ジム関連キーワード
        const gymKeywords = [
            'gym', 'fitness', 'training', 'workout', 'sports',
            'ジム', 'フィットネス', 'トレーニング', 'スポーツ'
        ];
        
        // 除外キーワード
        const excludeKeywords = [
            'school', '学校', 'hospital', '病院', 'hotel', 'ホテル'
        ];
        
        const hasGymKeyword = gymKeywords.some(keyword => name.includes(keyword));
        const hasGymType = types.includes('gym') || types.includes('health');
        const hasExcludeKeyword = excludeKeywords.some(keyword => name.includes(keyword));
        
        return (hasGymKeyword || hasGymType) && !hasExcludeKeyword;
    }

    extractDetailedInfo(details) {
        return {
            formatted_address: details.formatted_address,
            formatted_phone_number: details.formatted_phone_number,
            website: details.website,
            opening_hours: details.opening_hours,
            rating: details.rating,
            user_ratings_total: details.user_ratings_total,
            price_level: details.price_level,
            business_status: details.business_status,
            types: details.types,
            url: details.url,
            vicinity: details.vicinity,
            geometry: details.geometry
        };
    }

    removeDuplicates(gyms) {
        const unique = [];
        const seen = new Set();
        
        for (const gym of gyms) {
            // Place IDによる重複チェック
            if (seen.has(gym.place_id)) {
                continue;
            }
            
            // 座標・名前による類似チェック
            const isDuplicate = unique.some(existing => 
                this.isSimilarGym(gym, existing)
            );
            
            if (!isDuplicate) {
                unique.push(gym);
                seen.add(gym.place_id);
            }
        }
        
        return unique;
    }

    isSimilarGym(gym1, gym2) {
        // 座標が近い場合（100m以内）
        const lat1 = gym1.geometry?.location?.lat || gym1.lat;
        const lng1 = gym1.geometry?.location?.lng || gym1.lng;
        const lat2 = gym2.geometry?.location?.lat || gym2.lat;
        const lng2 = gym2.geometry?.location?.lng || gym2.lng;
        
        if (lat1 && lng1 && lat2 && lng2) {
            const distance = this.calculateDistance(lat1, lng1, lat2, lng2);
            if (distance < 0.1) { // 100m以内
                // 名前の類似度もチェック
                const similarity = this.calculateNameSimilarity(gym1.name, gym2.name);
                return similarity > 0.8;
            }
        }
        
        return false;
    }

    validateGymData(gym) {
        // 必須フィールドのチェック
        if (!gym.name || !gym.place_id) {
            return false;
        }
        
        // 座標の妥当性チェック
        const lat = gym.geometry?.location?.lat || gym.lat;
        const lng = gym.geometry?.location?.lng || gym.lng;
        
        if (!lat || !lng) {
            return false;
        }
        
        // 岡山県の座標範囲チェック（大まかな範囲）
        if (lat < 34.0 || lat > 35.5 || lng < 133.0 || lng > 134.5) {
            return false;
        }
        
        return true;
    }

    detectChainType(name) {
        const chainMap = {
            'エニタイム': 'エニタイムフィットネス',
            'anytime': 'エニタイムフィットネス',
            'rizap': 'RIZAP',
            'ライザップ': 'RIZAP',
            'gold': 'Gold\'s Gym',
            'ゴールド': 'Gold\'s Gym',
            'konami': 'コナミスポーツ',
            'コナミ': 'コナミスポーツ',
            'central': 'セントラルスポーツ',
            'セントラル': 'セントラルスポーツ',
            'curves': 'Curves',
            'カーブス': 'Curves',
            'joyfit': 'Joyfit',
            'ジョイフィット': 'Joyfit'
        };
        
        const lowerName = name.toLowerCase();
        for (const [keyword, chain] of Object.entries(chainMap)) {
            if (lowerName.includes(keyword.toLowerCase())) {
                return chain;
            }
        }
        
        return 'その他';
    }

    formatOpeningHours(openingHours) {
        if (!openingHours || !openingHours.weekday_text) {
            return '';
        }
        return openingHours.weekday_text.join('; ');
    }

    calculateConfidenceScore(gym) {
        let score = 0.5; // 基本スコア
        
        if (gym.formatted_phone_number) score += 0.1;
        if (gym.website) score += 0.1;
        if (gym.opening_hours) score += 0.1;
        if (gym.rating && gym.user_ratings_total > 5) score += 0.1;
        if (gym.collectionMethod === 'nearby_search') score += 0.05;
        if (gym.business_status === 'OPERATIONAL') score += 0.05;
        
        return Math.min(1.0, score).toFixed(2);
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // 地球の半径（km）
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateNameSimilarity(name1, name2) {
        // 簡単なレーベンシュタイン距離による類似度計算
        const len1 = name1.length;
        const len2 = name2.length;
        const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));
        
        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = name1[i-1] === name2[j-1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j-1][i] + 1,
                    matrix[j][i-1] + 1,
                    matrix[j-1][i-1] + cost
                );
            }
        }
        
        const maxLen = Math.max(len1, len2);
        return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
    }

    escapeCSV(value) {
        if (!value) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 実行
async function main() {
    const apiKey = 'AIzaSyDVcClDuehOqCfPIRowZ07ZWrIqyNeEtL4';
    const collector = new ComprehensiveGymCollector(apiKey);
    
    try {
        console.log('🎯 完全再構築版ジム情報収集システム');
        console.log('=' .repeat(60));
        
        const results = await collector.collectAllGyms();
        
        console.log('\n🎉 完全再構築完了！');
        console.log(`📊 最終結果: ${results.length}件の高品質ジムデータ`);
        
    } catch (error) {
        console.error('❌ エラー:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = ComprehensiveGymCollector;
