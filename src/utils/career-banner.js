export function initCareerBanner(root) {


    // Only company/month metadata is embedded. No log text or credentials are read by this page.
    const MONTH_COMPANIES = {"2020-04":"weimang","2020-05":"weimang","2020-06":"weimang","2020-07":"weimang","2020-08":"weimang","2020-09":"weimang","2020-10":"weimang","2020-11":"weimang","2020-12":"weimang","2021-01":"weimang","2021-02":"weimang","2021-03":"weimang","2021-04":"weimang","2021-05":"weimang","2021-06":"weimang","2021-07":"weimang","2021-09":"wayz","2021-10":"wayz","2021-11":"wayz","2021-12":"wayz","2022-01":"wayz","2022-02":"wayz","2022-03":"wayz","2022-04":"wayz","2022-05":"wayz","2022-06":"wayz","2022-07":"wayz","2022-08":"wayz","2022-09":"wayz","2022-10":"wayz","2022-11":"wayz","2022-12":"wayz","2023-01":"wayz","2023-02":"wayz","2023-03":"wayz","2023-06":"guanmai","2023-07":"guanmai","2023-08":"guanmai","2023-09":"guanmai","2023-10":"guanmai","2023-11":"guanmai","2023-12":"guanmai","2024-01":"guanmai","2024-02":"guanmai","2024-03":"guanmai","2024-04":"guanmai","2024-05":"guanmai","2024-06":"guanmai","2024-07":"guanmai","2024-08":"guanmai","2024-09":"guanmai","2024-11":"liveme","2024-12":"liveme","2025-01":"liveme","2025-02":"liveme","2025-03":"liveme","2025-04":"quanku","2025-05":"quanku","2025-06":"quanku","2025-07":"quanku","2025-08":"quanku","2025-09":"quanku","2025-10":"quanku","2025-11":"quanku","2025-12":"quanku","2026-01":"quanku","2026-02":"quanku","2026-03":"quanku","2026-04":"quanku","2026-05":"quanku","2026-06":"quanku","2026-07":"quanku","2026-08":"quanku","2026-09":"quanku","2026-10":"quanku","2026-11":"quanku"};
    const COMPANIES = {
      weimang: { name: '微芒', english: 'WEIMANG', color: '#8c9d56' },
      wayz: { name: '维智', english: '维智', color: '#c49b43' },
      guanmai: { name: '观麦科技', english: '观麦科技', color: '#c77957' },
      liveme: { name: '乐我无限', english: 'LIVEME', color: '#9183ac' },
      quanku: { name: '全酷文化', english: 'QUANKU', color: '#548b7a' }
    };
    const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
    const VIEWS = ['all', ...YEARS.map(String)];
    const AS_OF = Date.UTC(2026, 10, 2);
    const DAY = 86400000;
    const COLUMNS = 53;
    const PERIOD = 4000;
    const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const $ = id => root.querySelector(`[id="${id}"]`);
    const matrix = $('matrix');
    const tooltip = $('tooltip');
    const yearButtons = [...root.querySelectorAll('.year-button')];
    const cells = [];
    let currentView = 'all';
    let activeCell = null;
    let pinnedCell = null;
    let playing = false;
    let frame = 0;
    let started = 0;
    let animationTimer = 0;
    let cellData = [];
    let selectedCompany = null;

    const pad = n => String(n).padStart(2, '0');
    const dateText = timestamp => {
      const date = new Date(timestamp);
      return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}`;
    };
    function companyAt(timestamp) {
      if (timestamp > AS_OF) return null;
      const date = new Date(timestamp);
      return MONTH_COMPANIES[`${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`] || null;
    }
    function yearStart(year) {
      const first = Date.UTC(year, 0, 1);
      return first - new Date(first).getUTCDay() * DAY;
    }
    function dayData(year, row, col) {
      const timestamp = yearStart(year) + (col * 7 + row) * DAY;
      const date = new Date(timestamp);
      const outside = date.getUTCFullYear() !== year;
      const company = outside ? null : companyAt(timestamp);
      const status = outside ? 'outside' : timestamp > AS_OF ? 'future' : company ? 'recorded' : 'empty';
      return { timestamp, end: timestamp, company, companies: company ? [company] : [], status, row, col, year, weekly: false };
    }
    function weekData(year, row, col) {
      const start = Math.max(yearStart(year) + col * 7 * DAY, Date.UTC(year, 0, 1));
      const end = Math.min(yearStart(year) + (col * 7 + 6) * DAY, Date.UTC(year, 11, 31));
      const counts = {};
      for (let date = start; date <= end; date += DAY) {
        const key = companyAt(date);
        if (key) counts[key] = (counts[key] || 0) + 1;
      }
      const companies = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      const company = companies[0] || null;
      const status = start > end ? 'outside' : start > AS_OF ? 'future' : company ? 'recorded' : 'empty';
      return { timestamp: start, end, company, companies, status, row, col, year, weekly: true };
    }
    function describe(data) {
      const dates = data.weekly ? `${dateText(data.timestamp)} — ${dateText(data.end)}` : `${dateText(data.timestamp)} · ${WEEKDAYS[data.row]}`;
      const company = data.companies.map(key => COMPANIES[key].name).join(' / ');
      return `${dates}，${company || (data.status === 'future' ? '待续' : '日志留白')}`;
    }
    function renderAxes(view) {
      $('row-axis').replaceChildren(...(view === 'all' ? YEARS : WEEKDAYS).map(label => {
        const span = document.createElement('span');
        span.textContent = label;
        return span;
      }));
      $('months').replaceChildren(...Array.from({ length: 12 }, (_, month) => {
        const span = document.createElement('span');
        const year = view === 'all' ? 2026 : Number(view);
        const col = Math.floor((Date.UTC(year, month, 1) - yearStart(year)) / DAY / 7);
        span.style.gridColumn = `${col + 1} / span 3`;
        span.textContent = `${month + 1}月`;
        return span;
      }));
    }
    function render(view, animate = true) {
      hideTooltip(true);
      currentView = view;
      const index = VIEWS.indexOf(view);
      yearButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.year === view)));
      $('previous').disabled = index === 0;
      $('next').disabled = index === VIEWS.length - 1;
      $('chart-heading').textContent = view === 'all' ? '把七年，放在同一张日历里。' : `${view}，这一年的日子。`;
      $('view-badge').textContent = view === 'all' ? '七年全景' : '逐日视图';
      $('date-label').textContent = view === 'all' ? '2020.04 — 2026.11' : `${view}.01 — ${view}.12`;
      matrix.setAttribute('aria-label', view === 'all' ? '七年工作日志全景，每格一周，方向键移动' : `${view}年工作日志，每格一天，方向键移动`);
      renderAxes(view);
      cellData = cells.map((cell, index) => {
        const row = Math.floor(index / COLUMNS);
        const col = index % COLUMNS;
        const data = view === 'all' ? weekData(YEARS[row], row, col) : dayData(Number(view), row, col);
        cell.removeAttribute('data-company');
        if (data.company) cell.dataset.company = data.company;
        cell.dataset.status = data.status;
        cell.setAttribute('aria-label', describe(data));
        cell.setAttribute('aria-rowindex', row + 1);
        cell.setAttribute('aria-colindex', col + 1);
        cell.tabIndex = -1;
        cell.style.setProperty('--delay', `${(col * 5 + row * 16) % 300}ms`);
        cell.classList.remove('waking');
        return data;
      });
      const first = cellData.findIndex(data => data.status === 'recorded');
      if (first >= 0) cells[first].tabIndex = 0;
      clearTimeout(animationTimer);
      if (animate && !reducedMotion.matches) {
        void matrix.offsetWidth;
        cells.forEach(cell => cell.classList.add('waking'));
        animationTimer = window.setTimeout(() => cells.forEach(cell => cell.classList.remove('waking')), 1050);
      }
      const represented = new Set(cellData.map(data => data.company).filter(Boolean));
      selectedCompany = null;
      clearCompany();
      root.querySelectorAll('.legend-item').forEach(item => {
        item.classList.toggle('current', represented.has(item.dataset.company));
        item.setAttribute('aria-pressed', 'false');
      });
      $('announcement').textContent = view === 'all' ? '已切换到七年全景，每格代表一周' : `已切换到${view}年，每格代表一天`;
      resetProgress();
    }
    function positionTooltip(cell) {
      const box = cell.getBoundingClientRect();
      const gap = 15;
      const width = tooltip.offsetWidth;
      const height = tooltip.offsetHeight;
      const left = Math.max(10, Math.min(window.innerWidth - width - 10, box.left + box.width / 2 - width / 2));
      let top = box.top - height - gap;
      if (top < 10) top = box.bottom + gap;
      top = Math.max(10, Math.min(top, window.innerHeight - height - 10));
      tooltip.style.left = `${Math.round(left)}px`;
      tooltip.style.top = `${Math.round(top)}px`;
    }
    function showTooltip(cell) {
      const index = Number(cell.dataset.index);
      const data = cellData[index];
      if (!data || data.status === 'outside') return;
      cells.forEach(item => {
        item.classList.remove('active', 'near');
        item.removeAttribute('aria-describedby');
      });
      activeCell = cell;
      cell.classList.add('active');
      [-COLUMNS, -1, 1, COLUMNS].forEach(delta => {
        const neighbor = index + delta;
        if (neighbor >= 0 && neighbor < cells.length && (Math.abs(delta) !== 1 || Math.floor(neighbor / COLUMNS) === data.row)) cells[neighbor].classList.add('near');
      });
      $('tooltip-date').textContent = data.weekly ? `${dateText(data.timestamp)} — ${dateText(data.end)}` : `${dateText(data.timestamp)} · ${WEEKDAYS[data.row]}`;
      $('tooltip-company').textContent = data.companies.length ? data.companies.map(key => COMPANIES[key].name).join(' / ') : data.status === 'future' ? '故事待续' : '给时光留一点白';
      $('tooltip-dot').style.setProperty('--company-color', data.company ? COMPANIES[data.company].color : '#a4ae91');
      $('tooltip-detail').textContent = data.company ? data.weekly ? '这一周，在这里留下记录。' : '这一格，属于这段工作日常。' : data.status === 'future' ? '还没走到的日子，留给下一段故事。' : '这个月份，目录里没有归档日志。';
      $('tooltip-stamp').textContent = data.company ? data.companies.map(key => COMPANIES[key].english).join(' / ') : data.status === 'future' ? 'TO BE CONTINUED' : 'A LITTLE BREATHING ROOM';
      positionTooltip(cell);
      tooltip.classList.add('visible');
      tooltip.setAttribute('aria-hidden', 'false');
      cell.setAttribute('aria-describedby', 'tooltip');
    }
    function hideTooltip(force = false) {
      if (pinnedCell && !force) return;
      if (force) pinnedCell = null;
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
      cells.forEach(cell => { cell.classList.remove('active', 'near'); cell.removeAttribute('aria-describedby'); });
      activeCell = null;
    }
    function focusCompany(key) {
      matrix.classList.add('is-focusing');
      cells.forEach((cell, index) => cell.classList.toggle('highlighted', cellData[index].companies.includes(key)));
    }
    function clearCompany() {
      matrix.classList.remove('is-focusing');
      cells.forEach(cell => cell.classList.remove('highlighted'));
    }
    function restoreCompany() {
      if (selectedCompany) focusCompany(selectedCompany);
      else clearCompany();
    }
    function resetProgress() {
      started = performance.now();
      $('progress-bar').style.width = '0%';
    }
    function tick(now) {
      if (!playing) return;
      const elapsed = now - started;
      $('progress-bar').style.width = `${Math.min(elapsed / PERIOD, 1) * 100}%`;
      if (elapsed >= PERIOD) render(VIEWS[(VIEWS.indexOf(currentView) + 1) % VIEWS.length]);
      frame = requestAnimationFrame(tick);
    }
    function setPlaying(value) {
      playing = value;
      $('play').setAttribute('aria-pressed', String(value));
      $('play-label').textContent = value ? '暂停，停在这一年' : '让时间走一会儿';
      $('play-symbol').innerHTML = value ? '<svg viewBox="0 0 12 12"><path d="M3 2h2v8H3zm4 0h2v8H7z"/></svg>' : '<svg viewBox="0 0 12 12"><path d="M3 1.5 10 6 3 10.5z"/></svg>';
      cancelAnimationFrame(frame);
      resetProgress();
      if (value) frame = requestAnimationFrame(tick);
    }
    function selectView(view) {
      setPlaying(false);
      render(view);
    }
    // One roving tab stop keeps hundreds of squares out of the Tab sequence.
    for (let row = 0; row < 7; row++) {
      const rowElement = document.createElement('div');
      rowElement.setAttribute('role', 'row');
      rowElement.style.display = 'contents';
      for (let col = 0; col < COLUMNS; col++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.setAttribute('role', 'gridcell');
        cell.dataset.index = cells.length;
        cell.tabIndex = -1;
        rowElement.appendChild(cell);
        cells.push(cell);
      }
      matrix.appendChild(rowElement);
    }

    for (const [key, company] of Object.entries(COMPANIES)) {
      const item = document.createElement('button');
      item.className = 'legend-item';
      item.type = 'button';
      item.dataset.company = key;
      item.setAttribute('aria-label', `高亮${company.name}的时间`);
      const swatch = document.createElement('i');
      swatch.style.setProperty('--color', company.color);
      swatch.setAttribute('aria-hidden', 'true');
      item.append(swatch, document.createTextNode(company.name));
      item.addEventListener('pointerenter', () => focusCompany(key));
      item.addEventListener('pointerleave', restoreCompany);
      item.addEventListener('focus', () => focusCompany(key));
      item.addEventListener('blur', restoreCompany);
      item.addEventListener('click', () => {
        selectedCompany = selectedCompany === key ? null : key;
        root.querySelectorAll('.legend-item').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.company === selectedCompany)));
        restoreCompany();
      });
      $('legend').appendChild(item);
    }
    const emptyLegend = document.createElement('span');
    emptyLegend.className = 'legend-empty';
    emptyLegend.innerHTML = '<i aria-hidden="true"></i>留白 / 待续';
    $('legend').appendChild(emptyLegend);
    yearButtons.forEach(button => button.addEventListener('click', () => selectView(button.dataset.year)));
    $('previous').addEventListener('click', () => selectView(VIEWS[Math.max(0, VIEWS.indexOf(currentView) - 1)]));
    $('next').addEventListener('click', () => selectView(VIEWS[Math.min(VIEWS.length - 1, VIEWS.indexOf(currentView) + 1)]));
    $('play').addEventListener('click', () => setPlaying(!playing));
    matrix.addEventListener('pointerover', event => {
      if (event.pointerType === 'touch' || pinnedCell) return;
      const cell = event.target.closest('.cell');
      if (cell && cell !== activeCell) showTooltip(cell);
    });
    matrix.addEventListener('pointerleave', () => hideTooltip());
    matrix.addEventListener('focusin', event => {
      const cell = event.target.closest('.cell');
      if (cell) showTooltip(cell);
    });
    matrix.addEventListener('focusout', event => { if (!matrix.contains(event.relatedTarget)) hideTooltip(true); });
    matrix.addEventListener('click', event => {
      const cell = event.target.closest('.cell');
      if (!cell) return;
      if (pinnedCell === cell) hideTooltip(true);
      else { pinnedCell = cell; showTooltip(cell); }
    });
    matrix.addEventListener('keydown', event => {
      const cell = event.target.closest('.cell');
      if (!cell) return;
      if (event.key === 'Escape') { hideTooltip(true); return; }
      const directions = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLUMNS, ArrowDown: COLUMNS };
      if (!(event.key in directions) && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const index = Number(cell.dataset.index);
      const rowStart = Math.floor(index / COLUMNS) * COLUMNS;
      const rowEnd = rowStart + COLUMNS - 1;
      let next = event.key === 'Home' ? Math.floor(index / COLUMNS) * COLUMNS : event.key === 'End' ? Math.floor(index / COLUMNS) * COLUMNS + COLUMNS - 1 : index + directions[event.key];
      if (event.key === 'Home' || event.key === 'End') {
        const step = event.key === 'End' ? -1 : 1;
        while (next >= rowStart && next <= rowEnd && cellData[next].status === 'outside') next += step;
        if (next < rowStart || next > rowEnd) return;
      } else {
        if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && (next < rowStart || next > rowEnd)) return;
        if (next >= 0 && next < cells.length && cellData[next].status === 'outside') return;
      }
      if (next < 0 || next >= cells.length) return;
      pinnedCell = null;
      cells.forEach(item => item.tabIndex = -1);
      cells[next].tabIndex = 0;
      cells[next].focus({ preventScroll: true });
      cells[next].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    });
    document.addEventListener('pointerdown', event => {
      if (!event.target.closest('.cell')) hideTooltip(true);
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') hideTooltip(true); });
    $('matrix-scroll').addEventListener('scroll', () => { if (activeCell) positionTooltip(activeCell); }, { passive: true });
    window.addEventListener('resize', () => { if (activeCell) positionTooltip(activeCell); });
    window.addEventListener('scroll', () => { if (activeCell) positionTooltip(activeCell); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) setPlaying(false); });
    const stopWhenHidden = () => {
      if (!document.body.classList.contains('lg:is-home')) {
        setPlaying(false);
        hideTooltip(true);
      }
    };
    new MutationObserver(stopWhenHidden).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    reducedMotion.addEventListener('change', () => {
      setPlaying(false);
      cells.forEach(cell => cell.classList.remove('waking'));
    });
    render('all');


}
