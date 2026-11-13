/* =========================================================================
   招聘漏斗 · 周度可视化面板 — 渲染层
   -------------------------------------------------------------------------
   全部从 data.js 里的 WEEKS / KPI_DEFS / CANDIDATES / FLOW / LINKS 渲染。
   要接真实数据只改 data.js，这个文件不用动。
   ========================================================================= */

const STATUS_CLASS = { done: 's-done', lost: 's-lost', flow: 's-flow', wait: 's-wait' };
const DOT_CLASS    = { done: 'done',   lost: 'lost',   flow: 'flow',   wait: 'wait' };

const GROUP_LABEL = { all: '全部', flow: '在流程', wait: '待跟进', done: '已到岗', lost: '已流失' };
const GROUP_ORDER = ['all', 'flow', 'wait', 'done', 'lost'];

/* 当前选中的周，默认取最后一个有数据的周 */
const WEEK_KEYS = Object.keys(WEEKS);
let currentWeek = [...WEEK_KEYS].reverse().find(k => WEEKS[k].kpis) || WEEK_KEYS[0];

const $ = id => document.getElementById(id);

/* ---------- 小工具 ---------- */
function deltaHtml(d) {
  if (d === null || d === undefined) return '<span class="delta flat">基准周</span>';
  if (d > 0) return '<span class="delta up">▲ +' + d + '%</span>';
  if (d < 0) return '<span class="delta down">▼ ' + d + '%</span>';
  return '<span class="delta flat">持平</span>';
}

function pct(a, b) {
  if (!b) return 0;
  return Math.round(a / b * 1000) / 10;
}

/* ---------- 图表主题 ---------- */
const chartTheme = {
  textStyle: {
    color: '#9fb0c8',
    fontFamily: '-apple-system,"PingFang SC","Microsoft YaHei",sans-serif'
  },
  tooltip: {
    backgroundColor: 'rgba(9,15,26,.95)',
    borderColor: '#26344d',
    textStyle: { color: '#dfe9f6', fontSize: 12 }
  }
};

/* ---------- 头部：周切换 ---------- */
function renderHeader() {
  $('weekSwitch').innerHTML = WEEK_KEYS.map(k => {
    const w = WEEKS[k];
    const label = k + ' · ' + w.range.replace(/\s/g, '');
    return '<button class="pill' + (k === currentWeek ? ' active' : '') +
      '" data-week="' + k + '"' + (w.kpis ? '' : ' disabled') + '>' + label + '</button>';
  }).join('');

  $('weekTag').textContent = WEEKS[currentWeek].tag;
  $('genAt').textContent = '生成于 ' + new Date().toISOString().slice(0, 10);

  document.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentWeek = btn.dataset.week;
      renderKpis();
      renderSource();
      renderSummary();
    });
  });
}

/* ---------- KPI 卡片 ---------- */
function renderKpis() {
  const wk = WEEKS[currentWeek];
  if (!wk.kpis) {
    $('kpis').innerHTML = '<div class="kpi-empty">这一周还没有数据</div>';
    return;
  }

  $('kpis').innerHTML = KPI_DEFS.map(def => {
    const it = wk.kpis[def.key];
    const delta = it.delta;

    // 到岗与流程内是人数变化，用「人」而不是百分比
    let dHtml;
    if (delta === null || delta === undefined) {
      dHtml = '<span class="delta flat">基准周</span>';
    } else if (def.key === 'onboard' || def.key === 'pool') {
      const sign = delta >= 0 ? 'up' : 'down';
      const arrow = delta >= 0 ? '▲ +' : '▼ ';
      dHtml = '<span class="delta ' + sign + '">' + arrow + delta + ' 人</span>';
    } else {
      dHtml = deltaHtml(delta);
    }

    return '<div class="kpi">' +
      '<div class="k-label"><span>' + def.label + '</span>' + dHtml + '</div>' +
      '<div class="k-value">' + it.v + '<small>' + def.unit + '</small></div>' +
      '<div class="k-sub">' + it.sub + '</div>' +
      '</div>';
  }).join('');

  $('weekTag').textContent = wk.tag;
  $('srcTag').textContent = currentWeek;
}

/* ---------- 顶部跨周指标条 ---------- */
function renderLinkStrip() {
  $('linkStrip').innerHTML = LINKS.map(l =>
    '<div class="mini"><div class="num">' + l.num + '</div><div class="txt">' + l.txt + '</div></div>'
  ).join('');
}

