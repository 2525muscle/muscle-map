const fs = require('fs');

/**
 * 営業時間表示さらなる改善ツール
 * 分割営業時間（午前・午後）を見やすく整理
 */

// 営業時間をさらに見やすい形式に変換する関数
function formatOpeningHoursEnhanced(rawHours) {
    if (!rawHours || rawHours.trim() === '') {
        return '営業時間不明';
    }
    
    // 24時間営業チェック
    if (rawHours.includes('24 時間営業') || rawHours.includes('24時間')) {
        return '24時間営業';
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
    
    // 分割営業時間を処理
    const processedSchedule = {};
    Object.entries(schedule).forEach(([day, time]) => {
        if (time.includes('定休日') || time.includes('休み')) {
            processedSchedule[day] = '定休日';
        } else if (time.includes(',')) {
            // 分割営業時間（例：10時00分～13時00分, 15時00分～19時00分）
            const parts = time.split(',').map(p => p.trim());
            if (parts.length === 2) {
                processedSchedule[day] = `午前 ${parts[0]}\n午後 ${parts[1]}`;
            } else {
                processedSchedule[day] = time;
            }
        } else {
            processedSchedule[day] = time;
        }
    });
    
    // 同じ営業時間をグループ化
    const timeGroups = {};
    Object.entries(processedSchedule).forEach(([day, time]) => {
        if (!timeGroups[time]) {
            timeGroups[time] = [];
        }
        timeGroups[time].push(day);
    });
    
    // 見やすい形式に変換
    const formatted = [];
    
    Object.entries(timeGroups).forEach(([time, days]) => {
        if (time === '定休日') {
            formatted.push(`🚫 定休日: ${formatDayRange(days)}`);
        } else if (time.includes('午前') && time.includes('午後')) {
            // 分割営業時間
            const lines = time.split('\n');
            formatted.push(`⏰ ${formatDayRange(days)}:`);
            formatted.push(`   ${lines[0]}`);
            formatted.push(`   ${lines[1]}`);
        } else {
            formatted.push(`⏰ ${formatDayRange(days)}: ${time}`);
        }
    });
    
    return formatted.join('\n');
}

// 短縮表示版（さらに改善）
function formatOpeningHoursShortEnhanced(rawHours) {
    if (!rawHours || rawHours.trim() === '') {
        return '営業時間不明';
    }
    
    // 24時間営業チェック
    if (rawHours.includes('24 時間営業') || rawHours.includes('24時間')) {
        return '24時間営業';
    }
    
    // 定休日チェック
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
    
    // 分割営業時間チェック
    if (rawHours.includes(',')) {
        // 分割営業時間の場合
        const match = rawHours.match(/(\d{1,2})時(\d{2})分～(\d{1,2})時(\d{2})分,\s*(\d{1,2})時(\d{2})分～(\d{1,2})時(\d{2})分/);
        if (match) {
            const [, h1, m1, h2, m2, h3, m3, h4, m4] = match;
            return `${h1}:${m1}～${h2}:${m2}・${h3}:${m3}～${h4}:${m4}`;
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

// 曜日範囲をフォーマット
function formatDayRange(days) {
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayNames = {
        'Mon': '月', 'Tue': '火', 'Wed': '水', 'Thu': '木',
        'Fri': '金', 'Sat': '土', 'Sun': '日'
    };
    
    const sortedDays = days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    
    if (sortedDays.length === 1) {
        return dayNames[sortedDays[0]];
    }
    
    if (sortedDays.length === 2) {
        return `${dayNames[sortedDays[0]]}・${dayNames[sortedDays[1]]}`;
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
            return dayNames[group[0]];
        } else if (group.length === 2) {
            return `${dayNames[group[0]]}・${dayNames[group[1]]}`;
        } else {
            return `${dayNames[group[0]]}～${dayNames[group[group.length-1]]}`;
        }
    }).join('・');
}

// CSVファイルを処理
function processCSVFileEnhanced(inputFile, outputFile) {
    console.log('📄 営業時間表示さらなる改善を開始...\n');
    
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
    
    // 既存の改善列があるかチェック
    let formattedIndex = headers.indexOf('opening_hours_formatted');
    let shortIndex = headers.indexOf('opening_hours_short');
    
    let newHeaders = [...headers];
    if (formattedIndex === -1) {
        newHeaders.splice(hoursIndex + 1, 0, 'opening_hours_enhanced', 'opening_hours_compact');
        formattedIndex = hoursIndex + 1;
        shortIndex = hoursIndex + 2;
    } else {
        // 既存の列を置き換え
        newHeaders[formattedIndex] = 'opening_hours_enhanced';
        newHeaders[shortIndex] = 'opening_hours_compact';
    }
    
    let newCsvContent = newHeaders.join(',') + '\n';
    
    // 各行を処理
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const rawHours = values[hoursIndex] || '';
        
        // さらに改善された営業時間を生成
        const enhancedHours = formatOpeningHoursEnhanced(rawHours);
        const compactHours = formatOpeningHoursShortEnhanced(rawHours);
        
        // 新しい値を設定
        let newValues = [...values];
        if (headers.indexOf('opening_hours_formatted') === -1) {
            // 新規追加
            newValues.splice(hoursIndex + 1, 0, enhancedHours, compactHours);
        } else {
            // 既存を置き換え
            newValues[formattedIndex] = enhancedHours;
            newValues[shortIndex] = compactHours;
        }
        
        // CSVエスケープして追加
        const escapedValues = newValues.map(value => escapeCSV(value));
        newCsvContent += escapedValues.join(',') + '\n';
        
        // 進捗表示（分割営業時間のあるジムのみ）
        if (rawHours.includes(',') && i <= 20) {
            console.log(`✅ ${values[1]} (${values[0]})`);
            console.log(`   元: ${rawHours.substring(0, 80)}...`);
            console.log(`   改善: ${enhancedHours.replace(/\n/g, ' | ')}`);
            console.log(`   短縮: ${compactHours}\n`);
        }
    }
    
    // 新しいCSVファイルを保存
    fs.writeFileSync(outputFile, newCsvContent, 'utf8');
    
    console.log(`✅ 営業時間表示さらなる改善完了: ${outputFile}`);
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
    const outputFile = 'gyms_comprehensive_enhanced_hours.csv';
    
    try {
        processCSVFileEnhanced(inputFile, outputFile);
        console.log('\n🎉 営業時間表示さらなる改善完了！');
        console.log('\n📋 改善例:');
        console.log('改善前: 10時00分～13時00分, 15時00分～19時00分: Mon～Fri');
        console.log('改善後: ⏰ 月～金:');
        console.log('        午前 10時00分～13時00分');
        console.log('        午後 15時00分～19時00分');
    } catch (error) {
        console.error('❌ エラー:', error);
    }
}

module.exports = { formatOpeningHoursEnhanced, formatOpeningHoursShortEnhanced };
