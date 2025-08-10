const fs = require('fs');

// エニタイムフィットネス店舗をCSVに追加
function addAnytimeToCSV() {
    console.log('🏋️ エニタイムフィットネス店舗をCSVに追加中...');
    
    // 検索結果を読み込み
    const resultsData = JSON.parse(fs.readFileSync('anytime-search-results.json', 'utf8'));
    const anytimeGyms = resultsData.gyms;
    
    console.log(`📊 追加予定: ${anytimeGyms.length}件のエニタイムフィットネス店舗`);
    
    // 既存CSVを読み込み
    let csvContent = fs.readFileSync('gyms.csv', 'utf8');
    const lines = csvContent.trim().split('\n');
    
    console.log(`📄 既存CSV: ${lines.length}行`);
    
    // 重複チェック用に既存データを解析
    const existingGyms = new Set();
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length > 0 && values[0]) {
            existingGyms.add(values[0].trim());
        }
    }
    
    console.log(`🔍 既存ジム数: ${existingGyms.size}件`);
    
    // エニタイムフィットネス店舗を追加
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const gym of anytimeGyms) {
        if (!existingGyms.has(gym.name)) {
            // CSVフォーマットに変換
            const csvLine = [
                escapeCSV(gym.name),
                escapeCSV(gym.address),
                '', // phone
                '', // website
                gym.latitude,
                gym.longitude,
                gym.rating || '',
                gym.userRatingsTotal || '',
                '', // price_info
                '', // opening_hours
                gym.businessStatus || 'OPERATIONAL',
                '岡山県', // searchCity
                gym.placeId
            ].join(',');
            
            csvContent += csvLine + '\n';
            addedCount++;
            console.log(`✅ 追加: ${gym.name}`);
        } else {
            skippedCount++;
            console.log(`⏭️ スキップ (既存): ${gym.name}`);
        }
    }
    
    // CSVファイルに書き戻し
    fs.writeFileSync('gyms.csv', csvContent, 'utf8');
    
    console.log(`\n📊 追加完了:`);
    console.log(`- 新規追加: ${addedCount}件`);
    console.log(`- 重複スキップ: ${skippedCount}件`);
    console.log(`- 総CSV行数: ${csvContent.trim().split('\n').length}行`);
    
    // 追加されたエニタイムフィットネス店舗の確認
    console.log('\n🔍 CSVでエニタイムフィットネスを確認...');
    const finalLines = csvContent.trim().split('\n');
    let anytimeCount = 0;
    
    for (let i = 1; i < finalLines.length; i++) {
        const values = parseCSVLine(finalLines[i]);
        if (values.length > 0 && values[0] && values[0].includes('エニタイムフィットネス')) {
            anytimeCount++;
        }
    }
    
    console.log(`✅ CSV内のエニタイムフィットネス: ${anytimeCount}件`);
    
    return { added: addedCount, skipped: skippedCount, total: anytimeCount };
}

// CSV行をパース（カンマ・クォート対応）
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

// 実行
if (require.main === module) {
    try {
        const result = addAnytimeToCSV();
        console.log('\n🎉 エニタイムフィットネス追加完了！');
    } catch (error) {
        console.error('❌ エラー:', error);
    }
}