/* ---------- 周度趋势 ---------- */
const trendChart = echarts.init($('trendChart'));
function renderTrend() {
  const series = [
    { key: 'resume',    name: '简历进入', color: '#38bdf8', area: true },
    { key: 'interview', name: '面试场次', color: '#a78bfa' },
    { key: 'second',    name: '进入二面', color: '#fbbf24' },
    { key: 'onboard',   name: '到岗',     color: '#34d399' }
  ];

  trendChart.setOption({
    ...chartTheme,
    grid: { left: 44, right: 16, top: 44, bottom: 26 },
    legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: '#9fb0c8', fontSize: 11 } },
    tooltip: { ...chartTheme.tooltip, trigger: 'axis' },
    xAxis: {
      type: 'category', data: WEEK_KEYS,
      axisLine: { lineStyle: { color: '#26344d' } }, axisTick: { show: false },
      axisLabel: { color: '#9fb0c8' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(38,52,77,.55)' } },
      axisLabel: { color: '#7e92ad' }
    },
    series: series.map(s => ({
      name: s.name,
      type: 'line',
      smooth: true,
      symbolSize: 7,
      data: WEEK_KEYS.map(k => WEEKS[k].kpis ? WEEKS[k].kpis[s.key].v : null),
      lineStyle: { width: 2.5, color: s.color },
      itemStyle: { color: s.color },
      ...(s.area ? {
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(56,189,248,.22)' },
            { offset: 1, color: 'rgba(56,189,248,0)' }
          ])
        }
      } : {})
    }))
  }, true);
}

/* ---------- 环节转化率对比 ---------- */
const convChart = echarts.init($('convChart'));
function renderConv() {
  const filled = WEEK_KEYS.filter(k => WEEKS[k].kpis);
  const stages = ['面试→二面', '二面→Offer', '简历→Offer'];
  const palette = ['#2563eb', '#22d3ee', '#a78bfa', '#fbbf24'];

  const ratesOf = k => {
    const p = WEEKS[k].kpis;
    return [
      pct(p.second.v, p.interview.v),
      pct(p.offer.v, p.second.v),
      pct(p.offer.v, p.resume.v)
    ];
  };

  convChart.setOption({
    ...chartTheme,
    grid: { left: 44, right: 14, top: 44, bottom: 30 },
    legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: '#9fb0c8', fontSize: 11 } },
    tooltip: { ...chartTheme.tooltip, trigger: 'axis', valueFormatter: v => v + '%' },
    xAxis: {
      type: 'category', data: stages,
      axisLine: { lineStyle: { color: '#26344d' } }, axisTick: { show: false },
      axisLabel: { color: '#9fb0c8', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}%', color: '#7e92ad' },
      splitLine: { lineStyle: { color: 'rgba(38,52,77,.55)' } }
    },
    series: filled.map((k, i) => ({
      name: k,
      type: 'bar',
      barWidth: 18,
      itemStyle: { color: palette[i % palette.length], borderRadius: [3, 3, 0, 0] },
      data: ratesOf(k)
    }))
  }, true);
}

/* ---------- 跨周流转（桑基图） ---------- */
const sankeyChart = echarts.init($('sankeyChart'));
function renderSankey() {
  const kept = FLOW.links.filter(l => !l.target.includes('流失')).reduce((s, l) => s + l.value, 0);

  $('sankeyCap').textContent = '每条流带是一名候选人的周间状态迁移：' +
    LINKS[0].num + ' 人进入本周，' + kept + ' 人仍在流程或已到岗，其余流失';

  sankeyChart.setOption({
    ...chartTheme,
    tooltip: {
      ...chartTheme.tooltip,
      trigger: 'item',
      formatter: p => p.dataType === 'edge'
        ? p.data.source + ' → ' + p.data.target + '：' + p.data.value + ' 人'
        : p.name
    },
    series: [{
      type: 'sankey',
      left: 6, right: 110, top: 8, bottom: 8,
      nodeWidth: 12, nodeGap: 16,
      label: { color: '#cfdbec', fontSize: 11.5 },
      lineStyle: { color: 'gradient', opacity: .32, curveness: .55 },
      emphasis: { focus: 'adjacency' },
      data: FLOW.nodes.map(n => ({ name: n.name, itemStyle: { color: n.color } })),
      links: FLOW.links
    }]
  }, true);
}

