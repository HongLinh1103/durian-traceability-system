import { GMP_GRADES } from '@/lib/processing-gmp';

// Shared by all grade columns, including finished-goods warehouse entries.
export const GMP_GRADE_COLUMN_WIDTH = 75;
const grades = () => GMP_GRADES.map(() => GMP_GRADE_COLUMN_WIDTH);

export const GMP_REGISTER_COLUMN_WIDTHS: Partial<Record<string, number[]>> = {
    preprocessing: [110, 130, ...grades(), 80, 80, 125, 95, 95, 180, 180, 95, 80, ...grades(), 130, 130, 110],
    packaging: [110, 150, ...grades(), 90, 120, 75, 75, 75, 120, ...grades(), ...grades(), 130, 130, 110],
    inspection: [120, 200, ...grades(), ...grades(), ...grades(), 90, 140, 75, 85, 110, 85, ...grades(), ...grades(), 180, 170, 130],
    sales: [120, 150, 130, 150, 110, 130, 180, ...grades(), ...grades(), 180, 220, 160, 190, 180, 140],
    aftersales: [110, 130, 120, 95, 95, 110, 120, 125, 75, 75, 75, 90, 140, 120, 110],
};
