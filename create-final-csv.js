const fs = require('fs');
const path = require('path');

// 入力ファイルと出力ファイルのパス
const inputFile = 'gyms_comprehensive_2025-07-28.csv';
const outputFile = 'gyms_final_2025-07-28.csv';

console.log('📊 最終CSVファイル作成開始...');

try {
    // 包括的CSVファイルを読み込み
    const csvContent = fs.readFileSync(inputFile, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
        throw new Error('CSVファイルが空または不正です');
    }
    
    // ヘッダー行を解析
    const headers = parseCSVLine(lines[0]);
    console.log(`📋 元のヘッダー: ${headers.length}列`);
    console.log(`📊 総データ行数: ${lines.length - 1}行`);
    
    // アプリ用の新しいヘッダーを定義
    const newHeaders = [
        'id',
        'name',
        'chain_type',
        'address',
        'phone',
        'website',
        'latitude',
        'longitude',
        'rating',
        'user_ratings_total',
        'price_level',
        'opening_hours',
        'business_status',
        'types',
        'formatted_address',
        'city',
        'collection_method',
        'place_id',
        'google_maps_url',
        'collection_date',
        'confidence_score'
    ];
    
    // 新しいCSVデータを構築
    const newCsvLines = [newHeaders.join(',')];
    let processedCount = 0;
    let skippedCount = 0;
    
    // 各データ行を処理
    for (let i = 1; i < lines.length; i++) {
        try {
            const values = parseCSVLine(lines[i]);
            
            if (values.length !== headers.length) {
                console.log(`⚠️  行${i}: 列数不一致をスキップ (期待: ${headers.length}, 実際: ${values.length})`);
                skippedCount++;
                continue;
            }
            
            // データオブジェクトを作成
            const gym = {};
            headers.forEach((header, index) => {
                gym[header] = values[index] ? values[index].trim() : '';
            });
            
            // 必須フィールドのチェック
            if (!gym.name || !gym.latitude || !gym.longitude) {
                console.log(`⚠️  行${i}: 必須フィールド不足をスキップ (name: ${gym.name}, lat: ${gym.latitude}, lng: ${gym.longitude})`);
                skippedCount++;
                continue;
            }
            
            // 座標の妥当性チェック
            const lat = parseFloat(gym.latitude);
            const lng = parseFloat(gym.longitude);
            if (isNaN(lat) || isNaN(lng)) {
                console.log(`⚠️  行${i}: 無効な座標をスキップ (lat: ${gym.latitude}, lng: ${gym.longitude})`);
                skippedCount++;
                continue;
            }
            
            // 新しい行データを作成
            const newRowData = [
                gym.id || processedCount + 1,
                escapeCSVField(gym.name),
                escapeCSVField(gym.chain_type || 'その他'),
                escapeCSVField(gym.address),
                escapeCSVField(gym.phone),
                escapeCSVField(gym.website),
                gym.latitude,
                gym.longitude,
                gym.rating || '',
                gym.user_ratings_total || '',
                gym.price_level || '',
                escapeCSVField(gym.opening_hours),
                gym.business_status || 'OPERATIONAL',
                escapeCSVField(gym.types),
                escapeCSVField(gym.formatted_address),
                escapeCSVField(gym.city),
                gym.collection_method || 'nearby_search',
                gym.place_id || '',
                escapeCSVField(gym.google_maps_url),
                gym.collection_date || '2025-07-28',
                gym.confidence_score || '1.00'
            ];
            
            newCsvLines.push(newRowData.join(','));
            processedCount++;
            
            // 進捗表示
            if (processedCount % 50 === 0) {
                console.log(`✅ 処理済み: ${processedCount}件`);
            }
            
        } catch (error) {
            console.log(`❌ 行${i}の処理エラー: ${error.message}`);
            skippedCount++;
        }
    }
    
    // 最終CSVファイルを書き込み
    const finalCsvContent = newCsvLines.join('\n');
    fs.writeFileSync(outputFile, finalCsvContent, 'utf-8');
    
    console.log('\n🎉 最終CSVファイル作成完了！');
    console.log(`📁 出力ファイル: ${outputFile}`);
    console.log(`✅ 処理済み件数: ${processedCount}件`);
    console.log(`⚠️  スキップ件数: ${skippedCount}件`);
    console.log(`📊 最終データ件数: ${processedCount}件`);
    
    // ファイルサイズを確認
    const stats = fs.statSync(outputFile);
    console.log(`📦 ファイルサイズ: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // サンプルデータを表示
    console.log('\n📋 サンプルデータ（最初の3件）:');
    const sampleLines = newCsvLines.slice(0, 4);
    sampleLines.forEach((line, index) => {
        if (index === 0) {
            console.log(`ヘッダー: ${line.substring(0, 100)}...`);
        } else {
            console.log(`データ${index}: ${line.substring(0, 100)}...`);
        }
    });
    
    // チェーン別統計
    console.log('\n📊 チェーン別統計:');
    const chainStats = {};
    for (let i = 1; i < newCsvLines.length; i++) {
        const values = parseCSVLine(newCsvLines[i]);
        const chainType = values[2] || 'その他';
        chainStats[chainType] = (chainStats[chainType] || 0) + 1;
    }
    
    Object.entries(chainStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([chain, count]) => {
            console.log(`  ${chain}: ${count}件`);
        });
    
} catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
}

// CSV行をパースする関数
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

// CSVフィールドをエスケープする関数
function escapeCSVField(field) {
    if (!field) return '';
    
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}
