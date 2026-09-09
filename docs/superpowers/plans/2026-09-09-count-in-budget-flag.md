# 「是否计入预算」标志实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为记账明细增加 `countInBudget` 标志，区分日常支出与大额一次性支出，预算与统计页按新口径计算。

**Architecture:** 纯前端 localStorage PWA，无构建工具。数据层 `Storage` 全局对象负责读写与统计口径，UI 层 `Pages` 全局对象负责渲染与交互。读取侧已规范化（`getAll()` 兜底 `countInBudget !== false`），无需数据迁移。

**Tech Stack:** 原生 JS（全局对象、无模块）、Tailwind Play CDN（运行时 JIT，动态 class 可用）、Chart.js 4.4.1 UMD。

**Spec:** `docs/superpowers/specs/2026-09-09-count-in-budget-flag-design.md`

## Global Constraints

- 项目无测试框架、无 package.json：验收为浏览器手动验证，每个任务的验证步骤给出具体操作与预期结果
- 手动验证统一方式：项目根目录跑 `python3 -m http.server 8765`，浏览器**隐私窗口**打开 `http://localhost:8765`（隐私窗口 localStorage 隔离，不污染真实数据）
- `countInBudget` 语义：计入预算 = `true`。`getAll()` 已规范化为布尔，数据层外可直接当真值用
- 不可变更新：不修改 `getAll()` 返回数组中的对象，用新对象替换
- 提交信息格式：`<type>: <中文描述>`，结尾空行加 `Co-Authored-By: Claude Code <noreply@anthropic.com>`
- 收入记录恒存 `countInBudget: true`（开关对收入隐藏）

---

### Task 1: 数据层 — storage.js

**Files:**
- Modify: `js/storage.js`

**Interfaces:**
- Produces:
  - `Storage.add(transaction)` — `transaction.countInBudget` 可选，支出缺省 `true`，收入恒 `true`
  - `Storage.updateTransaction(id, patch)` — 合并 `patch` 到指定记录（不可变），返回 `boolean`；id 不存在返回 `false`
  - `Storage.getMonthlyBudgetUsage(month)` / `Storage.getCategoryYearUsage(category, year)` — 支出求和只含 `countInBudget` 的记录

- [ ] **Step 1: `add()` 保存 countInBudget**

修改 `add(transaction)`（js/storage.js:73-86），在 `newItem` 中增加字段：

```javascript
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
      // 收入不参与预算，恒为 true；支出缺省计入预算
      countInBudget: transaction.type === 'income' ? true : transaction.countInBudget !== false,
    };
    this.save([newItem, ...items]);
    return newItem;
  },
```

- [ ] **Step 2: 新增 `updateTransaction()`**

在 `delete(id)` 方法之后（js/storage.js:92 之后）插入：

```javascript
  updateTransaction(id, patch) {
    const items = this.getAll();
    const index = items.findIndex(t => t.id === id);
    if (index === -1) return false;
    // 不可变更新：用新对象替换，不修改原对象
    items[index] = { ...items[index], ...patch, id };
    this.save(items);
    return true;
  },
```

- [ ] **Step 3: 月预算过滤不计入的支出**

修改 `getMonthlyBudgetUsage(month)`（js/storage.js:244-255）为：

```javascript
  getMonthlyBudgetUsage(month) {
    const budgets = this.getBudgets();
    // 只统计计入预算的支出
    const items = this.filterByMonth(month, 'expense').filter(t => t.countInBudget);
    const spent = items.reduce((s, t) => s + t.amount, 0);
    return {
      budget: budgets.monthly,
      spent,
      remaining: budgets.monthly - spent,
      percent: budgets.monthly > 0 ? Math.min((spent / budgets.monthly) * 100, 100) : 0,
      overBudget: budgets.monthly > 0 && spent > budgets.monthly,
    };
  },
```

- [ ] **Step 4: 分类年预算过滤不计入的支出**

修改 `getCategoryYearUsage(category, year)`（js/storage.js:257-272），filter 条件加 `t.countInBudget`：

