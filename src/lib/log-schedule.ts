const MILLISECONDS_PER_DAY = 86_400_000;
const VIETNAM_UTC_OFFSET = 7 * 60 * 60 * 1000;

function vietnamCalendarDay(value: Date) {
    return Math.floor((value.getTime() + VIETNAM_UTC_OFFSET) / MILLISECONDS_PER_DAY);
}

export function startOfVietnamDay(value = new Date()) {
    return new Date(vietnamCalendarDay(value) * MILLISECONDS_PER_DAY - VIETNAM_UTC_OFFSET);
}

export function calendarDayDifference(later: Date, earlier: Date) {
    return Math.max(0, vietnamCalendarDay(later) - vietnamCalendarDay(earlier));
}

// Người dùng có trọn ngày hiện tại để ghi nhật ký. Vì vậy chỉ những ngày đã
// kết thúc hoàn toàn giữa lần ghi gần nhất và hôm nay mới được tính là ngày trễ.
export function completedMissingLogDays(referenceDate: Date, today = new Date()) {
    return Math.max(0, calendarDayDifference(today, referenceDate) - 1);
}

export function missingDaysBetweenLogs(earlierLogDate: Date, laterLogDate: Date) {
    return Math.max(0, calendarDayDifference(laterLogDate, earlierLogDate) - 1);
}
