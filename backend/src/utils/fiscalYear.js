export function getFiscalYearAndPeriod(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const fiscalYear = month >= 10 ? year + 1 : year;
  const period =
    month >= 10 ? 'Q1' :
    month <= 3  ? 'Q2' :
    month <= 6  ? 'Q3' : 'Q4';
  return { fiscalYear, period };
}