```javascript
    const items = this.getAll().filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && t.category === category && t.countInBudget && d.getFullYear() === year;
    });
```

- [ ] **Step 5: 浏览器 console 验证**

启动 `python3 -m http.server 8765`，隐私窗口打开 `http://localhost:8765`，在 console 执行：

```javascript
// 添加一笔不计入预算的支出
const tx = Storage.add({ amount: 5000, type: 'expense', category: '数码', note: 'console测试', date: new Date().toISOString(), countInBudget: false });
console.assert(tx.countInBudget === false, 'FAIL: add 应保存 countInBudget=false');

// 支出缺省计入
const tx2 = Storage.add({ amount: 30, type: 'expense', category: '餐饮', note: 'console测试2', date: new Date().toISOString() });
console.assert(tx2.countInBudget === true, 'FAIL: 支出缺省应为 true');

// 收入恒 true（即使传了 false）
const tx3 = Storage.add({ amount: 100, type: 'income', category: '工资', note: 'console测试3', date: new Date().toISOString(), countInBudget: false });
console.assert(tx3.countInBudget === true, 'FAIL: 收入应恒为 true');

// updateTransaction 切换
console.assert(Storage.updateTransaction(tx.id, { countInBudget: true }) === true, 'FAIL: update 应返回 true');
console.assert(Storage.getAll().find(t => t.id === tx.id).countInBudget === true, 'FAIL: 字段应已更新');
console.assert(Storage.updateTransaction('不存在的id', { countInBudget: false }) === false, 'FAIL: 未知 id 应返回 false');

// 月预算口径：先设月预算 100，恢复 tx 为不计入
Storage.setMonthlyBudget(100);
Storage.updateTransaction(tx.id, { countInBudget: false });
const month = formatYearMonth(new Date());
const usage = Storage.getMonthlyBudgetUsage(month);
// spent 只含计入的支出（tx2 的 30；tx 的 5000 被排除）
const expected = Storage.filterByMonth(month, 'expense').filter(t => t.countInBudget).reduce((s, t) => s + t.amount, 0);
console.assert(usage.spent === expected, 'FAIL: 月预算 spent 口径错误，应排除不计入的支出');

// 清理测试数据与预算
Storage.delete(tx.id); Storage.delete(tx2.id); Storage.delete(tx3.id);
Storage.setMonthlyBudget(0);
console.log('Task 1 验证通过');
```

预期：无 assertion 报错，最后输出 `Task 1 验证通过`；刷新页面后列表中无 console 测试记录。

- [ ] **Step 6: 提交**

```bash
git add js/storage.js
git commit -m "feat: 数据层支持 countInBudget 标志

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: 记账页「计入预算」开关

**Files:**
- Modify: `index.html:55-62`（备注卡片后插入开关卡片）
- Modify: `js/pages.js`

**Interfaces:**
- Consumes: `Storage.add({ ..., countInBudget })`（Task 1）
- Produces: 无新接口；模块级状态 `countInBudgetState`

- [ ] **Step 1: index.html 增加开关卡片**

在备注卡片（index.html:56-59）之后、占位 div（index.html:61-62）之前插入：

```html
        <!-- 计入预算开关（仅支出显示） -->
        <div id="budget-toggle-card" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">计入预算</div>
            <div class="text-xs text-gray-400 mt-0.5">大额一次性支出可关闭</div>
          </div>
          <button id="toggle-count-in-budget" type="button" role="switch" aria-checked="true" aria-label="计入预算"
            class="relative w-11 h-6 rounded-full transition-colors bg-red-500 shrink-0">
            <span id="toggle-thumb" class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-5"></span>
          </button>
        </div>
```

- [ ] **Step 2: pages.js 增加状态与渲染函数**

js/pages.js:1-2 顶部变量区加：

```javascript
let countInBudgetState = true;
```

在 `_initAddPage()` 的监听器区块（js/pages.js:57-68，`btn-manage-cats` 绑定后）加：

```javascript
    document.getElementById('toggle-count-in-budget').addEventListener('click', () => {
      countInBudgetState = !countInBudgetState;
      this._renderBudgetToggle();
    });
