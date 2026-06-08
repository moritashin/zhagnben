const STORAGE_KEY = 'zhangben_transactions';
const CATEGORIES_KEY = 'zhangben_categories';
const BUDGET_KEY = 'zhangben_budgets';

// 默认分类（支出）
const DEFAULT_CATEGORIES = [
  { name: '餐饮', icon: '🍜', color: '#FF6B6B', type: 'expense' },
  { name: '咖啡', icon: '☕', color: '#8B4513', type: 'expense' },
  { name: '奶茶', icon: '🧋', color: '#DDA0DD', type: 'expense' },
  { name: '饮料', icon: '🥤', color: '#45B7D1', type: 'expense' },
  { name: '零食', icon: '🍿', color: '#F39C12', type: 'expense' },
  { name: '月卡', icon: '🎫', color: '#9B59B6', type: 'expense' },
  { name: '年卡', icon: '🎟️', color: '#8E44AD', type: 'expense' },
  { name: '年费', icon: '💳', color: '#6C5CE7', type: 'expense' },
  { name: '游戏', icon: '🎮', color: '#74B9FF', type: 'expense' },
  { name: '氪金', icon: '💎', color: '#00CEC9', type: 'expense' },
  { name: '电影', icon: '🎬', color: '#E17055', type: 'expense' },
  { name: '游玩', icon: '🎡', color: '#FD79A8', type: 'expense' },
  { name: '数码', icon: '📱', color: '#0984E3', type: 'expense' },
  { name: '日用品', icon: '🧴', color: '#00B894', type: 'expense' },
  { name: '护肤品', icon: '💄', color: '#E84393', type: 'expense' },
  { name: '卫生用品', icon: '🧻', color: '#A29BFE', type: 'expense' },
  { name: '衣服', icon: '👕', color: '#FDCB6E', type: 'expense' },
  { name: '衣物', icon: '👔', color: '#FDCB6E', type: 'expense' },
  { name: '周边', icon: '🧸', color: '#FF7675', type: 'expense' },
  { name: '购物', icon: '🛒', color: '#D63031', type: 'expense' },
  { name: '茶具', icon: '🫖', color: '#55A3FF', type: 'expense' },
  { name: '茶叶', icon: '🍵', color: '#00B894', type: 'expense' },
  { name: '保健品', icon: '💊', color: '#E74C3C', type: 'expense' },
  { name: '理发', icon: '✂️', color: '#F39C12', type: 'expense' },
  { name: '话费', icon: '📞', color: '#E67E22', type: 'expense' },
  { name: '分期', icon: '💰', color: '#D35400', type: 'expense' },
  { name: '驾照', icon: '📋', color: '#1ABC9C', type: 'expense' },
  { name: '出行', icon: '🚕', color: '#16A085', type: 'expense' },
  { name: '书', icon: '📚', color: '#9B59B6', type: 'expense' },
  { name: 'AI', icon: '🤖', color: '#34495E', type: 'expense' },
  { name: '梯子', icon: '🔗', color: '#7F8C8D', type: 'expense' },
  { name: '工具', icon: '🔧', color: '#95A5A6', type: 'expense' },
  { name: '工资', icon: '💰', color: '#27AE60', type: 'income' },
  { name: '奖金', icon: '🎁', color: '#F39C12', type: 'income' },
  { name: '投资', icon: '📈', color: '#8E44AD', type: 'income' },
  { name: '兼职', icon: '💼', color: '#2980B9', type: 'income' },
  { name: '其他-收入', icon: '📝', color: '#7F8C8D', type: 'income' },
  { name: '其他-支出', icon: '📝', color: '#B0C4DE', type: 'expense' },
];

