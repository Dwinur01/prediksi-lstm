export const getDummyTickets = () => {
  const dummy = [];
  const startYear = 2022;
  const totalWeeks = 200;
  
  // Base date for sale_date (approx 4 years ago)
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - (totalWeeks * 7));

  for (let i = 0; i < totalWeeks; i++) {
    const currentWeekDate = new Date(baseDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
    const week = Math.floor(i % 52) + 1;
    const year = startYear + Math.floor(i / 52);
    
    // Stable but realistic pattern: Growth + Seasonality
    // Use i as seed to make it stable
    const growth = i * 0.5; // Upward trend
    const seasonality = Math.sin(i / 4) * 50; // Periodic peaks
    const noise = (Math.sin(i * 1.5) * 10); // Stable "randomness"
    
    const sold = Math.floor(200 + growth + seasonality + noise);

    dummy.push({
      id: `TRX-${1000 + i}`,
      week: week.toString(),
      year: year.toString(),
      sale_date: currentWeekDate.toISOString().split('T')[0],
      tickets_sold: Math.max(50, sold),
      created_at: new Date().toISOString()
    });
  }
  return dummy; // Already in chronological order
};

export const getDummyHistory = () => {
  return [
    {
      id: 1,
      run_date: new Date().toISOString(),
      epochs: 50,
      learning_rate: 0.01,
      window_size: 4,
      mape: 5.24,
      rmse: 12.45,
      results_json: JSON.stringify({
        dates: ["W1 2024", "W2 2024", "W3 2024", "W4 2024"],
        actuals: [250, 310, 280, 350],
        predictions: [245, 305, 288, 342]
      })
    }
  ];
};