```

新增方法（放在 `_setType` 之前）：

```javascript
  _renderBudgetToggle() {
    const btn = document.getElementById('toggle-count-in-budget');
    const thumb = document.getElementById('toggle-thumb');
    btn.setAttribute('aria-checked', String(countInBudgetState));
    btn.classList.toggle('bg-red-500', countInBudgetState);
    btn.classList.toggle('bg-gray-300', !countInBudgetState);
    thumb.classList.toggle('translate-x-5', countInBudgetState);
    thumb.classList.toggle('translate-x-0', !countInBudgetState);
  },
```

- [ ] **Step 3: `_setType` 控制显隐**

`_setType(type)` 末尾（js/pages.js:181，`this._renderCategories();` 之前）加：

```javascript
    document.getElementById('budget-toggle-card').classList.toggle('hidden', !isExpense);
```

- [ ] **Step 4: `_saveTransaction` 传值并重置**

修改 `Storage.add(...)` 调用（js/pages.js:241）：

```javascript
    Storage.add({ amount, type: currentType, category, note, date, countInBudget: currentType === 'expense' ? countInBudgetState : true });
```

表单重置区（`this._renderCategories();` 之后）加：

```javascript
    countInBudgetState = true;
    this._renderBudgetToggle();
```

- [ ] **Step 5: 浏览器手动验证**

隐私窗口打开 `http://localhost:8765`：

1. 记账页可见「计入预算」开关卡片，默认开启（红色，滑块在右）
2. 点「收入」→ 开关卡片隐藏；点回「支出」→ 重新出现
3. 关闭开关，记一笔 5000 元「数码」支出 → 保存成功 toast 出现后开关恢复开启状态
4. 明细页该笔记录分类名旁有「不计入」badge（Task 3 实现 badge 前，先在 console 验证：`Storage.getAll()[0].countInBudget === false`）
5. 再记一笔普通支出不碰开关 → console 确认 `countInBudget === true`

验证后删除测试记录。

- [ ] **Step 6: 提交**

```bash
git add index.html js/pages.js
git commit -m "feat: 记账页新增「计入预算」开关

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: 明细页 badge 展示与点击切换

**Files:**
- Modify: `js/pages.js`（`_refreshList`，js/pages.js:299-332）

**Interfaces:**
- Consumes: `Storage.updateTransaction(id, { countInBudget })`（Task 1）
- Produces: 无新接口

- [ ] **Step 1: 行模板加 badge**

`_refreshList()` 的 `items.forEach(t => {...})` 内，`const isExpense = ...` 之后加 badge HTML：

```javascript
      const meta = Storage.getCategoryMeta(t.category);
      const isExpense = t.type === 'expense';
      const budgetBadge = isExpense
        ? (t.countInBudget
          ? '<span class="budget-badge text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-300 cursor-pointer select-none">预算内</span>'
          : '<span class="budget-badge text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-500 cursor-pointer select-none">不计入</span>')
        : '';
```

行模板中分类名处（js/pages.js:310）由

```html
            <span class="font-medium text-sm">${t.category}</span>
```

改为

```html
            <span class="font-medium text-sm flex items-center gap-1.5">${t.category}${budgetBadge}</span>
```

- [ ] **Step 2: 绑定点击切换**

`row.querySelector('.delete-btn')...` 绑定块之后加：

```javascript
      const badge = row.querySelector('.budget-badge');
      if (badge) {
        badge.addEventListener('click', () => {
          Storage.updateTransaction(t.id, { countInBudget: !t.countInBudget });
          if (navigator.vibrate) navigator.vibrate(30);
          this._refreshList();
        });
      }
