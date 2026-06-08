const Charts = {
  categoryChart: null,
  trendChart: null,
  yearTrendChart: null,

  destroy() {
    if (this.categoryChart) { this.categoryChart.destroy(); this.categoryChart = null; }
    if (this.trendChart) { this.trendChart.destroy(); this.trendChart = null; }
    if (this.yearTrendChart) { this.yearTrendChart.destroy(); this.yearTrendChart = null; }
  },

  renderCategory(transactions) {
    const canvas = document.getElementById('chart-category');
    const empty = document.getElementById('chart-category-empty');
    const expenseItems = transactions.filter(t => t.type === 'expense');

    if (expenseItems.length === 0) {
      canvas.style.display = 'none';
      empty.classList.remove('hidden');
      return;
    }

    canvas.style.display = 'block';
    empty.classList.add('hidden');

    const grouped = {};
    expenseItems.forEach(t => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount;
    });

    const sorted = Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const labels = sorted.map(([name]) => name);
    const data = sorted.map(([, amount]) => amount);
    const colors = sorted.map(([name]) => Storage.getCategoryMeta(name).color);

    if (this.categoryChart) this.categoryChart.destroy();

    this.categoryChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 8,
              font: { size: 11 },
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = data.reduce((a, b) => a + b, 0);
                const pct = ((ctx.raw / total) * 100).toFixed(1);
                return `${ctx.label}: ${formatCurrency(ctx.raw)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  },

  renderTrend(transactions, monthStr) {
    const canvas = document.getElementById('chart-trend');
    const empty = document.getElementById('chart-trend-empty');

    if (transactions.length === 0) {
      canvas.style.display = 'none';
      empty.classList.remove('hidden');
      return;
    }

    canvas.style.display = 'block';
    empty.classList.add('hidden');

    const days = getDaysInMonth(monthStr);
    const labels = Array.from({ length: days }, (_, i) => String(i + 1));

    const expenseData = labels.map(day => {
      const dayNum = parseInt(day);
      return transactions
        .filter(t => t.type === 'expense' && new Date(t.date).getDate() === dayNum)
        .reduce((sum, t) => sum + t.amount, 0);
    });

    const incomeData = labels.map(day => {
      const dayNum = parseInt(day);
      return transactions
        .filter(t => t.type === 'income' && new Date(t.date).getDate() === dayNum)
        .reduce((sum, t) => sum + t.amount, 0);
    });

    if (this.trendChart) this.trendChart.destroy();

    this.trendChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '支出',
            data: expenseData,
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
            borderRadius: 2,
            barPercentage: 0.7,
          },
          {
            label: '收入',
            data: incomeData,
            backgroundColor: 'rgba(34, 197, 94, 0.6)',
            borderRadius: 2,
            barPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, maxTicksLimit: 10 },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { size: 10 } },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, padding: 8, font: { size: 11 } },
          },
        },
      },
    });
  },

  renderYearTrend(monthlyData) {
    const canvas = document.getElementById('chart-year-trend');
    const empty = document.getElementById('chart-year-trend-empty');

    const hasData = monthlyData.some(d => d.income > 0 || d.expense > 0);
    if (!hasData) {
      canvas.style.display = 'none';
      empty.classList.remove('hidden');
      return;
    }

    canvas.style.display = 'block';
    empty.classList.add('hidden');

    const labels = monthlyData.map(d => d.month);
    const expenseData = monthlyData.map(d => d.expense);
    const incomeData = monthlyData.map(d => d.income);

    if (this.yearTrendChart) this.yearTrendChart.destroy();

    this.yearTrendChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '支出',
            data: expenseData,
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
            borderRadius: 3,
            barPercentage: 0.6,
          },
          {
            label: '收入',
            data: incomeData,
            backgroundColor: 'rgba(34, 197, 94, 0.6)',
            borderRadius: 3,
            barPercentage: 0.6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { size: 10 } },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, padding: 8, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
            },
          },
        },
      },
    });
  },
};
