/* =========================================================================
   招聘漏斗 · 周度可视化面板 — 数据层
   -------------------------------------------------------------------------
   想接真实数据，只需要替换下面三个常量：WEEKS、KPI_DEFS、CANDIDATES。
   渲染逻辑全部是数据驱动的，不需要改一行。

   ⚠️ 本文件内所有候选人、部门、数字均为虚构，仅用于演示面板结构与交互。
   ========================================================================= */

/* -------------------------------------------------------------------------
   WEEKS — 每周一份快照
   -------------------------------------------------------------------------
   kpis   六个环节的数量 + 一句话说明 + 周环比（null 表示基准周）
   source 当周简历进入 / 推荐按渠道拆分的结构
   flow   跨周流转的桑基图（仅需要相邻两周时用）
   summary 周度汇总表的四列补充信息
   ------------------------------------------------------------------------- */
const WEEKS = {
  W42: {
    tag: 'W42 完整周 · 10/12–10/18',
    range: '10/12 – 10/18',
    kpis: {
      resume:    { v: 17, sub: '官网投递 8 · 内推 6 · 招聘平台 3', delta: null },
      interview: { v: 24, sub: '覆盖 20 人 · 电话初筛 3 通 / 1 有效', delta: null },
      second:    { v: 5,  sub: '面试→二面 25.0%', delta: null },
      offer:     { v: 2,  sub: '二面→Offer 40.0%', delta: null },
      onboard:   { v: 0,  sub: 'Offer 2 人，下周到岗', delta: null },
      pool:      { v: 12, sub: '已建档候选人 · 基准周', delta: null }
    },
    source: [
      { name: '官网投递', value: 8 },
      { name: '内部推荐', value: 6 },
      { name: '招聘平台', value: 3 }
    ],
    summary: { interviewNote: '', status: 'full' }
  },

  W43: {
    tag: 'W43 进行中 · 数据截至 10/19',
    range: '10/19 – 10/25',
    cutAt: '10/19',
    kpis: {
      resume:    { v: 9, sub: '校园渠道 4 · 内推 3 · 招聘平台 2', delta: -47.1 },
      interview: { v: 8, sub: '完成 8 场 · 另有 3 场待面', delta: -66.7 },
      second:    { v: 2, sub: '面试→二面 25.0%', delta: -60.0 },
      offer:     { v: 0, sub: '二面→Offer 0.0% · 本周无新增', delta: -100 },
      onboard:   { v: 2, sub: '承接 W42 的 2 个 Offer', delta: 2 },
      pool:      { v: 15, sub: '承接 6 人 + 新增 9 人次', delta: 3 }
    },
    source: [
      { name: '校园渠道', value: 4 },
      { name: '内部推荐', value: 3 },
      { name: '招聘平台', value: 2 }
    ],
    summary: { interviewNote: '(+3 待面)', status: 'partial' }
  },

  W44: {
    tag: 'W44 待生成',
    range: '10/26 – 11/01',
    kpis: null,
    source: [],
    summary: { interviewNote: '', status: 'empty' }
  }
};

/* 六个环节的定义，顺序即展示顺序 */
const KPI_DEFS = [
  { key: 'resume',    label: '简历进入 / 推荐', unit: '人次' },
  { key: 'interview', label: '面试场次',        unit: '场' },
  { key: 'second',    label: '进入二面 / 复试', unit: '人' },
  { key: 'offer',     label: '新增 Offer',      unit: '人' },
  { key: 'onboard',   label: '本周到岗',        unit: '人' },
  { key: 'pool',      label: '流程内候选人',    unit: '人' }
];

/* -------------------------------------------------------------------------
   CANDIDATES — 候选人跨周状态
   -------------------------------------------------------------------------
   g（分组）决定筛选项与配色：
     done 已到岗 / flow 在流程 / wait 待跟进 / lost 已流失
   ------------------------------------------------------------------------- */
