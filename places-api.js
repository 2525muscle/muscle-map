// Google Places API連携機能

class PlacesAPIService {
    constructor() {
        this.apiKey = window.APP_CONFIG?.GOOGLE_PLACES_API_KEY;
        this.searchConfig = window.APP_CONFIG?.SEARCH_CONFIG;
        this.service = null;
    }

    // Google Maps APIの初期化
    initializeService(map) {
        if (window.google && window.google.maps) {
            this.service = new google.maps.places.PlacesService(map);
            return true;
        }
        console.error('Google Maps API が読み込まれていません');
        return false;
    }

    // 岡山県内のジムを検索
    async searchGymsInOkayama() {
        return new Promise((resolve, reject) => {
            if (!this.service) {
                reject('Places Service が初期化されていません');
                return;
            }

            const request = {
                location: new google.maps.LatLng(
                    this.searchConfig.center.lat,
                    this.searchConfig.center.lng
                ),
                radius: this.searchConfig.radius,
                keyword: 'ジム フィットネス スポーツクラブ',
                type: 'gym'
            };

            this.service.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    console.log(`${results.length}件のジムが見つかりました`);
                    resolve(results);
                } else {
                    console.error('Places API検索エラー:', status);
                    reject(status);
                }
            });
        });
    }

    // 詳細情報を取得
    async getPlaceDetails(placeId) {
        return new Promise((resolve, reject) => {
            if (!this.service) {
                reject('Places Service が初期化されていません');
                return;
            }

            const request = {
                placeId: placeId,
                fields: [
                    'name',
                    'formatted_address',
                    'geometry',
                    'formatted_phone_number',
                    'website',
                    'opening_hours',
                    'rating',
                    'user_ratings_total',
                    'photos',
                    'price_level',
                    'types'
                ]
            };

            this.service.getDetails(request, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    resolve(place);
                } else {
                    console.error('詳細情報取得エラー:', status);
                    reject(status);
                }
            });
        });
    }

    // Places APIの結果を内部データ形式に変換
    convertToGymData(place, detailedInfo = null) {
        const info = detailedInfo || place;
        
        // ジムタイプを推定
        const gymType = this.estimateGymType(info.name, info.types);
        
        return {
            id: place.place_id,
            name: info.name,
            address: info.formatted_address || info.vicinity,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            type: gymType,
            
            // 詳細情報
            hours: this.formatOpeningHours(info.opening_hours),
            closedDays: this.extractClosedDays(info.opening_hours),
            phone: info.formatted_phone_number || '情報なし',
            website: info.website || '情報なし',
            rating: info.rating || 0,
            reviewCount: info.user_ratings_total || 0,
            priceLevel: info.price_level || 0,
            
            // 推定情報
            parking: '要確認',
            photography: '要確認',
            pricing: this.estimatePricing(info.price_level, gymType)
        };
    }

    // ジムタイプを推定
    estimateGymType(name, types) {
        const nameUpper = name.toUpperCase();
        
        if (nameUpper.includes('エニタイム') || nameUpper.includes('ANYTIME')) {
            return '24時間ジム';
        }
        if (nameUpper.includes('カーブス') || nameUpper.includes('CURVES')) {
            return '女性専用';
        }
        if (nameUpper.includes('コナミ') || nameUpper.includes('ルネサンス') || nameUpper.includes('セントラル')) {
            return '総合ジム';
        }
        if (nameUpper.includes('RIZAP') || nameUpper.includes('ライザップ')) {
            return 'パーソナル';
        }
        if (nameUpper.includes('ヨガ') || nameUpper.includes('YOGA')) {
            return 'ヨガ・ピラティス';
        }
        
        return '総合ジム'; // デフォルト
    }

    // 営業時間をフォーマット
    formatOpeningHours(openingHours) {
        if (!openingHours || !openingHours.weekday_text) {
            return '営業時間情報なし';
        }
        
        return openingHours.weekday_text.join('\n');
    }

    // 定休日を抽出
    extractClosedDays(openingHours) {
        if (!openingHours || !openingHours.weekday_text) {
            return '情報なし';
        }
        
        const closedDays = openingHours.weekday_text
            .filter(day => day.includes('定休日') || day.includes('休業'))
            .map(day => day.split(':')[0]);
            
        return closedDays.length > 0 ? closedDays.join(', ') : '年中無休';
    }

    // 料金を推定
    estimatePricing(priceLevel, gymType) {
        const basePrices = {
            '24時間ジム': '月額 6,000円〜8,000円',
            '総合ジム': '月額 8,000円〜12,000円',
            '女性専用': '月額 5,000円〜7,000円',
            'パーソナル': '1回 8,000円〜15,000円',
            'ヨガ・ピラティス': '月額 6,000円〜10,000円'
        };
        
        return basePrices[gymType] || '料金要確認';
    }
}

// グローバルに公開
window.PlacesAPIService = PlacesAPIService;
