export const getDummyTickets = () => {
  const dummy = [];
  const startYear = 2023;
  let week = 1;
  let year = startYear;

  for (let i = 0; i < 10; i++) {
    dummy.push({
      id: `W${week}Y${year}`,
      week: week.toString(),
      year: year.toString(),
      tickets_sold: Math.floor(Math.random() * (500 - 200 + 1)) + 200,
      created_at: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)).toISOString()
    });
    
    week++;
    if (week > 52) {
      week = 1;
      year++;
    }
  }
  return dummy.reverse();
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
