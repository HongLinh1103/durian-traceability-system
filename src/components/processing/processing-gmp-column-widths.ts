import { GMP_GRADES } from '@/lib/processing-gmp';

// Shared by all grade columns, including finished-goods warehouse entries.
export const GMP_GRADE_COLUMN_WIDTH = 75;
const grades = () => GMP_GRADES.map(() => GMP_GRADE_COLUMN_WIDTH);

export const GMP_REGISTER_COLUMN_WIDTHS: Partial<Record<string, number[]>> = {
    preprocessing: [110, 130, ...grades(), 80, 80, 125, 95, 95, 85, 85, 95, 80, ...grades(), 130, 130, 110],
    packaging: [110, 150, ...grades(), 90, 120, 75, 75, 75, 120, ...grades(), ...grades(), 130, 130, 110],
    inspection: [110, 150, 75, 75, 65, 65, 65, 65, 85, 60, 60, 85, 60, 75, 75, 140, 130, 110],
    sales: [110, 150, 170, 130, 105, 95, 105, 115, 105, ...grades(), ...grades(), 110, 130, 110, 110, 115, 120, 110],
    aftersales: [110, 130, 120, 95, 95, 110, 120, 125, 75, 75, 75, 90, 140, 120, 110],
};