const CANDIDATES = [
  // —— 已到岗 ——
  { name: '林嘉禾', dept: '后端开发',   w42: '面试 → 二面通过 → Offer', w43: '10/19 到岗',                 status: '已到岗', g: 'done' },
  { name: '周予安', dept: '后端开发',   w42: 'Offer',                   w43: '10/19 到岗',                 status: '已到岗', g: 'done' },

  // —— 已流失 ——
  { name: '苏念',   dept: '产品经理',   w42: '二面 / 复试',             w43: '放弃（薪资未达成）',          status: '已流失', g: 'lost' },
  { name: '郑亦然', dept: '—',          w42: '面试 · 未通过',           w43: '—',                          status: '已流失', g: 'lost' },
  { name: '何知远', dept: '—',          w42: '面试 · 未通过',           w43: '—',                          status: '已流失', g: 'lost' },
  { name: '唐婉清', dept: '—',          w42: '面试 · 未通过',           w43: '—',                          status: '已流失', g: 'lost' },

  // —— 在流程 ——
  { name: '许泽宇', dept: '算法工程',   w42: '二面 / 复试',             w43: '10/19 二面（线上）',          status: '二面中',   g: 'flow' },
  { name: '梁书砚', dept: '前端开发',   w42: '—',                      w43: '新增 → 10/19 面试 → 待确认',  status: '面试确认', g: 'flow' },
  { name: '孟星野', dept: '数据分析',   w42: '—',                      w43: '10/19 面试完成',              status: '面试后',   g: 'flow' },
  { name: '黎听澜', dept: '数据分析',   w42: '—',                      w43: '10/19 面试完成',              status: '面试后',   g: 'flow' },
  { name: '段清和', dept: '数据分析',   w42: '—',                      w43: '10/19 面试完成',              status: '面试后',   g: 'flow' },
  { name: '范梓涵', dept: '算法工程',   w42: '—',                      w43: '10/19 面试完成',              status: '面试后',   g: 'flow' },
  { name: '江砚白', dept: '测试工程',   w42: '—',                      w43: '10/19 面试完成',              status: '面试后',   g: 'flow' },
  { name: '邵行之', dept: '测试工程',   w42: '—',                      w43: '10/19 面试完成',              status: '面试后',   g: 'flow' },
  { name: '崔沐阳', dept: '校招实习',   w42: '—',                      w43: '新增 → 电话初筛 → 10/20 待面', status: '待面',    g: 'flow' },
  { name: '严嘉树', dept: '校招实习',   w42: '—',                      w43: '新增 → 电话初筛 → 10/20 待面', status: '待面',    g: 'flow' },
  { name: '白允中', dept: '校招实习',   w42: '—',                      w43: '新增 → 10/20 待面',           status: '待面',    g: 'flow' },

  // —— 待跟进 ——
  { name: '顾宛宁', dept: '后端开发',   w42: '二面 / 复试',             w43: '结果待补',                    status: '待结果',   g: 'wait' },
  { name: '邹以宁', dept: '—',          w42: '二面 / 复试',             w43: '暂无新记录',                  status: '待跟进',   g: 'wait' },
  { name: '倪清让', dept: '—',          w42: '现场面试',                w43: '结果待补',                    status: '待结果',   g: 'wait' },
  { name: '路知微', dept: '财务线',     w42: '电话初筛有效',            w43: '待约面',                      status: '待约面',   g: 'wait' },
  { name: '施雨桐', dept: '财务线',     w42: '待约面',                  w43: '待约面',                      status: '待约面',   g: 'wait' },
  { name: '苗向晚', dept: '校招实习',   w42: '—',                      w43: '新增，待安排',                status: '待跟进',   g: 'wait' },
  { name: '金砚舟', dept: '产品经理',   w42: '—',                      w43: '新增（内推），待安排',        status: '待跟进',   g: 'wait' }
];

/* 跨周流转：上一周各阶段的候选人，在这一周去了哪里。
   数值总和应等于上周流程内人数（12）。 */
const FLOW = {
  from: 'W42',
  to: 'W43',
  nodes: [
    { name: 'W42 Offer',           color: '#2563eb' },
    { name: 'W42 二面 / 复试',     color: '#38bdf8' },
    { name: 'W42 面试未通过',      color: '#475569' },
    { name: 'W42 现场面试',        color: '#7c8db5' },
    { name: 'W42 待约面',          color: '#8b5cf6' },
    { name: 'W43 到岗',            color: '#34d399' },
    { name: 'W43 继续二面',        color: '#22d3ee' },
    { name: 'W43 待结果 / 待跟进', color: '#fbbf24' },
    { name: 'W43 待约面',          color: '#a78bfa' },
    { name: 'W43 流失',            color: '#ef4444' }
  ],
  links: [
    { source: 'W42 Offer',          target: 'W43 到岗',            value: 2 },
    { source: 'W42 二面 / 复试',    target: 'W43 继续二面',        value: 1 },
    { source: 'W42 二面 / 复试',    target: 'W43 待结果 / 待跟进', value: 2 },
    { source: 'W42 二面 / 复试',    target: 'W43 流失',            value: 1 },
    { source: 'W42 面试未通过',     target: 'W43 流失',            value: 3 },
    { source: 'W42 现场面试',       target: 'W43 待结果 / 待跟进', value: 1 },
    { source: 'W42 待约面',         target: 'W43 待约面',          value: 2 }
  ]
};

/* 顶部四个跨周指标条 */
const LINKS = [
  { num: '12',    txt: '上周在流程候选人<br><b>已建档、可跨周追踪</b>' },
  { num: '66.7%', txt: '跨周承接率<br><b>8 / 12 人</b> 仍在流程或已到岗' },
  { num: '2 / 2', txt: '上周 Offer → 本周到岗<br><b>100% 到岗</b>' },
  { num: '+9',    txt: '本周新增简历 / 推荐<br><b>9 人次</b>，其中 8 人已入面' }
];