```

- [ ] **Step 3: 浏览器手动验证**

隐私窗口打开页面，先记两笔支出（一笔关闭开关、一笔开启）：

1. 明细页：关闭开关的那笔显示橙色「不计入」badge，另一笔显示淡灰「预算内」badge；收入记录无 badge
2. 点「预算内」→ 变为「不计入」；点「不计入」→ 变为「预算内」
3. 刷新页面后状态保持（已写入 localStorage）
4. 顶部收入/支出汇总卡片数字不受切换影响（全部口径）

验证后删除测试记录。

- [ ] **Step 4: 提交**

```bash
git add js/pages.js
git commit -m "feat: 明细页支持点击 badge 切换是否计入预算

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: 月度统计口径与「大额支出」行

**Files:**
- Modify: `index.html:125-126`（月度汇总 grid 后插入大额行）
- Modify: `js/pages.js`（`_refreshStats`，js/pages.js:407-524）

**Interfaces:**
- Consumes: Task 1 的预算口径（月预算/分类年预算进度条自动生效，本任务无需改）
- Produces: DOM 元素 `#stats-big-expense`

- [ ] **Step 1: index.html 加大额支出行**

月度汇总 grid 结束（index.html:125 `</div>`）之后、`<!-- 月预算 -->` 注释之前插入：

```html
          <!-- 大额支出（不计入预算） -->
          <div id="stats-big-expense" class="text-xs text-gray-400 text-center mb-4 hidden"></div>
```

- [ ] **Step 2: `_refreshStats` 拆分日常/大额口径**

`_refreshStats()` 中（js/pages.js:417-424），`const items = ...` 之后加 `dailyItems`，支出与大额行改为：

```javascript
    const month = monthSelect.value || months[0];
    const items = Storage.filterByMonth(month, 'all');
    // 日常口径：收入全部 + 计入预算的支出
    const dailyItems = items.filter(t => t.type === 'income' || t.countInBudget);

    const income = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = dailyItems.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const bigExpense = items.filter(t => t.type === 'expense' && !t.countInBudget).reduce((s, t) => s + t.amount, 0);

    document.getElementById('stats-income').textContent = formatCurrency(income);
    document.getElementById('stats-expense').textContent = formatCurrency(expense);
    document.getElementById('stats-balance').textContent = formatCurrency(income - expense);

    // 大额支出行，为 0 时隐藏
    const bigEl = document.getElementById('stats-big-expense');
    if (bigExpense > 0) {
      bigEl.textContent = `其中大额支出（不计入预算）：${formatCurrency(bigExpense)}`;
      bigEl.classList.remove('hidden');
    } else {
      bigEl.classList.add('hidden');
    }
```

- [ ] **Step 3: 分类汇总改用日常口径**

`_refreshStats()` 中支出分类列表（js/pages.js:483）：

```javascript
    const expenseItems = dailyItems.filter(t => t.type === 'expense');
```

- [ ] **Step 4: 趋势图改用日常口径**

`_refreshStats()` 中（js/pages.js:520）：

```javascript
    Charts.renderTrend(dailyItems, month);
```

- [ ] **Step 5: 浏览器手动验证**

隐私窗口准备数据：设月预算 3000；记一笔 30 元「餐饮」（计入）、一笔 5000 元「数码」（不计入）、一笔 1000 元「工资」收入：

1. 统计页月度：支出显示 ¥30.00；结余 = 1000 - 30 = ¥970.00
2. 支出卡片下方出现「其中大额支出（不计入预算）：¥5,000.00」
3. 支出分类明细只含「餐饮 ¥30.00」，无「数码」
4. 每日趋势图支出柱只含 30 元当天柱
5. 月预算进度：已用 ¥30.00 / 1%
6. 明细页把「数码」切回「预算内」→ 统计页支出变 ¥5,030.00，大额行消失，预算进度 100%+（超支样式）

验证后删除测试记录、月预算改回 0。

- [ ] **Step 6: 提交**

