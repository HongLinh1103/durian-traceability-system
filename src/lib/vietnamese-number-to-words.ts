const UNITS = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];
const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function readThreeDigits(threeDigits: number, isLastGroup: boolean): string {
    const hundred = Math.floor(threeDigits / 100);
    const ten = Math.floor((threeDigits % 100) / 10);
    const unit = threeDigits % 10;
    let result = "";

    if (hundred > 0 || !isLastGroup) {
        result += DIGITS[hundred] + " trăm ";
        if (ten === 0 && unit > 0) {
            result += "linh ";
        }
    }

    if (ten > 1) {
        result += DIGITS[ten] + " mươi ";
        if (unit === 1) {
            result += "mốt ";
        } else if (unit === 5) {
            result += "lăm ";
        } else if (unit > 0) {
            result += DIGITS[unit] + " ";
        }
    } else if (ten === 1) {
        result += "mười ";
        if (unit === 1) {
            result += "một ";
        } else if (unit === 5) {
            result += "lăm ";
        } else if (unit > 0) {
            result += DIGITS[unit] + " ";
        }
    } else if (unit > 0) {
        result += DIGITS[unit] + " ";
    }

    return result.trim();
}

/**
 * Converts a numeric amount in VND to Vietnamese words.
 * Example: 18000000 -> "Mười tám triệu đồng chẵn."
 */
export function numberToVietnameseWords(amount: number): string {
    if (!amount || isNaN(amount) || amount === 0) {
        return "Không đồng chẵn.";
    }

    const absAmount = Math.floor(Math.abs(amount));
    let numStr = absAmount.toString();
    const groups: number[] = [];

    while (numStr.length > 0) {
        groups.push(parseInt(numStr.slice(-3), 10));
        numStr = numStr.slice(0, -3);
    }

    let words = "";
    for (let i = groups.length - 1; i >= 0; i--) {
        const group = groups[i];
        if (group > 0) {
            const isLastGroup = i === groups.length - 1;
            const groupText = readThreeDigits(group, isLastGroup);
            words += groupText + UNITS[i] + " ";
        }
    }

    words = words.trim();
    if (!words) {
        return "Không đồng chẵn.";
    }

    const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
    return `${capitalized} đồng chẵn.`;
}
