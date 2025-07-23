// CSV インポート機能

class CSVImporter {
    constructor() {
        this.csvData = [];
    }

    // CSVファイルを読み込み
    async importCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csvText = e.target.result;
                    const parsedData = this.parseCSV(csvText);
                    resolve(parsedData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    // CSV文字列を解析
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSVファイルが空または不正です');
        }

        // ヘッダー行を取得
        const headers = this.parseCSVLine(lines[0]);
        const expectedHeaders = [
            'ジム名', '住所', '緯度', '経度', 'ジムタイプ', 
            '営業時間', '定休日', '駐車場', '撮影可否', '料金', 
            '電話番号', 'ウェブサイト'
        ];

        // ヘッダーの検証
        if (!this.validateHeaders(headers, expectedHeaders)) {
            console.warn('ヘッダーが期待される形式と異なります:', headers);
        }

        // データ行を解析
        const gymData = [];
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = this.parseCSVLine(lines[i]);
                if (values.length >= 4) { // 最低限の必須項目
                    const gym = this.convertToGymObject(headers, values);
                    if (gym) {
                        gymData.push(gym);
                    }
                }
            } catch (error) {
                console.error(`${i + 1}行目の解析エラー:`, error);
            }
        }

        return gymData;
    }

    // CSV行を解析（カンマ区切り、クォート対応）
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    // ヘッダーの検証
    validateHeaders(actual, expected) {
        return expected.every(header => 
            actual.some(actualHeader => 
                actualHeader.includes(header) || header.includes(actualHeader)
            )
        );
    }

    // CSV行をジムオブジェクトに変換
    convertToGymObject(headers, values) {
        try {
            const gym = {};
            
            // 基本的なマッピング
            const mapping = {
                'ジム名': 'name',
                '住所': 'address', 
                '緯度': 'lat',
                '経度': 'lng',
                'ジムタイプ': 'type',
                '営業時間': 'hours',
                '定休日': 'closedDays',
                '駐車場': 'parking',
                '撮影可否': 'photography',
                '料金': 'pricing',
                '電話番号': 'phone',
                'ウェブサイト': 'website'
            };

            // ヘッダーと値をマッピング
            headers.forEach((header, index) => {
                const value = values[index] || '';
                const key = this.findMappingKey(header, mapping);
                
                if (key) {
                    if (key === 'lat' || key === 'lng') {
                        gym[key] = parseFloat(value) || 0;
                    } else {
                        gym[key] = value;
                    }
                }
            });

            // 必須項目の検証
            if (!gym.name || !gym.address || !gym.lat || !gym.lng) {
                console.error('必須項目が不足:', gym);
                return null;
            }

            // デフォルト値の設定
            gym.type = gym.type || '総合ジム';
            gym.hours = gym.hours || '営業時間要確認';
            gym.closedDays = gym.closedDays || '定休日要確認';
            gym.parking = gym.parking || '駐車場要確認';
            gym.photography = gym.photography || '撮影可否要確認';
            gym.pricing = gym.pricing || '料金要確認';
            gym.phone = gym.phone || '電話番号なし';
            gym.website = gym.website || 'ウェブサイトなし';

            return gym;
        } catch (error) {
            console.error('ジムオブジェクト変換エラー:', error);
            return null;
        }
    }

    // ヘッダーマッピングキーを検索
    findMappingKey(header, mapping) {
        for (const [key, value] of Object.entries(mapping)) {
            if (header.includes(key) || key.includes(header)) {
                return value;
            }
        }
        return null;
    }

    // サンプルCSVを生成
    generateSampleCSV() {
        const sampleData = [
            'ジム名,住所,緯度,経度,ジムタイプ,営業時間,定休日,駐車場,撮影可否,料金,電話番号,ウェブサイト',
            'エニタイムフィットネス岡山駅前店,岡山県岡山市北区本町6-36,34.6603,133.9348,24時間ジム,24時間営業,年中無休,近隣コインパーキング,不可,月額7480円,086-803-1234,https://www.anytimefitness.co.jp/',
            'コナミスポーツクラブ岡山,岡山県岡山市北区駅前町1-8-18,34.6617,133.9341,総合ジム,平日10:00-23:00,毎週火曜日,有料駐車場あり,要確認,月額8000円〜,086-234-1234,https://www.konami.com/',
            'カーブス岡山表町,岡山県岡山市北区表町3-12-5,34.6625,133.9355,女性専用,平日10:00-19:00,日曜祝日,専用駐車場あり,不可,月額6270円,086-225-1234,https://www.curves.co.jp/'
        ];
        
        return sampleData.join('\n');
    }
}

// グローバルに公開
window.CSVImporter = CSVImporter;