const Storage = {
  // ===== 交易记录 =====
  getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return data.map(t => ({
        id: t.id || crypto.randomUUID(),
        amount: Number(t.amount) || 0,
        type: t.type || 'expense',
        category: t.category || '其他-支出',
        note: t.note || '',
        date: t.date || new Date().toISOString(),
        createdAt: t.createdAt || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  },

  save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },

  add(transaction) {
    const items = this.getAll();
    const newItem = {
      id: crypto.randomUUID(),
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      note: transaction.note || '',
      date: transaction.date,
      createdAt: new Date().toISOString(),
    };
    this.save([newItem, ...items]);
    return newItem;
  },

  delete(id) {
    const items = this.getAll().filter(t => t.id !== id);
    this.save(items);
  },

  // ===== 分类管理 =====
  getCategories() {
    try {
      const raw = localStorage.getItem(CATEGORIES_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallthrough
    }
    // 首次使用，保存默认分类
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return [...DEFAULT_CATEGORIES];
  },

  saveCategories(categories) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  },

  getCategoriesByType(type) {
    return this.getCategories().filter(c => c.type === type);
  },

  getCategoryMeta(name) {
    const cats = this.getCategories();
    const found = cats.find(c => c.name === name);
    if (found) return found;
    // 尝试从默认分类找（兼容旧数据）
    const def = DEFAULT_CATEGORIES.find(c => c.name === name);
    if (def) return def;
    // 未知分类
    const type = name.includes('收入') ? 'income' : 'expense';
    return { name, icon: type === 'income' ? '💰' : '📋', color: '#999999', type };
  },

  addCategory(name, icon, color, type) {
    const cats = this.getCategories();
    if (cats.some(c => c.name === name)) return false;
    cats.push({ name, icon: icon || '📝', color: color || '#999999', type });
    this.saveCategories(cats);
    return true;
  },

  updateCategory(oldName, newName, icon, color) {
    const cats = this.getCategories();
    const idx = cats.findIndex(c => c.name === oldName);
    if (idx === -1) return false;
    // 检查新名称是否冲突
    if (oldName !== newName && cats.some(c => c.name === newName)) return false;

    const oldCat = cats[idx];
    cats[idx] = { ...oldCat, name: newName, icon: icon || oldCat.icon, color: color || oldCat.color };
    this.saveCategories(cats);

    // 同步更新所有交易记录中的分类名称
    const transactions = this.getAll();
    let changed = false;
    transactions.forEach(t => {
      if (t.category === oldName) {
        t.category = newName;
        changed = true;
      }
    });
    if (changed) this.save(transactions);

    return true;
  },

  deleteCategory(name) {
    const cats = this.getCategories();
    const idx = cats.findIndex(c => c.name === name);
    if (idx === -1) return false;
    cats.splice(idx, 1);
    this.saveCategories(cats);
    return true;
  },

  // ===== 月份/年份/筛选 =====
  getMonths() {
    const items = this.getAll();
    if (items.length === 0) return [formatYearMonth(new Date())];
    const months = new Set(items.map(t => formatYearMonth(new Date(t.date))));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  },

  getYears() {
    const items = this.getAll();
    if (items.length === 0) return [String(new Date().getFullYear())];
    const years = new Set(items.map(t => String(new Date(t.date).getFullYear())));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  },

  filterByMonth(month, typeFilter = 'all') {
    const items = this.getAll();
    return items.filter(t => {
      const itemMonth = formatYearMonth(new Date(t.date));
      const monthMatch = itemMonth === month;
      const typeMatch = typeFilter === 'all' || t.type === typeFilter;
      return monthMatch && typeMatch;
    });
  },

  filterByYear(year, typeFilter = 'all') {
    const items = this.getAll();
    return items.filter(t => {
      const itemYear = String(new Date(t.date).getFullYear());
      const yearMatch = itemYear === year;
      const typeMatch = typeFilter === 'all' || t.type === typeFilter;
      return yearMatch && typeMatch;
    });
  },

  getYearMonthlyData(year) {
    const items = this.getAll().filter(t => String(new Date(t.date).getFullYear()) === year);
    const months = ['1','2','3','4','5','6','7','8','9','10','11','12'];
    return months.map(m => {
      const monthNum = m.padStart(2, '0');
      const monthItems = items.filter(t => {
        const d = new Date(t.date);
        return String(d.getMonth() + 1).padStart(2, '0') === monthNum;
      });
      const income = monthItems.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthItems.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { month: m + '月', income, expense };
    });
  },

  // ===== 预算功能 =====
  getBudgets() {
    try {
      const raw = localStorage.getItem(BUDGET_KEY);
      return raw ? JSON.parse(raw) : { monthly: 0, categories: {} };
    } catch {
      return { monthly: 0, categories: {} };
    }
  },

  saveBudgets(budgets) {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
  },

  setMonthlyBudget(amount) {
    const budgets = this.getBudgets();
    budgets.monthly = Number(amount) || 0;
    this.saveBudgets(budgets);
  },

  setCategoryBudget(category, amount) {
    const budgets = this.getBudgets();
    budgets.categories[category] = Number(amount) || 0;
    this.saveBudgets(budgets);
  },

  getMonthlyBudgetUsage(month) {
    const budgets = this.getBudgets();
    const items = this.filterByMonth(month, 'expense');
    const spent = items.reduce((s, t) => s + t.amount, 0);
    return {
      budget: budgets.monthly,
      spent,
      remaining: budgets.monthly - spent,
      percent: budgets.monthly > 0 ? Math.min((spent / budgets.monthly) * 100, 100) : 0,
      overBudget: budgets.monthly > 0 && spent > budgets.monthly,
    };
  },

  getCategoryYearUsage(category, year) {
    const budgets = this.getBudgets();
    const items = this.getAll().filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && t.category === category && d.getFullYear() === year;
    });
    const spent = items.reduce((s, t) => s + t.amount, 0);
    const budget = budgets.categories[category] || 0;
    return {
      budget,
      spent,
      remaining: budget - spent,
      percent: budget > 0 ? Math.min((spent / budget) * 100, 100) : 0,
      overBudget: budget > 0 && spent > budget,
    };
  },

  // ===== 导入导出 =====
  exportData() {
    const data = {
      transactions: this.getAll(),
      categories: this.getCategories(),
      budgets: this.getBudgets(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zhangben_backup_${formatDateShort(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importData(jsonString) {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data)) {
      this.save(data);
    } else if (data.transactions && Array.isArray(data.transactions)) {
      this.save(data.transactions);
      if (data.categories) this.saveCategories(data.categories);
      if (data.budgets) this.saveBudgets(data.budgets);
    } else {
      throw new Error('Invalid data format');
    }
  },
};

function formatCurrency(amount) {
  return '¥' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatYearMonth(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}年${m}月`;
}

function formatDateShort(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${m}-${day} ${h}:${min}`;
}

function getDaysInMonth(yearMonth) {
  const match = yearMonth.match(/(\d{4})年(\d{2})月/);
  if (!match) return 30;
  const year = parseInt(match[1]);
  const month = parseInt(match[2]);
  return new Date(year, month, 0).getDate();
}
