#!/usr/bin/env node
/**
 * data.js 数据自洽检查。
 *
 * 为什么需要：
 * 这个面板的所有图表都从 data.js 读数据。数据里出现「上周 12 人，
 * 但流转图加起来只有 9 人」这类矛盾时，页面不会报错，只会安静地画出
 * 一张错的图 —— 而这种错在周会上被指着问的时候才发现，就晚了。
 *
 * 检查项：
 *   1. 候选人分组只能是 done / flow / wait / lost
 *   2. 每个候选人有必需的字段
 *   3. 流转图各来源节点的流出之和 = 顶部指标条里的流程内人数
 *   4. 流转图每条 link 的 source / target 都在 nodes 里
 *   5. 每周的 kpis 六项齐全
 *   6. source 渠道数值之和 = resume 数值
 *   7. 汇总表用的 delta 与相邻两周实际差值一致（允许 0.1 容差）
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8');

// 在一个隔离上下文里执行 data.js，取回其中的常量
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(SRC + '\n;this.__out = { WEEKS, KPI_DEFS, CANDIDATES, FLOW, LINKS };', sandbox);
const { WEEKS, KPI_DEFS, CANDIDATES, FLOW, LINKS } = sandbox.__out;

let fail = 0;
const bad = m => { console.error('❌ ' + m); fail++; };
const ok = m => console.log('✅ ' + m);

/* 1 & 2. 候选人结构 */
const GROUPS = ['done', 'flow', 'wait', 'lost'];
let groupErr = 0;
CANDIDATES.forEach((c, i) => {
  if (!c.name) { bad(`候选人 #${i} 缺 name`); groupErr++; }
  if (!c.status) { bad(`候选人 ${c.name} 缺 status`); groupErr++; }
  if (!GROUPS.includes(c.g)) { bad(`候选人 ${c.name} 的 g="${c.g}" 不合法`); groupErr++; }
});
if (!groupErr) {
  const counts = GROUPS.map(g => `${g}=${CANDIDATES.filter(c => c.g === g).length}`).join(' ');
  ok(`候选人 ${CANDIDATES.length} 人，分组合法（${counts}）`);
}

/* 3. 流转图流出量 vs 指标条 */
const outflow = {};
FLOW.links.forEach(l => { outflow[l.source] = (outflow[l.source] || 0) + l.value; });
const totalOut = Object.values(outflow).reduce((s, v) => s + v, 0);
const declaredPool = Number(String(LINKS[0].num).replace(/[^\d]/g, ''));
if (declaredPool && totalOut !== declaredPool) {
  bad(`流转图流出合计 ${totalOut} 人，但指标条写的是 ${declaredPool} 人 —— 对不上`);
} else {
  ok(`流转图流出 ${totalOut} 人，与指标条一致`);
}

/* 4. link 的端点都在 nodes 里 */
const nodeNames = new Set(FLOW.nodes.map(n => n.name));
let linkErr = 0;
FLOW.links.forEach(l => {
  if (!nodeNames.has(l.source)) { bad(`流转 link 的 source「${l.source}」不在 nodes 里`); linkErr++; }
  if (!nodeNames.has(l.target)) { bad(`流转 link 的 target「${l.target}」不在 nodes 里`); linkErr++; }
});
if (!linkErr) ok(`流转图 ${FLOW.nodes.length} 节点 / ${FLOW.links.length} 条流带，端点全部有效`);

/* 5. kpis 六项齐全 */
const need = KPI_DEFS.map(d => d.key);
let kpiErr = 0;
Object.entries(WEEKS).forEach(([k, w]) => {
  if (!w.kpis) return;
  need.forEach(n => {
    if (!w.kpis[n]) { bad(`${k} 缺 kpi「${n}」`); kpiErr++; }
    else if (typeof w.kpis[n].v !== 'number') { bad(`${k} 的 ${n}.v 不是数字`); kpiErr++; }
  });
});
if (!kpiErr) ok(`每周 kpis 六项齐全`);

/* 6. 渠道之和 = resume */
let srcErr = 0;
Object.entries(WEEKS).forEach(([k, w]) => {
  if (!w.kpis) return;
  const sum = (w.source || []).reduce((s, x) => s + x.value, 0);
  if (sum !== w.kpis.resume.v) {
    bad(`${k} 的渠道合计 ${sum} 人次，但 resume 写的是 ${w.kpis.resume.v}`); srcErr++;
  }
});
if (!srcErr) ok(`每周渠道拆分之和与简历总量一致`);

/* 7. delta 与相邻周实际差值 */
const keys = Object.keys(WEEKS).filter(k => WEEKS[k].kpis);
let deltaErr = 0;
for (let i = 1; i < keys.length; i++) {
  const prev = WEEKS[keys[i - 1]].kpis;
  const cur = WEEKS[keys[i]].kpis;
  need.forEach(n => {
    const d = cur[n].delta;
    if (d === null || d === undefined) return;
    if (n === 'onboard' || n === 'pool') {
      const actual = cur[n].v - prev[n].v;
      if (actual !== d) { bad(`${keys[i]}.${n} 的 delta 写 ${d} 人，实际差 ${actual} 人`); deltaErr++; }
    } else {
      if (!prev[n].v) return;
      const actual = Math.round((cur[n].v - prev[n].v) / prev[n].v * 1000) / 10;
      if (Math.abs(actual - d) > 0.15) {
        bad(`${keys[i]}.${n} 的 delta 写 ${d}%，实际 ${actual}%`); deltaErr++;
      }
    }
  });
}
if (!deltaErr) ok(`周环比与实际差值一致`);

if (fail) {
  console.error(`\n共 ${fail} 处数据问题`);
  process.exit(1);
}
console.log('\n数据自洽检查全部通过');
