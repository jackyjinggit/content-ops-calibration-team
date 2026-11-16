/* 网页规则引擎验收：直接从 index.html 抽出函数真跑，验证定稿回归用例与边界陷阱 */
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('F:/research_workspace/content-calibration-team/index.html', 'utf8');
// 抽取引擎段：从 RULES 定义到 switchMode 之前（computeMetrics / judge 纯逻辑）
const start = html.indexOf('const RULES =');
const end = html.indexOf('/* ============ 示例数据');
let code = html.slice(start, end);
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(code, ctx);

function run(name, rows, expectedCards, detail) {
  const metrics = rows.map(ctx.computeMetrics);
  const cards = ctx.judge(metrics);
  const got = cards.length;
  const ok = got === expectedCards;
  console.log(`\n=== ${name} === 期望 ${expectedCards} 张 / 实际 ${got} 张 -> ${ok ? 'PASS' : 'FAIL'}`);
  cards.forEach(c => console.log(`  [${c.rule}] ${c.platform} P${c.pri} | ${c.evidence}`));
  if (detail) detail(cards, metrics, ok);
  return ok;
}

let allOk = true;

// 回归用例：5 平台，期望 4 张（甲2/乙0/丙1/丁1/戊跳过）
const regression = [
  {platform:'平台甲',views:2000,likes:0,comments:0,followers:500},
  {platform:'平台乙',views:800,likes:60,comments:20,followers:5000},
  {platform:'平台丙',views:400,likes:6,comments:2,followers:50},
  {platform:'平台丁',views:1000,likes:0,comments:40,followers:800},
  {platform:'平台戊',status:'failed'}
];
allOk &= run('回归用例 5 平台', regression, 4, (cards, metrics, ok) => {
  const a = metrics.find(m=>m.platform==='平台甲');
  const b = metrics.find(m=>m.platform==='平台乙');
  const c = metrics.find(m=>m.platform==='平台丙');
  const d = metrics.find(m=>m.platform==='平台丁');
  const e = metrics.find(m=>m.platform==='平台戊');
  const checks = [
    ['甲命中R1+R3', a.raw===0 && cards.some(x=>x.platform==='平台甲'&&x.rule==='R1') && cards.some(x=>x.platform==='平台甲'&&x.rule==='R3')],
    ['乙0卡且非漏补R4', !cards.some(x=>x.platform==='平台乙') && !cards.some(x=>x.rule==='R4')],
    ['丙恰0.02不触发R1只出R2', a && c.raw===0.02 && !cards.some(x=>x.platform==='平台丙'&&x.rule==='R1') && cards.some(x=>x.platform==='平台丙'&&x.rule==='R2')],
    ['丁出R3不出R1', d.raw===0.04 && cards.some(x=>x.platform==='平台丁'&&x.rule==='R3') && !cards.some(x=>x.platform==='平台丁'&&x.rule==='R1')],
    ['戊失败跳过不出卡', e.availability==='failed' && !cards.some(x=>x.platform==='平台戊')]
  ];
  checks.forEach(([n,v])=>{ console.log(`  ${v?'✓':'✗'} ${n}`); allOk &= v; });
});

// 边界用例：0.019975 必触发 vs 恰好 0.02 不触发
const boundary = [
  {platform:'边界甲',views:40000,likes:799,comments:0,followers:500},
  {platform:'边界乙',views:10000,likes:200,comments:0,followers:300}
];
allOk &= run('边界用例 原始值判定', boundary, 1, (cards, metrics, ok) => {
  const a = metrics.find(m=>m.platform==='边界甲');
  const b = metrics.find(m=>m.platform==='边界乙');
  const checks = [
    ['甲原始0.019975触发R1', Math.abs(a.raw-0.019975)<1e-12 && cards.some(x=>x.platform==='边界甲'&&x.rule==='R1')],
    ['乙恰0.02不触发R1', b.raw===0.02 && !cards.some(x=>x.platform==='边界乙'&&x.rule==='R1')],
    ['展示值舍入但判定用原始', a.display==='0.0200' && a.raw<0.02]
  ];
  checks.forEach(([n,v])=>{ console.log(`  ${v?'✓':'✗'} ${n}`); allOk &= v; });
});

// R4 全局兜底：全零卡场景
const allZero = [{platform:'健康平台',views:800,likes:20,comments:12,followers:150}];
allOk &= run('全局兜底 R4', allZero, 1, (cards, metrics, ok) => {
  const v = cards.length===1 && cards[0].rule==='R4' && cards[0].platform==='全局';
  console.log(`  ${v?'✓':'✗'} 全批零卡才补 1 张全局卡`); allOk &= v;
});

// 缺字段不补零
const missing = [{platform:'缺字段平台',views:1000,likes:2}];
const mm = missing.map(ctx.computeMetrics);
const missOk = mm[0].availability==='missing';
console.log(`\n=== 缺字段标未获取 === ${missOk?'PASS':'FAIL'}`);
allOk &= missOk;

console.log(`\n########## 总判定：${allOk?'ALL_PASS':'FAIL'} ##########`);
process.exit(allOk ? 0 : 1);