```bash
git add index.html js/pages.js
git commit -m "feat: 月度统计按日常口径计算并单独显示大额支出

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: 年度统计口径与「大额支出」行

**Files:**
- Modify: `js/storage.js`（`getYearMonthlyData`，js/storage.js:203-216）
- Modify: `index.html:179-180`（年度汇总 grid 后插入大额行）
- Modify: `js/pages.js`（`_refreshYearStats`，js/pages.js:526-583）

**Interfaces:**
- Consumes: Task 1 的字段语义
- Produces: DOM 元素 `#year-big-expense`；`getYearMonthlyData(year)` 的 `expense` 只含计入预算的支出

- [ ] **Step 1: `getYearMonthlyData` 过滤**

js/storage.js:213，expense 一行改为：

```javascript
      const expense = monthItems.filter(t => t.type === 'expense' && t.countInBudget).reduce((s, t) => s + t.amount, 0);
```

- [ ] **Step 2: index.html 加年度大额支出行**

年度汇总 grid 结束（index.html:179 `</div>`）之后、`<!-- 年度分类统计 -->` 注释之前插入：

```html
            <!-- 年度大额支出（不计入预算） -->
            <div id="year-big-expense" class="text-xs text-gray-400 text-center mb-4 hidden"></div>
```

- [ ] **Step 3: `_refreshYearStats` 拆分口径**

`_refreshYearStats()` 中（js/pages.js:535-543）：

```javascript
    const year = yearSelect.value || years[0];
    const items = Storage.filterByYear(year, 'all');
    // 日常口径：收入全部 + 计入预算的支出
    const dailyItems = items.filter(t => t.type === 'income' || t.countInBudget);

    const income = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = dailyItems.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const bigExpense = items.filter(t => t.type === 'expense' && !t.countInBudget).reduce((s, t) => s + t.amount, 0);

    document.getElementById('year-income').textContent = formatCurrency(income);
    document.getElementById('year-expense').textContent = formatCurrency(expense);
    document.getElementById('year-balance').textContent = formatCurrency(income - expense);

    // 年度大额支出行，为 0 时隐藏
    const yearBigEl = document.getElementById('year-big-expense');
    if (bigExpense > 0) {
      yearBigEl.textContent = `其中大额支出（不计入预算）：${formatCurrency(bigExpense)}`;
      yearBigEl.classList.remove('hidden');
    } else {
      yearBigEl.classList.add('hidden');
    }
```

- [ ] **Step 4: 年度分类汇总改用日常口径**

`_refreshYearStats()` 中（js/pages.js:547）：

```javascript
    const expenseItems = dailyItems.filter(t => t.type === 'expense');
```

- [ ] **Step 5: 浏览器手动验证**

沿用 Task 4 的测试数据（或重新准备：计入支出 30、不计入支出 5000、收入 1000）：

1. 全年统计：年支出 ¥30.00、年结余 ¥970.00
2. 年度汇总下方出现「其中大额支出（不计入预算）：¥5,000.00」
3. 年度分类汇总只含「餐饮」，无「数码」
4. 月度收支趋势图当年月份支出柱为 30 而非 5030
5. 明细页把「数码」切回「预算内」→ 年支出变 ¥5,030.00，大额行消失，趋势图柱变高

验证后删除测试记录。

- [ ] **Step 6: 提交**

```bash
git add js/storage.js index.html js/pages.js
git commit -m "feat: 年度统计按日常口径计算并单独显示大额支出

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## 最终验收（对照 spec）

1. 新增支出时关闭开关 → 明细页出现「不计入」badge → 月预算进度不包含该笔 ✅ Task 2/3/4
2. 明细页点击 badge 切换 → 统计页支出总额、大额行、预算进度同步变化 ✅ Task 3/4/5
3. 旧数据（无字段）读取正常，默认计入预算 ✅ `getAll()` 规范化（已完成）+ Task 1 console 验证
4. 导出 → 清空 → 导入，标志保持（导出 JSON 中记录带 `countInBudget` 字段）— 手动验证一次
5. 收入记录不显示开关 ✅ Task 2