/* ---------- 简历来源结构 ---------- */
const sourceChart = echarts.init($('sourceChart'));
function renderSource() {
  const data = WEEKS[currentWeek].source || [];
  const total = data.reduce((s, d) => s + d.value, 0);

  sourceChart.setOption({
    ...chartTheme,
    tooltip: { ...chartTheme.tooltip, trigger: 'item', formatter: '{b}：{c} 人次（{d}%）' },
    legend: { bottom: 0, left: 'center', itemWidth: 9, itemHeight: 9, textStyle: { color: '#9fb0c8', fontSize: 11 } },
    graphic: [
      { type: 'text', left: 'center', top: '40%', style: { text: String(total), fill: '#e6edf7', fontSize: 30, fontWeight: 700, textAlign: 'center' } },
      { type: 'text', left: 'center', top: '54%', style: { text: '人次', fill: '#7e92ad', fontSize: 12, textAlign: 'center' } }
    ],
    series: [{
      type: 'pie',
      radius: ['52%', '74%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#0c1422', borderWidth: 2 },
      label: { color: '#9fb0c8', fontSize: 11, formatter: '{b}\n{c}' },
      labelLine: { lineStyle: { color: '#31486d' } },
      data: data,
      color: ['#38bdf8', '#a78bfa', '#fbbf24', '#34d399', '#f87171']
    }]
  }, true);
}

/* ---------- 周度汇总表 ---------- */
function renderSummary() {
  $('thPrev').textContent = '上周（' + WEEK_KEYS[0] + '）';
  $('thCurr').textContent = '本周（截至' + (WEEKS[currentWeek].cutAt || '') + '）';

  $('summaryBody').innerHTML = WEEK_KEYS.map(k => {
    const w = WEEKS[k];
    const p = w.kpis;

    let statusHtml = '<span class="tag-mini">—</span>';
    if (w.summary.status === 'full') statusHtml = '<span class="tag-mini tag-full">完整</span>';
    else if (w.summary.status === 'partial') {
      statusHtml = '<span class="tag-mini tag-partial">进行中' +
        (w.cutAt ? ' · 截至 ' + w.cutAt : '') + '</span>';
    } else if (w.summary.status === 'empty') statusHtml = '<span class="tag-mini">待生成</span>';

    if (!p) {
      return '<tr><td>' + k + '</td><td>' + w.range + '</td>' +
        '<td class="num">—</td><td class="num">—</td><td class="num">—</td>' +
        '<td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td>' +
        '<td>' + statusHtml + '</td></tr>';
    }

    const note = w.summary.interviewNote
      ? ' <small style="color:#7e92ad">' + w.summary.interviewNote + '</small>' : '';

    return '<tr>' +
      '<td>' + k + '</td>' +
      '<td>' + w.range + '</td>' +
      '<td class="num">' + p.resume.v + '</td>' +
      '<td class="num">' + p.interview.v + note + '</td>' +
      '<td class="num">' + p.second.v + '</td>' +
      '<td class="num">' + p.offer.v + '</td>' +
      '<td class="num">' + p.onboard.v + '</td>' +
      '<td class="num">' + pct(p.offer.v, p.resume.v).toFixed(1) + '%</td>' +
      '<td class="num">' + p.pool.v + '</td>' +
      '<td>' + statusHtml + '</td>' +
      '</tr>';
  }).join('');
}

/* ---------- 候选人筛选 ---------- */
let currentFilter = 'all';

function renderFilters() {
  const counts = GROUP_ORDER.reduce((acc, g) => {
    acc[g] = g === 'all' ? CANDIDATES.length : CANDIDATES.filter(c => c.g === g).length;
    return acc;
  }, {});

  $('filters').innerHTML = GROUP_ORDER
    .filter(g => counts[g] > 0)
    .map(g => '<button class="chip' + (g === currentFilter ? ' active' : '') +
      '" data-f="' + g + '">' + GROUP_LABEL[g] + ' ' + counts[g] + '</button>')
    .join('');

  document.querySelectorAll('#filters .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#filters .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.f;
      renderCandidates();
    });
  });
}

function renderCandidates() {
  const rows = CANDIDATES.filter(c => currentFilter === 'all' || c.g === currentFilter);

  $('candBody').innerHTML = rows.length ? rows.map(c =>
    '<tr data-g="' + c.g + '">' +
      '<td><b>' + c.name + '</b></td>' +
      '<td>' + c.dept + '</td>' +
      '<td>' + c.w42 + '</td>' +
      '<td>' + c.w43 + '</td>' +
      '<td class="' + STATUS_CLASS[c.g] + '"><span class="dot ' + DOT_CLASS[c.g] + '">' +
        '</span>' + c.status + '</td>' +
    '</tr>'
  ).join('') : '<tr><td colspan="5" class="empty-row">这个分组下没有人</td></tr>';
}

/* ---------- 启动 ---------- */
renderHeader();
renderKpis();
renderLinkStrip();
renderTrend();
renderConv();
renderSankey();
renderSource();
renderSummary();
renderFilters();
renderCandidates();

window.addEventListener('resize', () => {
  trendChart.resize();
  convChart.resize();
  sankeyChart.resize();
  sourceChart.resize();
});
