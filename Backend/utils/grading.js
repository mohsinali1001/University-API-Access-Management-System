// Marks are out of 100 per subject (assignment 20 + midterm 30 + final 50)
export function gradeFor(percentage) {
    if (percentage >= 85) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
}

export const round2 = (n) => Math.round(n * 100) / 100;
