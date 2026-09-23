export function summarizeFinanceCharts(
    expenses: Array<{ category?: string; amount: number }>,
    cashFlow: Array<{ date: string; direction: 'IN' | 'OUT'; amount: number }>,
) {
    const categories = new Map<string, number>();
    for (const expense of expenses) {
        const category = expense.category?.trim() || 'Chưa phân loại';
        categories.set(category, (categories.get(category) || 0) + expense.amount);
    }
    const months = new Map<string, { month: string; inflow: number; outflow: number }>();
    let totalIn = 0, totalOut = 0;
    for (const entry of cashFlow) {
        const month = /^\d{4}-\d{2}/.test(entry.date) ? entry.date.slice(0, 7) : 'Chưa có ngày';
        const row = months.get(month) || { month, inflow: 0, outflow: 0 };
        if (entry.direction === 'IN') { row.inflow += entry.amount; totalIn += entry.amount; }
        else { row.outflow += entry.amount; totalOut += entry.amount; }
        months.set(month, row);
    }
    return {
        expenses: [...categories].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        expenseTotal: expenses.reduce((sum, entry) => sum + entry.amount, 0),
        cashFlow: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
        totalIn, totalOut,
    };
}
