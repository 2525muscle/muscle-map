const fs = require('fs');

/**
 * 営業時間表示改善ツール
 * CSVの営業時間を見やすい形式に変換
 */

// 営業時間を見やすい形式に変換する関数
function formatOpeningHours(rawHours) {
    if (!rawHours || rawHours.trim() === '') {
        return '営業時間不明';
    }
    
    // セミコロンで分割
    const days = rawHours.split(';').map(day => day.trim());
    
    // 曜日と時間を解析
    const schedule = {};
    const dayMap = {
        '月曜日': 'Mon',
        '火曜日': 'Tue', 
        '水曜日': 'Wed',
        '木曜日': 'Thu',
        '金曜日': 'Fri',
        '土曜日': 'Sat',
        '日曜日': 'Sun'
    };
    
    days.forEach(dayInfo => {
        for (const [jpDay, enDay] of Object.entries(dayMap)) {
            if (dayInfo.includes(jpDay)) {
                const timeInfo = dayInfo.replace(jpDay + ':', '').trim();
                schedule[enDay] = timeInfo;
                break;
            }
        }
    });
    
    // 同じ営業時間をグループ化
    const timeGroups = {};
    Object.entries(schedule).forEach(([day, time]) => {
        if (!timeGroups[time]) {
            timeGroups[time] = [];
        }
        timeGroups[time].push(day);
    });
    
    // 見やすい形式に変換
    const formatted = [];
    
    Object.entries(timeGroups).forEach(([time, days]) => {
        if (time.includes('定休日') || time.includes('休み')) {
            formatted.push(`定休日: ${days.join('・')}`);
        } else if (time.includes('24 時間営業') || time.includes('24時間')) {
            formatted.push(`24時間営業: ${days.join('・')}`);
        } else {
            // 連続する曜日をまとめる
            const dayGroups = groupConsecutiveDays(days);
            formatted.push(`${time}: ${dayGroups}`);
        }
    });
    
    return formatted.join('\n');
}

// 連続する曜日をまとめる関数
function groupConsecutiveDays(days) {
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const sortedDays = days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    
    if (sortedDays.length <= 2) {
        return sortedDays.join('・');
    }
    
    // 連続する日をチェック
    const groups = [];
    let currentGroup = [sortedDays[0]];
    
    for (let i = 1; i < sortedDays.length; i++) {
        const currentIndex = dayOrder.indexOf(sortedDays[i]);
        const prevIndex = dayOrder.indexOf(sortedDays[i-1]);
        
        if (currentIndex === prevIndex + 1) {
            currentGroup.push(sortedDays[i]);
        } else {
            groups.push(currentGroup);
            currentGroup = [sortedDays[i]];
        }
    }
    groups.push(currentGroup);
    
    // グループを文字列に変換
    return groups.map(group => {
        if (group.length === 1) {
            return group[0];
        } else if (group.length === 2) {
            return group.join('・');
        } else {
            return `${group[0]}～${group[group.length-1]}`;
        }
    }).join('・');
}

// 短縮表示版（マップピン用）
function formatOpeningHoursShort(rawHours) {
    if (!rawHours || rawHours.trim() === '') {
        return '営業時間不明';
    }
    
    // 24時間営業チェック
    if (rawHours.includes('24 時間営業') || rawHours.includes('24時間')) {
        return '24時間営業';
    }
    
    // 定休日チェック
    if (rawHours.includes('定休日')) {
        const closedDays = [];
        if (rawHours.includes('月曜日: 定休日')) closedDays.push('月');
        if (rawHours.includes('火曜日: 定休日')) closedDays.push('火');
        if (rawHours.includes('水曜日: 定休日')) closedDays.push('水');
        if (rawHours.includes('木曜日: 定休日')) closedDays.push('木');
        if (rawHours.includes('金曜日: 定休日')) closedDays.push('金');
        if (rawHours.includes('土曜日: 定休日')) closedDays.push('土');
        if (rawHours.includes('日曜日: 定休日')) closedDays.push('日');
        
        if (closedDays.length > 0) {
            return `${closedDays.join('・')}定休`;
        }
    }
    
    // 一般的な営業時間の抽出
    const timeMatch = rawHours.match(/(\d{1,2})時(\d{2})分～(\d{1,2})時(\d{2})分/);
    if (timeMatch) {
        const [, startHour, startMin, endHour, endMin] = timeMatch;
        return `${startHour}:${startMin}～${endHour}:${endMin}`;
    }
    
    return '営業時間要確認';
}

// CSVファイルを処理
function processCSVFile(inputFile, outputFile) {
    console.log('📄 営業時間表示改善を開始...\n');
    
    const csvContent = fs.readFileSync(inputFile, 'utf8');
    const lines = csvContent.trim().split('\n');
    const headers = parseCSVLine(lines[0]);
    
    console.log(`📊 処理対象: ${lines.length - 1}件のジム`);
    
    // opening_hoursの列番号を取得
    const hoursIndex = headers.indexOf('opening_hours');
    if (hoursIndex === -1) {
        console.error('❌ opening_hours列が見つかりません');
        return;
    }
    
    // 新しいヘッダーを追加
    const newHeaders = [...headers];
    newHeaders.splice(hoursIndex + 1, 0, 'opening_hours_formatted', 'opening_hours_short');
    
    let newCsvContent = newHeaders.join(',') + '\n';
    
    // 各行を処理
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const rawHours = values[hoursIndex] || '';
        
        // 改善された営業時間を生成
        const formattedHours = formatOpeningHours(rawHours);
        const shortHours = formatOpeningHoursShort(rawHours);
        
        // 新しい値を挿入
        const newValues = [...values];
        newValues.splice(hoursIndex + 1, 0, formattedHours, shortHours);
        
        // CSVエスケープして追加
        const escapedValues = newValues.map(value => escapeCSV(value));
        newCsvContent += escapedValues.join(',') + '\n';
        
        // 進捗表示（最初の10件）
        if (i <= 10) {
            console.log(`✅ ${values[1]} (${values[0]})`);
            console.log(`   元: ${rawHours.substring(0, 50)}...`);
            console.log(`   改善: ${formattedHours.replace(/\n/g, ' | ')}`);
            console.log(`   短縮: ${shortHours}\n`);
        }
    }
    
    // 新しいCSVファイルを保存
    fs.writeFileSync(outputFile, newCsvContent, 'utf8');
    
    console.log(`✅ 営業時間表示改善完了: ${outputFile}`);
    console.log(`📊 処理件数: ${lines.length - 1}件`);
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

// 実行
if (require.main === module) {
    const inputFile = 'gyms_comprehensive_2025-07-28.csv';
    const outputFile = 'gyms_comprehensive_improved_hours.csv';
    
    try {
        processCSVFile(inputFile, outputFile);
        console.log('\n🎉 営業時間表示改善完了！');
    } catch (error) {
        console.error('❌ エラー:', error);
    }
}

module.exports = { formatOpeningHours, formatOpeningHoursShort };
