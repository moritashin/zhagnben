let currentType = 'expense';
let currentPage = 'add';

const Pages = {
  init() {
    this._initNavigation();
    this._initAddPage();
    this._initListPage();
    this._initStatsPage();
    this._initCatModal();
    this._renderCategories();
    this._setDefaultDate();
  },

  // ===== 导航 =====
  _initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        this.switchTo(page);
      });
    });
  },

  switchTo(page) {
    currentPage = page;

    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const target = document.getElementById(`page-${page}`);
    target.classList.remove('hidden');
    target.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => {
      const isActive = btn.dataset.page === page;
      btn.classList.toggle('text-red-500', isActive);
      btn.classList.toggle('text-gray-400', !isActive);
    });

    if (page === 'list') this._refreshList();
    if (page === 'stats') this._refreshStats();

    // 浮动保存按钮只在记账页面显示
    const floatSave = document.getElementById('float-save');
    if (floatSave) floatSave.classList.toggle('hidden', page !== 'add');
  },

  // ===== 记账页面 =====
  _initAddPage() {
    document.getElementById('btn-expense').addEventListener('click', () => this._setType('expense'));
    document.getElementById('btn-income').addEventListener('click', () => this._setType('income'));
    document.getElementById('btn-save').addEventListener('click', () => this._saveTransaction());
    document.getElementById('btn-manage-cats').addEventListener('click', () => this._openCatModal());

    // 金额输入只允许数字和小数点
    const amountInput = document.getElementById('input-amount');
    amountInput.addEventListener('input', () => {
      amountInput.value = amountInput.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    });
  },

  // ===== 分类管理弹窗 =====
  _initCatModal() {
    document.getElementById('cat-modal-overlay').addEventListener('click', () => this._closeCatModal());
    document.getElementById('cat-modal-close').addEventListener('click', () => this._closeCatModal());
    document.getElementById('btn-add-cat').addEventListener('click', () => this._addCategory());
  },

  _openCatModal() {
    document.getElementById('cat-modal').classList.remove('hidden');
    this._renderCatList();
    document.body.style.overflow = 'hidden';
  },

  _closeCatModal() {
    document.getElementById('cat-modal').classList.add('hidden');
    document.body.style.overflow = '';
  },

  _renderCatList() {
    const container = document.getElementById('cat-list');
    const cats = Storage.getCategories();
    if (cats.length === 0) {
      container.innerHTML = '<div class="text-center text-gray-400 text-sm py-8">暂无分类</div>';
      return;
    }
    container.innerHTML = cats.map(cat => `
      <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl" data-cat="${cat.name}">
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" style="background:${cat.color}18">${cat.icon}</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium">${cat.name}</div>
          <div class="text-xs text-gray-400">${cat.type === 'income' ? '收入' : '支出'}</div>
        </div>
        <div class="flex items-center gap-1">
          <button class="cat-edit-btn p-2 text-gray-400 hover:text-blue-500" title="编辑">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="cat-delete-btn p-2 text-gray-400 hover:text-red-500" title="删除">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.cat-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('[data-cat]');
        const oldName = row.dataset.cat;
        const cat = Storage.getCategoryMeta(oldName);
        const newName = prompt('修改分类名称:', oldName);
        if (newName === null) return;
        if (!newName.trim()) { alert('名称不能为空'); return; }
        const newIcon = prompt('修改图标:', cat.icon);
        if (newIcon === null) return;
        const newColor = prompt('修改颜色 (hex):', cat.color);
        if (newColor === null) return;
        if (Storage.updateCategory(oldName, newName.trim(), newIcon.trim(), newColor.trim())) {
          this._renderCatList();
          this._renderCategories();
        } else {
          alert('名称已存在');
        }
      });
    });

    container.querySelectorAll('.cat-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('[data-cat]');
        const name = row.dataset.cat;
        if (!confirm(`确定删除分类 "${name}"？\n注意：该分类下的记录不会被删除，但会显示为未知分类。`)) return;
        Storage.deleteCategory(name);
        this._renderCatList();
        this._renderCategories();
      });
    });
  },

  _addCategory() {
    const icon = document.getElementById('new-cat-icon').value.trim();
    const name = document.getElementById('new-cat-name').value.trim();
    const color = document.getElementById('new-cat-color').value;
    const type = document.getElementById('new-cat-type').value;

    if (!name) { alert('请输入分类名称'); return; }

    if (Storage.addCategory(name, icon || '📝', color, type)) {
      document.getElementById('new-cat-name').value = '';
      document.getElementById('new-cat-icon').value = '';
      this._renderCatList();
      this._renderCategories();
    } else {
      alert('分类名称已存在');
    }
  },

  _setType(type) {
    currentType = type;
    const isExpense = type === 'expense';
    const color = isExpense ? 'red' : 'green';

    document.getElementById('btn-expense').className =
      `type-btn flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${isExpense ? 'bg-white dark:bg-gray-600 text-red-500 shadow-sm' : 'text-gray-500 dark:text-gray-300'}`;
    document.getElementById('btn-income').className =
      `type-btn flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${!isExpense ? 'bg-white dark:bg-gray-600 text-green-500 shadow-sm' : 'text-gray-500 dark:text-gray-300'}`;

    document.getElementById('amount-symbol').className = `text-2xl font-bold text-${color}-500 shrink-0`;
    document.getElementById('amount-symbol').textContent = isExpense ? '-' : '+';
    document.getElementById('btn-save').className =
      `w-full py-4 rounded-xl text-white font-bold text-lg transition-all bg-${color}-500 hover:bg-${color}-600 active:scale-[0.98] shadow-lg shadow-${color}-500/25`;

    this._renderCategories();
  },

  _renderCategories() {
    const grid = document.getElementById('category-grid');
    const categories = Storage.getCategories(currentType);
    const selected = grid.dataset.selected || '';

    grid.innerHTML = categories.map(cat => `
      <button class="cat-btn flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${selected === cat.name ? 'ring-2' : ''}"
        style="${selected === cat.name ? `background:${cat.color}15;--tw-ring-color:${cat.color}` : 'background:#f3f4f6'}"
        data-name="${cat.name}">
        <span class="text-2xl">${cat.icon}</span>
        <span class="text-xs ${selected === cat.name ? 'font-medium' : 'text-gray-500'}">${cat.name}</span>
      </button>
    `).join('');

    grid.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.cat-btn').forEach(b => {
          b.style.background = '#f3f4f6';
          b.classList.remove('ring-2');
          b.querySelector('span:last-child').classList.add('text-gray-500');
          b.querySelector('span:last-child').classList.remove('font-medium');
        });
        btn.style.background = Storage.getCategoryMeta(btn.dataset.name).color + '15';
        btn.style.setProperty('--tw-ring-color', Storage.getCategoryMeta(btn.dataset.name).color);
        btn.classList.add('ring-2');
        btn.querySelector('span:last-child').classList.remove('text-gray-500');
        btn.querySelector('span:last-child').classList.add('font-medium');
        grid.dataset.selected = btn.dataset.name;
      });
    });
  },

  _setDefaultDate() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('input-date').value = now.toISOString().slice(0, 16);
  },

  _saveTransaction() {
    const amount = parseFloat(document.getElementById('input-amount').value);
    const category = document.getElementById('category-grid').dataset.selected;
    const date = document.getElementById('input-date').value;
    const note = document.getElementById('input-note').value.trim();

    if (!amount || amount <= 0) {
      alert('请输入金额');
      return;
    }
    if (!category) {
      alert('请选择分类');
      return;
    }
    if (!date) {
      alert('请选择日期');
      return;
    }

    Storage.add({ amount, type: currentType, category, note, date });

    // 重置表单
    document.getElementById('input-amount').value = '';
    document.getElementById('input-note').value = '';
    document.getElementById('category-grid').dataset.selected = '';
    this._renderCategories();
    this._setDefaultDate();

    // 成功反馈：震动 + 居中弹窗
    if (navigator.vibrate) navigator.vibrate(50);
    const toast = document.getElementById('save-toast');
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 1200);
  },

  // ===== 明细页面 =====
  _initListPage() {
    const monthSelect = document.getElementById('filter-month');
    const typeSelect = document.getElementById('filter-type');

    monthSelect.addEventListener('change', () => this._refreshList());
    typeSelect.addEventListener('change', () => this._refreshList());
  },

  _refreshList() {
    const months = Storage.getMonths();
    const monthSelect = document.getElementById('filter-month');

    // 更新月份选项
    const currentVal = monthSelect.value || months[0];
    monthSelect.innerHTML = months.map(m =>
      `<option value="${m}" ${m === currentVal ? 'selected' : ''}>${m}</option>`
    ).join('');

    const month = monthSelect.value || months[0];
    const type = document.getElementById('filter-type').value;
    const items = Storage.filterByMonth(month, type);

    // 汇总
    const income = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    document.getElementById('summary-income').textContent = formatCurrency(income);
    document.getElementById('summary-expense').textContent = formatCurrency(expense);

    // 列表
    const container = document.getElementById('list-container');
    const empty = document.getElementById('list-empty');

    if (items.length === 0) {
      empty.style.display = 'block';
      container.querySelectorAll('.tx-row').forEach(el => el.remove());
      return;
    }

    empty.style.display = 'none';
    container.querySelectorAll('.tx-row').forEach(el => el.remove());

    items.forEach(t => {
      const meta = Storage.getCategoryMeta(t.category);
      const isExpense = t.type === 'expense';
      const row = document.createElement('div');
      row.className = 'tx-row flex items-center gap-3 py-3 border-b border-gray-50';
      row.innerHTML = `
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" style="background:${meta.color}18">
          ${meta.icon}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <span class="font-medium text-sm">${t.category}</span>
            <span class="font-bold text-sm ${isExpense ? 'text-red-500' : 'text-green-500'}">
              ${isExpense ? '-' : '+'}${formatCurrency(t.amount)}
            </span>
          </div>
          <div class="flex items-center justify-between mt-0.5">
            ${t.note ? `<span class="text-xs text-gray-400 truncate max-w-[140px]">${t.note}</span>` : '<span></span>'}
            <span class="text-xs text-gray-400">${formatDateTime(t.date)}</span>
          </div>
        </div>
        <button class="delete-btn p-2 text-gray-300 hover:text-red-400 transition-colors" data-id="${t.id}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      `;
      container.appendChild(row);

      row.querySelector('.delete-btn').addEventListener('click', () => {
        if (confirm('确定删除这条记录？')) {
          Storage.delete(t.id);
          this._refreshList();
        }
      });
    });
  },

  // ===== 统计页面 =====
  _initStatsPage() {
    document.getElementById('stats-month').addEventListener('change', () => this._refreshStats());
    document.getElementById('stats-year').addEventListener('change', () => this._refreshYearStats());

    document.getElementById('btn-export').addEventListener('click', () => {
      Storage.exportData();
    });

    document.getElementById('btn-import').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          Storage.importData(event.target.result);
          alert('导入成功');
          this._refreshList();
          this._refreshStats();
        } catch (err) {
          alert('导入失败：' + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // 预算设置折叠
    const budgetToggle = document.getElementById('btn-budget-toggle');
    const budgetSettings = document.getElementById('budget-settings');
    const budgetArrow = document.getElementById('budget-arrow');
    budgetToggle.addEventListener('click', () => {
      const isHidden = budgetSettings.classList.contains('hidden');
      budgetSettings.classList.toggle('hidden');
      budgetArrow.style.transform = isHidden ? 'rotate(180deg)' : '';
      if (isHidden) this._renderBudgetInputs();
    });

    document.getElementById('btn-save-monthly').addEventListener('click', () => {
      const val = parseFloat(document.getElementById('input-monthly-budget').value) || 0;
      Storage.setMonthlyBudget(val);
      alert('月预算已保存');
      this._refreshStats();
    });
  },

  _renderBudgetInputs() {
    const budgets = Storage.getBudgets();
    document.getElementById('input-monthly-budget').value = budgets.monthly || '';

    const container = document.getElementById('budget-category-inputs');
    const categories = Storage.getCategories('expense');
    container.innerHTML = categories.map(cat => {
      const val = budgets.categories[cat.name] || '';
      return `
        <div class="flex items-center gap-2">
          <span class="text-sm w-16">${cat.icon} ${cat.name}</span>
          <input type="number" data-cat="${cat.name}" value="${val}" placeholder="0"
            class="cat-budget-input flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm outline-none">
        </div>
      `;
    }).join('');

    container.querySelectorAll('.cat-budget-input').forEach(input => {
      input.addEventListener('change', () => {
        const cat = input.dataset.cat;
        const val = parseFloat(input.value) || 0;
        Storage.setCategoryBudget(cat, val);
      });
    });
  },

  _refreshStats() {
    const months = Storage.getMonths();
    const monthSelect = document.getElementById('stats-month');

    const currentVal = monthSelect.value || months[0];
    monthSelect.innerHTML = months.map(m =>
      `<option value="${m}" ${m === currentVal ? 'selected' : ''}>${m}</option>`
    ).join('');

    const month = monthSelect.value || months[0];
    const items = Storage.filterByMonth(month, 'all');

    const income = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    document.getElementById('stats-income').textContent = formatCurrency(income);
    document.getElementById('stats-expense').textContent = formatCurrency(expense);
    document.getElementById('stats-balance').textContent = formatCurrency(income - expense);

    // 月预算
    const monthlyUsage = Storage.getMonthlyBudgetUsage(month);
    const monthlyEl = document.getElementById('budget-monthly');
    if (monthlyUsage.budget > 0) {
      monthlyEl.classList.remove('hidden');
      const bar = document.getElementById('budget-monthly-bar');
      const color = monthlyUsage.overBudget ? 'bg-red-500' : (monthlyUsage.percent > 80 ? 'bg-yellow-500' : 'bg-blue-500');
      bar.className = `h-2.5 rounded-full transition-all duration-500 ${color}`;
      bar.style.width = `${monthlyUsage.percent}%`;
      document.getElementById('budget-monthly-text').textContent = `${monthlyUsage.percent.toFixed(0)}%`;
      document.getElementById('budget-monthly-text').className = `text-xs ${monthlyUsage.overBudget ? 'text-red-500 font-bold' : 'text-gray-500'}`;
      document.getElementById('budget-monthly-spent').textContent = `已用 ${formatCurrency(monthlyUsage.spent)}`;
      document.getElementById('budget-monthly-remain').textContent = monthlyUsage.overBudget
        ? `超支 ${formatCurrency(-monthlyUsage.remaining)}`
        : `剩余 ${formatCurrency(monthlyUsage.remaining)}`;
      document.getElementById('budget-monthly-remain').className = `text-xs ${monthlyUsage.overBudget ? 'text-red-500 font-bold' : 'text-gray-500'}`;
    } else {
      monthlyEl.classList.add('hidden');
    }

    // 分类预算
    const year = parseInt(month.match(/(\d{4})年/)[1]);
    const catBudgetEl = document.getElementById('budget-categories');
    const catBudgetList = document.getElementById('budget-category-list');
    const expenseCats = Storage.getCategories('expense');
    const catBudgets = expenseCats.map(cat => {
      const usage = Storage.getCategoryYearUsage(cat.name, year);
      return { ...cat, ...usage };
    }).filter(c => c.budget > 0);

    if (catBudgets.length > 0) {
      catBudgetEl.classList.remove('hidden');
      catBudgetList.innerHTML = catBudgets.map(cat => {
        const color = cat.overBudget ? 'bg-red-500' : (cat.percent > 80 ? 'bg-yellow-500' : 'bg-blue-500');
        return `
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm">${cat.icon} ${cat.name}</span>
              <span class="text-xs ${cat.overBudget ? 'text-red-500 font-bold' : 'text-gray-500'}">
                ${formatCurrency(cat.spent)} / ${formatCurrency(cat.budget)}
              </span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div class="h-2 rounded-full ${color} transition-all duration-500" style="width: ${cat.percent}%"></div>
            </div>
            <div class="text-right text-[10px] text-gray-400 mt-0.5">
              ${cat.overBudget ? `超支 ${formatCurrency(-cat.remaining)}` : `剩余 ${formatCurrency(cat.remaining)}`}
            </div>
          </div>
        `;
      }).join('');
    } else {
      catBudgetEl.classList.add('hidden');
    }

    Charts.destroy();
    Charts.renderCategory(items);
    Charts.renderTrend(items, month);

    // 同时刷新全年统计
    this._refreshYearStats();
  },

  _refreshYearStats() {
    const years = Storage.getYears();
    const yearSelect = document.getElementById('stats-year');

    const currentVal = yearSelect.value || years[0];
    yearSelect.innerHTML = years.map(y =>
      `<option value="${y}" ${y === currentVal ? 'selected' : ''}>${y}年</option>`
    ).join('');

    const year = yearSelect.value || years[0];
    const items = Storage.filterByYear(year, 'all');

    const income = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    document.getElementById('year-income').textContent = formatCurrency(income);
    document.getElementById('year-expense').textContent = formatCurrency(expense);
    document.getElementById('year-balance').textContent = formatCurrency(income - expense);

    // 年度分类汇总
    const catList = document.getElementById('year-category-list');
    const expenseItems = items.filter(t => t.type === 'expense');

    if (expenseItems.length === 0) {
      catList.innerHTML = '<div class="text-center text-gray-400 text-sm py-4">暂无数据</div>';
    } else {
      const grouped = {};
      expenseItems.forEach(t => {
        grouped[t.category] = (grouped[t.category] || 0) + t.amount;
      });
      const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
      const total = expenseItems.reduce((s, t) => s + t.amount, 0);

      catList.innerHTML = sorted.map(([name, amount]) => {
        const meta = Storage.getCategoryMeta(name);
        const pct = ((amount / total) * 100).toFixed(1);
        return `
          <div class="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0" style="background:${meta.color}18">${meta.icon}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-sm">${name}</span>
                <span class="text-sm font-bold">${formatCurrency(amount)}</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                <div class="h-1.5 rounded-full" style="width:${pct}%;background:${meta.color}"></div>
              </div>
            </div>
            <span class="text-xs text-gray-400 w-10 text-right">${pct}%</span>
          </div>
        `;
      }).join('');
    }

    // 月度趋势图
    const monthlyData = Storage.getYearMonthlyData(year);
    Charts.renderYearTrend(monthlyData);
  },
};
