/* ===========================
   🍅 工作台 脚本
   - 日历渲染
   - 待办打勾 + localStorage 持久化
   - 4 个模块的数据输入与展示
   =========================== */

// -------- 工具 --------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const fmt = n => '¥' + Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

// -------- 状态 --------
const STATE = {
  date: new Date(), // 动态今天
  todos: JSON.parse(localStorage.getItem('wb_todos') || '{}'),
  weight: JSON.parse(localStorage.getItem('wb_weight') || '[]'),
  expenses: JSON.parse(localStorage.getItem('wb_expenses') || '[]'),
  savings: JSON.parse(localStorage.getItem('wb_savings') || '{"deposits":[],"goal":{"name":"养老基金","target":30000}}'),
  videos: JSON.parse(localStorage.getItem('wb_videos') || '[]'),
  openmind: JSON.parse(localStorage.getItem('wb_openmind') || '[]'),
  english: JSON.parse(localStorage.getItem('wb_english') || '{}')
};

const persist = (k, v) => localStorage.setItem('wb_' + k, JSON.stringify(v));

// -------- 行程模板（来自 config.json） --------
const SCHEDULE = [
  { time: '07:00', tag: '🥗', title: '起床 / 喝水 / 简单拉伸', duration: '10min' },
  { time: '07:30', tag: '🥗', title: '今日三餐减脂餐（早/午/晚，1700 kcal）', duration: '30min' },
  { time: '08:30', tag: '📱', title: '抖音美食热点 + 选题建议', duration: '10min' },
  { time: '09:00', tag: '📖', title: '英语学习任务', duration: '20min' },
  { time: '12:00', tag: '🥗', title: '午餐打卡（备注/拍照）', duration: '5min' },
  { time: '15:00', tag: '📱', title: '拍摄 / 剪辑今日视频', duration: '60min' },
  { time: '18:00', tag: '🥗', title: '晚餐打卡 + 运动提醒', duration: '5min' },
  { time: '20:00', tag: '👛', title: '录入今日开支 + 存款更新', duration: '5min' },
  { time: '21:00', tag: '📱', title: '发布今日视频（按计划）', duration: '10min' }
];

// -------- 日历 --------
function renderCalendar() {
  const el = $('#calendar');
  el.innerHTML = '';
  const d = STATE.date;
  const y = d.getFullYear(), m = d.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const lastDate = new Date(y, m + 1, 0).getDate();
  const prevLast = new Date(y, m, 0).getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  weekdays.forEach(w => {
    const c = document.createElement('div');
    c.className = 'cal-cell weekday';
    c.textContent = w;
    el.appendChild(c);
  });

  for (let i = firstDay - 1; i >= 0; i--) {
    const c = document.createElement('div');
    c.className = 'cal-cell dim';
    c.textContent = prevLast - i;
    el.appendChild(c);
  }
  for (let day = 1; day <= lastDate; day++) {
    const c = document.createElement('div');
    c.className = 'cal-cell';
    if (day === d.getDate()) c.classList.add('today');
    c.textContent = day;
    el.appendChild(c);
  }
  const trailing = (7 - ((firstDay + lastDate) % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    const c = document.createElement('div');
    c.className = 'cal-cell dim';
    c.textContent = i;
    el.appendChild(c);
  }

  // 标题
  const wkMap = ['日','一','二','三','四','五','六'];
  $('#todayLabel').textContent =
    `${y}-${String(m+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} 周${wkMap[d.getDay()]}`;
}

// -------- 行程列表 --------
function renderTodos() {
  const list = $('#todayTodos');
  list.innerHTML = '';
  const dateKey = todayKey(STATE.date);
  SCHEDULE.forEach((s, idx) => {
    const li = document.createElement('li');
    li.className = 'todo-item';
    const done = STATE.todos[dateKey + '_' + idx];
    if (done) li.classList.add('done');
    li.innerHTML = `
      <span class="todo-check ${done ? 'checked' : ''}" data-idx="${idx}">${done ? '✓' : ''}</span>
      <span class="todo-time">${s.time}</span>
      <span class="todo-tag">${s.tag}</span>
      <span class="todo-title">${s.title}</span>
      <span class="todo-duration">${s.duration}</span>
    `;
    list.appendChild(li);
  });
  $$('.todo-check').forEach(el => {
    el.addEventListener('click', () => {
      const idx = +el.dataset.idx;
      const key = todayKey(STATE.date) + '_' + idx;
      STATE.todos[key] = !STATE.todos[key];
      persist('todos', STATE.todos);
      renderTodos();
    });
  });
}

// -------- 模块渲染 --------
const MODULES = {
  weight: renderWeight,
  douyin: renderDouyin,
  english: renderEnglish,
  finance: renderFinance,
  openmind: renderOpenMind,
  weekly: renderWeekly
};

function renderWeight() {
  const host = $('#moduleHost');
  const last = STATE.weight.slice(-4);
  const latest = last.length ? last[last.length - 1] : null;
  const prev = last.length > 1 ? last[last.length - 2] : null;
  const delta = latest && prev ? (latest.kg - prev.kg).toFixed(1) : '—';

  host.innerHTML = `
    <div class="module" id="m-weight">
      <h3>🥗 减肥计划</h3>
      <div class="grid grid-3" style="margin-bottom:14px">
        <div class="stat">
          <span class="stat-label">本周最新体重</span>
          <span class="stat-value accent">${latest ? latest.kg + ' kg' : '—'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">较上次变化</span>
          <span class="stat-value">${delta} kg</span>
        </div>
        <div class="stat">
          <span class="stat-label">本周运动完成</span>
          <span class="stat-value">${countDoneWorkouts()}/7</span>
        </div>
      </div>

      <div class="meal-day-summary">
        <div class="meal-day-total">
          <span class="cal-big">${TODAY_MEALS.total_calorie}</span>
          <span class="cal-unit">kcal / 天</span>
        </div>
        <div class="meal-day-detail">${TODAY_MEALS.daily_summary}</div>
      </div>

      ${TODAY_MEALS.meals.map(m => `
      <div class="meal-card" style="margin-bottom:14px">
        <div class="meal-card-head">
          <h4>${m.icon} ${m.slot} · ${m.title}</h4>
          <span class="meal-cal">${m.calorie} kcal</span>
        </div>
        <div class="meal-mac">
          <span>碳水 ${m.macros.carb}g</span>
          <span>蛋白质 ${m.macros.protein}g</span>
          <span>脂肪 ${m.macros.fat}g</span>
          <span class="meal-time">⏰ ${m.time}</span>
        </div>
        <div style="font-size:12px;margin-top:8px"><b>食材：</b></div>
        <ul>${m.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
        <div style="font-size:12px;margin-top:6px"><b>步骤：</b></div>
        <ol>${m.steps.map(s => `<li>${s}</li>`).join('')}</ol>
        <div style="font-size:11px;color:var(--ink-mute);margin-top:4px">💡 ${m.tip}</div>
      </div>
      `).join('')}

      <div class="row" style="gap:18px">
        <div style="flex:1;min-width:240px">
          <h4 style="font-size:13px;margin:0 0 8px">📝 录入体重（建议周日晚上）</h4>
          <div class="row">
            <input id="wDate" type="date" value="${todayKey(STATE.date)}" />
            <input id="wKg" type="number" step="0.1" placeholder="kg" style="max-width:90px" />
            <input id="wNote" type="text" placeholder="备注（如：周末吃了一顿火锅）" style="flex:1" />
            <button id="wSave">保存</button>
          </div>
        </div>
      </div>

      <h4 style="font-size:13px;margin:18px 0 6px">📈 体重记录</h4>
      <ul class="list">
        ${STATE.weight.length === 0 ? '<li style="color:var(--ink-mute)">还没有记录，今晚 21:00 记得称重</li>' : ''}
        ${STATE.weight.slice().reverse().slice(0, 5).map(w => `
          <li>
            <span>${w.date} <b>${w.kg} kg</b></span>
            <span class="pill">${w.note || '—'}</span>
          </li>
        `).join('')}
      </ul>

      <h4 style="font-size:13px;margin:18px 0 6px">🏃 本周运动计划</h4>
      <ul class="list">
        ${EXERCISE_PLAN.map(e => `
          <li>
            <span><b>${e.day}</b> · ${e.type}</span>
            <span class="pill ${e.tag === 'rest' ? '' : 'accent'}">${e.duration}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  $('#wSave').addEventListener('click', () => {
    const date = $('#wDate').value || todayKey(STATE.date);
    const kg = parseFloat($('#wKg').value);
    const note = $('#wNote').value.trim();
    if (!kg) { alert('请输入体重数字'); return; }
    STATE.weight.push({ date, kg, note });
    STATE.weight.sort((a, b) => a.date.localeCompare(b.date));
    persist('weight', STATE.weight);
    renderWeight();
  });
}

function countDoneWorkouts() {
  // 简化：根据本周体重记录日推算
  return STATE.weight.length;
}

let TODAY_MEALS = {
  date: '2026-07-31',
  total_calorie: 1700,
  calorie_target: '1600-1800',
  daily_summary: '全天 1700 kcal · 碳水 172g / 蛋白质 100g / 脂肪 46g · 211 比例',
  meals: [
    {
      slot: '早餐',
      icon: '🌅',
      time: '07:30',
      title: '隔夜燕麦杯',
      calorie: 380,
      macros: { carb: 55, protein: 12, fat: 8 },
      ingredients: [
        '燕麦片 40g',
        '牛奶 200ml（或无糖豆奶）',
        '香蕉半根（切片）',
        '蓝莓 30g',
        '奇亚籽 5g'
      ],
      steps: [
        '燕麦+奇亚籽放入密封罐，倒入牛奶没过燕麦',
        '盖好放冰箱冷藏过夜（至少 4 小时）',
        '早晨取出，铺上香蕉片和蓝莓即可'
      ],
      tip: '前一晚 22:00 做好放冰箱，第二天开盖即吃，零烹饪。'
    },
    {
      slot: '午餐',
      icon: '☀️',
      time: '12:00',
      title: '泰式虾仁藜麦碗',
      calorie: 620,
      macros: { carb: 65, protein: 35, fat: 18 },
      ingredients: [
        '藜麦 80g（干重，蒸熟约 240g）',
        '虾仁 120g（约 12 只）',
        '彩椒 100g / 黄瓜 60g / 紫甘蓝 30g',
        '牛油果 1/4 个（约 40g）',
        '泰式酱汁：鱼露 5ml + 青柠汁 10ml + 蒜末 + 小米辣 + 代糖'
      ],
      steps: [
        '藜麦淘洗后加 1.2 倍水，蒸 15 分钟至开花',
        '虾仁用黑胡椒+海盐腌 3 分钟，少油煎至变红',
        '彩椒/黄瓜/紫甘蓝切丝铺底',
        '依次放藜麦、虾仁、牛油果片，淋泰式酱汁拌匀'
      ],
      tip: '可一次做 2 份冷藏，第二天直接吃（虾仁微波 30 秒回温）。'
    },
    {
      slot: '加餐',
      icon: '🍎',
      time: '15:00',
      title: '希腊酸奶 + 杏仁',
      calorie: 200,
      macros: { carb: 12, protein: 15, fat: 10 },
      ingredients: [
        '无糖希腊酸奶 150g',
        '杏仁 15g（约 10 颗）'
      ],
      steps: [
        '酸奶倒入碗中，撒上杏仁即可',
        '可加少许蜂蜜（5g 以内）调味'
      ],
      tip: '下午 15:00 或运动后吃，补充蛋白质。'
    },
    {
      slot: '晚餐',
      icon: '🌙',
      time: '18:00',
      title: '鸡胸彩椒碗',
      calorie: 500,
      macros: { carb: 40, protein: 38, fat: 10 },
      ingredients: [
        '鸡胸肉 150g（约 1.5 掌）',
        '彩椒（红/黄）共 200g',
        '土豆 120g（1 小拳）',
        '橄榄油 5g',
        '黑胡椒、海盐、蒜末少许'
      ],
      steps: [
        '土豆切丁蒸 8 分钟至软糯',
        '鸡胸切丁用黑胡椒+海盐腌 5 分钟，少油轻煎至两面金黄',
        '彩椒切圈铺底，依次放入土豆丁、鸡胸丁',
        '撒蒜末、淋几滴橄榄油即可'
      ],
      tip: '可微波 2 分钟让彩椒断生更易入口；备餐可一次做 2 份冷藏。'
    }
  ]
};

const EXERCISE_PLAN = [
  { day: '周一', type: '帕梅拉 + 拉伸', duration: '30min', tag: 'cardio' },
  { day: '周二', type: '力量训练', duration: '20min', tag: 'strength' },
  { day: '周三', type: '帕梅拉 + 拉伸', duration: '30min', tag: 'cardio' },
  { day: '周四', type: '力量训练', duration: '20min', tag: 'strength' },
  { day: '周五', type: '帕梅拉 + 拉伸', duration: '30min', tag: 'cardio' },
  { day: '周六', type: '户外散步/瑜伽', duration: '40min', tag: 'rest' },
  { day: '周日', type: '拉伸 + 休息', duration: '15min', tag: 'rest' }
];

// -------- 抖音运营 --------
function renderDouyin() {
  const host = $('#moduleHost');
  host.innerHTML = `
    <div class="module" id="m-douyin">
      <h3>📱 账号运营（抖音·做饭类）</h3>
      <div class="grid grid-3" style="margin-bottom:14px">
        <div class="stat">
          <span class="stat-label">本周已发视频</span>
          <span class="stat-value">${STATE.videos.filter(v => v.date.startsWith(getWeekKey())).length}</span>
        </div>
        <div class="stat">
          <span class="stat-label">本周总播放</span>
          <span class="stat-value accent">${fmtNum(sumWeekly('views'))}</span>
        </div>
        <div class="stat">
          <span class="stat-label">本周总点赞</span>
          <span class="stat-value">${fmtNum(sumWeekly('likes'))}</span>
        </div>
      </div>

      <h4 style="font-size:13px;margin:18px 0 6px">🔥 今日热点（${HOT.date}）</h4>
      <div class="topic-card">
        <div style="font-size:12px;color:var(--ink-soft)">${HOT.summary}</div>
      </div>
      ${HOT.hot_topics.map(t => `
        <div class="topic-card">
          <div class="topic-tag">${t.tag}</div>
          <div class="topic-meta">${t.views} · 趋势：${t.trend}</div>
          <div class="topic-angle">📌 ${t.angle}</div>
        </div>
      `).join('')}
      <div class="topic-card" style="background:#eef2e0">
        <div style="font-size:12px"><b>🎵 音频建议：</b>${HOT.audio_suggestion}</div>
        <div style="font-size:12px;margin-top:6px"><b>📅 本周拍摄计划：</b></div>
        <ol style="margin:6px 0;padding-left:18px">
          ${HOT.recommended_shoot_this_week.map(s => `<li>${s}</li>`).join('')}
        </ol>
      </div>

      <h4 style="font-size:13px;margin:18px 0 6px">🎬 录入视频数据</h4>
      <div class="row">
        <input id="vTitle" type="text" placeholder="视频标题" style="flex:1" />
        <input id="vDate" type="date" value="${todayKey(STATE.date)}" style="max-width:160px" />
        <input id="vViews" type="number" placeholder="播放量" style="max-width:100px" />
        <input id="vLikes" type="number" placeholder="点赞" style="max-width:90px" />
        <input id="vComments" type="number" placeholder="评论" style="max-width:90px" />
        <button id="vSave">保存</button>
      </div>

      <h4 style="font-size:13px;margin:18px 0 6px">📊 历史视频</h4>
      <ul class="list">
        ${STATE.videos.length === 0 ? '<li style="color:var(--ink-mute)">还没有视频记录</li>' : ''}
        ${STATE.videos.slice().reverse().map(v => `
          <li>
            <span><b>${v.date}</b> · ${v.title}</span>
            <span>
              <span class="pill">▶ ${fmtNum(v.views)}</span>
              <span class="pill accent">❤ ${fmtNum(v.likes)}</span>
              <span class="pill warn">💬 ${fmtNum(v.comments)}</span>
            </span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  $('#vSave').addEventListener('click', () => {
    const title = $('#vTitle').value.trim();
    const date = $('#vDate').value;
    const views = +$('#vViews').value || 0;
    const likes = +$('#vLikes').value || 0;
    const comments = +$('#vComments').value || 0;
    if (!title) { alert('请输入视频标题'); return; }
    STATE.videos.push({ date, title, views, likes, comments });
    STATE.videos.sort((a, b) => a.date.localeCompare(b.date));
    persist('videos', STATE.videos);
    renderDouyin();
  });
}

let HOT = {
  date: '2026-07-31',
  summary: '三伏天 + 国家卫健委下场 + 减脂话题持续走高；本周适合做"官方食谱平价复刻"或"跟着瘦子吃一天"挑战复刻。',
  hot_topics: [
    { tag: '#国家出手教减肥了#', views: '12亿+', trend: '上升中', angle: '可拍"国家1200千卡食谱 × 我家的平价复刻"——东北/华东/华南任选一地区做 3 道菜，单条解释为什么这个搭配科学。' },
    { tag: '#跟着瘦子吃饭#', views: '5万+讨论/多条百万播放', trend: '爆发期', angle: '复刻"瘦子一天饮食"挑战 vlog：早/午/晚 3 餐全展示，加字幕吐槽分量，最后给观众一个"正常吃也能瘦的改良版"。' },
    { tag: '#贵州蘸水菜# / #省汤#', views: '5亿+', trend: '稳定爆款', angle: '夏夜解暑凉菜 vlog，重点放在"灵魂蘸水"调法（糊辣椒+蒜+葱+酱油+醋），可挂车调味包。' },
    { tag: '#泰式椒麻鸡#', views: '12.7亿+', trend: '夏季续命款', angle: '鸡腿去骨 + 万能蘸料公式，把那 8 味酱汁拍成 ASMR 慢动作，作为"低卡凉菜系列"第二条。' },
    { tag: '#关晓彤同款彩椒碗#', views: '1亿+', trend: '稳定', angle: '作为本账号"减脂餐入门第一条置顶"，重点拍 211 比例科普 + 一锅出教程。' }
  ],
  audio_suggestion: '本季美食视频主流：舒缓鼓点 BGM（避免 DJ 节奏），前 3 秒使用"画面 + 大字幕反差"hook，例如「这碗 260 大卡，吃撑也不胖」。',
  recommended_shoot_this_week: [
    '周一/二：彩椒碗置顶视频（3 分钟左右，详细科普 211 比例）',
    '周三/四：泰式椒麻鸡 vlog（拍摄+剪辑 60 分钟）',
    '周五/六：跟着瘦子吃一天挑战（vlog 形式，早午晚 3 段拼接）'
  ]
};

function getWeekKey() {
  // 返回本周起始 ISO yyyy-mm-dd（周一开始）
  const d = new Date(STATE.date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}
function sumWeekly(field) {
  const wk = getWeekKey();
  return STATE.videos.filter(v => v.date >= wk).reduce((s, v) => s + (v[field] || 0), 0);
}
function fmtNum(n) { return Number(n).toLocaleString(); }

// -------- 英语学习 --------
function renderEnglish() {
  const host = $('#moduleHost');
  const done = STATE.english[todayKey(STATE.date)];
  host.innerHTML = `
    <div class="module" id="m-english">
      <h3>📖 每天学习英语（09:00 推送）</h3>
      <div class="row" style="margin-bottom:14px">
        <div class="stat">
          <span class="stat-label">今日状态</span>
          <span class="stat-value" style="color:${done ? 'var(--green-deep)' : 'var(--ink-mute)'}">${done ? '✓ 已完成' : '○ 待开始'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">连续打卡</span>
          <span class="stat-value">${countStreak()} 天</span>
        </div>
        <div class="stat">
          <span class="stat-label">本月累计</span>
          <span class="stat-value">${Object.keys(STATE.english).length} 天</span>
        </div>
      </div>

      <h4 style="font-size:13px;margin:0 0 6px">🍳 烹饪相关口语（5 句）</h4>
      <ul class="list">
        ${ENGLISH.sentences.map(s => `
          <li style="flex-direction:column;align-items:flex-start;gap:2px">
            <div><b>${s.en}</b> · <span style="color:var(--ink-mute)">${s.phonetic}</span></div>
            <div style="font-size:12px;color:var(--ink-soft)">${s.cn}</div>
          </li>
        `).join('')}
      </ul>

      <h4 style="font-size:13px;margin:14px 0 6px">📚 今日 30 单词</h4>
      <div>
        ${ENGLISH.words.map(w => `
          <span class="english-word"><b>${w.en}</b> <i>${w.phonetic}</i> ${w.cn}</span>
        `).join('')}
      </div>

      <div class="core-sentence">
        <div style="font-size:11px;color:var(--green-deep);font-weight:600;letter-spacing:1px">今日核心口语</div>
        <div class="en">"${ENGLISH.core.en}"</div>
        <div class="cn">${ENGLISH.core.cn}</div>
      </div>

      <div class="row" style="margin-top:14px">
        <button id="eDone">${done ? '✓ 已打卡（再点取消）' : '标记今天完成'}</button>
        <button class="ghost" id="eNew">换一组</button>
      </div>
    </div>
  `;

  $('#eDone').addEventListener('click', () => {
    const k = todayKey(STATE.date);
    if (STATE.english[k]) delete STATE.english[k];
    else STATE.english[k] = true;
    persist('english', STATE.english);
    renderEnglish();
  });
  $('#eNew').addEventListener('click', () => {
    alert('新一组英语任务已就绪（可在脚本顶部 ENGLISH 中替换）');
  });
}

let ENGLISH = {
  sentences: [
    { en: "Bring a large pot of water to a rolling boil.", phonetic: '/brɪŋ ə lɑːrdʒ pɑt əv ˈwɔːtər tu ə ˈroʊlɪŋ bɔɪl/', cn: '把一大锅水烧到完全沸腾。' },
    { en: "Dice the chicken breast into bite-sized cubes.", phonetic: '/daɪs ðə ˈtʃɪkɪn brest ˈɪntu baɪt saɪzd kjubz/', cn: '把鸡胸肉切成一口大小的丁。' },
    { en: "Sauté the garlic until fragrant, about 30 seconds.", phonetic: '/sɔːˈteɪ ðə ˈɡɑːrlɪk ənˈtɪl ˈfreɪɡrənt/', cn: '蒜末炒出香味，大约 30 秒。' },
    { en: "Season with salt and pepper to taste.", phonetic: '/ˈsiːzn wɪð sɔːlt ənd ˈpɛpər tu teɪst/', cn: '按个人口味加盐和黑胡椒调味。' },
    { en: "Let it rest for 5 minutes before serving.", phonetic: '/lɛt ɪt rɛst fɔr faɪv ˈmɪnɪts bɪˈfɔr ˈsɜːrvɪŋ/', cn: '装盘前静置 5 分钟。' }
  ],
  words: [
    { en: 'simmer', phonetic: '/ˈsɪmər/', cn: '煨' },
    { en: 'sauté', phonetic: '/sɔːˈteɪ/', cn: '炒' },
    { en: 'whisk', phonetic: '/wɪsk/', cn: '打蛋' },
    { en: 'marinate', phonetic: '/ˈmærɪneɪt/', cn: '腌' },
    { en: 'garnish', phonetic: '/ˈɡɑːrnɪʃ/', cn: '装饰' },
    { en: 'drizzle', phonetic: '/ˈdrɪzl/', cn: '淋' },
    { en: 'preheat', phonetic: '/ˌpriːˈhiːt/', cn: '预热' },
    { en: 'al dente', phonetic: '/ɑːl ˈdɛnteɪ/', cn: '弹牙' },
    { en: 'to taste', phonetic: '/tu teɪst/', cn: '随口味' },
    { en: 'leftovers', phonetic: '/ˈlɛftoʊvərz/', cn: '剩菜' },
    { en: 'utensil', phonetic: '/juːˈtɛnsɪl/', cn: '厨具' },
    { en: 'skillet', phonetic: '/ˈskɪlɪt/', cn: '煎锅' },
    { en: 'measuring cup', phonetic: '/ˈmɛʒərɪŋ kʌp/', cn: '量杯' },
    { en: 'parchment', phonetic: '/ˈpɑːrtʃmənt/', cn: '烘焙纸' },
    { en: 'knead', phonetic: '/niːd/', cn: '揉面' },
    { en: 'proof', phonetic: '/pruːf/', cn: '发酵' },
    { en: 'fold', phonetic: '/foʊld/', cn: '翻拌' },
    { en: 'fluffy', phonetic: '/ˈflʌfi/', cn: '蓬松' },
    { en: 'tender', phonetic: '/ˈtɛndər/', cn: '嫩' },
    { en: 'crispy', phonetic: '/ˈkrɪspi/', cn: '酥脆' },
    { en: 'nutritious', phonetic: '/nuːˈtrɪʃəs/', cn: '有营养的' },
    { en: 'low-carb', phonetic: '/loʊ kɑːrb/', cn: '低碳水' },
    { en: 'portion', phonetic: '/ˈpɔːrʃn/', cn: '一份' },
    { en: 'wholesome', phonetic: '/ˈhoʊlsəm/', cn: '健康的' },
    { en: 'satisfying', phonetic: '/ˈsætɪsfaɪɪŋ/', cn: '满足的' },
    { en: 'cravings', phonetic: '/ˈkreɪvɪŋz/', cn: '嘴馋' },
    { en: 'indulge', phonetic: '/ɪnˈdʌldʒ/', cn: '放纵' },
    { en: 'moderation', phonetic: '/ˌmɑːdəˈreɪʃn/', cn: '适度' },
    { en: 'habit', phonetic: '/ˈhæbɪt/', cn: '习惯' },
    { en: 'discipline', phonetic: '/ˈdɪsɪplɪn/', cn: '自律' }
  ],
  core: { en: "Cook once, eat all week.", cn: '一次备餐，吃一整周。' }
};

function countStreak() {
  const dates = Object.keys(STATE.english).sort();
  if (!dates.length) return 0;
  let s = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] === todayKey(new Date(Date.now() - s * 86400000))) s++;
    else break;
  }
  return s;
}

// -------- 我的账户 --------
function renderFinance() {
  const host = $('#moduleHost');
  const today = todayKey(STATE.date);
  const todayExp = STATE.expenses.filter(e => e.date === today);
  const todayTotal = todayExp.reduce((s, e) => s + e.amount, 0);
  const monthTotal = STATE.expenses
    .filter(e => e.date.startsWith(today.slice(0, 7)))
    .reduce((s, e) => s + e.amount, 0);
  const savingsTotal = STATE.savings.deposits.reduce((s, d) => s + d.amount, 0);
  const goalPct = STATE.savings.goal.target
    ? Math.min(100, (savingsTotal / STATE.savings.goal.target) * 100).toFixed(1)
    : 0;

  host.innerHTML = `
    <div class="module" id="m-finance">
      <h3>👛 我的账户</h3>

      <div class="savings-display">
        <div class="label">存款池 · ${STATE.savings.goal.name}</div>
        <div class="amount">${fmt(savingsTotal)}</div>
        <div class="goal">目标 ${fmt(STATE.savings.goal.target)} · ${goalPct}%</div>
        <div class="progress-bar"><div style="width:${goalPct}%"></div></div>
      </div>

      <div class="grid grid-3" style="margin-bottom:14px">
        <div class="stat">
          <span class="stat-label">今日支出</span>
          <span class="stat-value">${fmt(todayTotal)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">本月支出</span>
          <span class="stat-value">${fmt(monthTotal)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">已存笔数</span>
          <span class="stat-value">${STATE.savings.deposits.length}</span>
        </div>
      </div>

      <h4 style="font-size:13px;margin:0 0 6px">💸 录入今日开支（20:00）</h4>
      <div class="row">
        <input id="exItem" type="text" placeholder="项目（如：午餐 - 凉皮）" style="flex:1" />
        <input id="exCat" type="text" placeholder="类别" style="max-width:120px" />
        <input id="exAmount" type="number" step="0.01" placeholder="金额" style="max-width:100px" />
        <button id="exSave">记账</button>
      </div>

      <h4 style="font-size:13px;margin:14px 0 6px">🏦 存入存款池</h4>
      <div class="row">
        <input id="dAmount" type="number" step="0.01" placeholder="金额" style="max-width:120px" />
        <input id="dNote" type="text" placeholder="来源（如：项目结款）" style="flex:1" />
        <button class="ghost" id="dSave">存入</button>
      </div>

      <div class="grid grid-2" style="margin-top:14px">
        <div>
          <h4 style="font-size:13px;margin:0 0 6px">今日记录</h4>
          <ul class="list">
            ${todayExp.length === 0 ? '<li style="color:var(--ink-mute)">今天还没有记账</li>' : ''}
            ${todayExp.map(e => `
              <li>
                <span>${e.item} <span class="pill">${e.cat}</span></span>
                <span><b>${fmt(e.amount)}</b></span>
              </li>
            `).join('')}
          </ul>
        </div>
        <div>
          <h4 style="font-size:13px;margin:0 0 6px">存款记录</h4>
          <ul class="list">
            ${STATE.savings.deposits.length === 0 ? '<li style="color:var(--ink-mute)">还没有存款</li>' : ''}
            ${STATE.savings.deposits.slice().reverse().map(d => `
              <li>
                <span>${d.date} · ${d.note}</span>
                <span><b>${fmt(d.amount)}</b></span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;

  $('#exSave').addEventListener('click', () => {
    const item = $('#exItem').value.trim();
    const cat = $('#exCat').value.trim() || '其他';
    const amount = parseFloat($('#exAmount').value);
    if (!item || !amount) { alert('请填项目与金额'); return; }
    STATE.expenses.push({ date: today, item, cat, amount });
    persist('expenses', STATE.expenses);
    renderFinance();
  });
  $('#dSave').addEventListener('click', () => {
    const amount = parseFloat($('#dAmount').value);
    const note = $('#dNote').value.trim() || '存款';
    if (!amount) { alert('请输入金额'); return; }
    STATE.savings.deposits.push({ date: today, amount, note });
    persist('savings', STATE.savings);
    renderFinance();
  });
}

// -------- 开智汇总 --------
function renderOpenMind() {
  const host = $('#moduleHost');
  host.innerHTML = `
    <div class="module" id="m-openmind">
      <h3>💡 开智汇总（财富认知 / 极简 / 成长）</h3>
      <p style="font-size:12px;color:var(--ink-soft);margin:0 0 12px">每周积累 1-2 条，支持长期回顾与复盘。</p>
      <div class="row" style="margin-bottom:14px">
        <input id="omTitle" type="text" placeholder="标题（如：钱是存出来的，不是省出来的）" style="flex:1" />
        <input id="omCat" type="text" placeholder="类别（存钱/极简/投资/成长）" style="max-width:160px" />
        <button id="omSave">添加</button>
      </div>
      <textarea id="omBody" placeholder="正文：写下你这一周的洞察、行动、引用..." style="width:100%"></textarea>
      <ul class="list" style="margin-top:14px">
        ${STATE.openmind.length === 0 ? '<li style="color:var(--ink-mute)">还没有记录</li>' : ''}
        ${STATE.openmind.slice().reverse().map(o => `
          <li style="flex-direction:column;align-items:flex-start;gap:4px">
            <div><b>${o.date}</b> · ${o.title} <span class="pill">${o.cat}</span></div>
            <div style="font-size:12.5px;color:var(--ink-soft)">${o.body}</div>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
  $('#omSave').addEventListener('click', () => {
    const title = $('#omTitle').value.trim();
    const cat = $('#omCat').value.trim() || '成长';
    const body = $('#omBody').value.trim();
    if (!title) { alert('请输入标题'); return; }
    STATE.openmind.push({ date: todayKey(STATE.date), title, cat, body });
    persist('openmind', STATE.openmind);
    renderOpenMind();
  });
}

// -------- 周复盘 --------
function renderWeekly() {
  const host = $('#moduleHost');
  const wk = getWeekKey();
  const wkEnd = (() => {
    const d = new Date(wk);
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  })();
  const videos = STATE.videos.filter(v => v.date >= wk && v.date <= wkEnd);
  const totalViews = videos.reduce((s, v) => s + v.views, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likes, 0);
  const totalComments = videos.reduce((s, v) => s + v.comments, 0);
  const wkExpenses = STATE.expenses
    .filter(e => e.date >= wk && e.date <= wkEnd)
    .reduce((s, e) => s + e.amount, 0);

  host.innerHTML = `
    <div class="module" id="m-weekly">
      <h3>🔁 每周复盘（${wk} ~ ${wkEnd}）</h3>
      <div class="grid grid-3" style="margin-bottom:14px">
        <div class="stat">
          <span class="stat-label">本周视频</span>
          <span class="stat-value">${videos.length} 条</span>
        </div>
        <div class="stat">
          <span class="stat-label">总播放/点赞</span>
          <span class="stat-value">${fmtNum(totalViews)} / ${fmtNum(totalLikes)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">本周支出</span>
          <span class="stat-value">${fmt(wkExpenses)}</span>
        </div>
      </div>

      <h4 style="font-size:13px;margin:0 0 6px">📊 视频表现</h4>
      <ul class="list">
        ${videos.length === 0 ? '<li style="color:var(--ink-mute)">本周还没有视频</li>' : ''}
        ${videos.map(v => `
          <li>
            <span><b>${v.date}</b> · ${v.title}</span>
            <span>
              <span class="pill">▶ ${fmtNum(v.views)}</span>
              <span class="pill accent">❤ ${fmtNum(v.likes)}</span>
            </span>
          </li>
        `).join('')}
      </ul>

      <h4 style="font-size:13px;margin:14px 0 6px">💡 本周亮点 / 改进建议（自动生成）</h4>
      <ul class="list">
        ${weeklyInsights(videos, totalViews, totalLikes).map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>
  `;
}

function weeklyInsights(videos, totalViews, totalLikes) {
  const out = [];
  if (videos.length === 0) {
    out.push('⚠️ 本周还没发视频，建议至少产出 2 条保持账号活跃度。');
  } else {
    out.push(`✅ 本周共发布 ${videos.length} 条视频，累计播放 ${fmtNum(totalViews)}、点赞 ${fmtNum(totalLikes)}。`);
    const best = videos.reduce((a, b) => (b.views > a.views ? b : a));
    out.push(`🏆 表现最佳：<b>${best.title}</b>（${fmtNum(best.views)} 播放）。`);
    if (totalLikes / Math.max(totalViews, 1) > 0.05) {
      out.push('👍 点赞率 > 5%，内容共鸣强；建议把这条视频的选题/钩子作为模板复用。');
    } else {
      out.push('🔧 点赞率偏低，前 3 秒可加入"反差字幕+数字"hook 提升停留。');
    }
  }
  return out;
}

// -------- 数据加载（动态读取 data/*.json） --------
let activeModule = 'overview';

const MEAL_SLOT = {
  breakfast: { slot: '早餐', icon: '🌅', time: '07:30' },
  lunch: { slot: '午餐', icon: '☀️', time: '12:00' },
  snack: { slot: '加餐', icon: '🍎', time: '15:00' },
  dinner: { slot: '晚餐', icon: '🌙', time: '18:00' }
};

function transformMeal(raw) {
  const order = ['breakfast', 'lunch', 'snack', 'dinner'];
  const meals = order.filter(k => raw.meals && raw.meals[k]).map(k => {
    const m = raw.meals[k];
    const meta = MEAL_SLOT[k];
    return {
      slot: meta.slot, icon: meta.icon, time: meta.time,
      title: m.title, calorie: m.calorie, macros: m.macros || {},
      ingredients: m.ingredients || [], steps: m.steps || [], tip: m.tip || ''
    };
  });
  return {
    date: raw.date || raw.id,
    total_calorie: raw.total_calorie || 0,
    calorie_target: raw.calorie_target || '1600-1800',
    daily_summary: raw.daily_summary || '',
    meals
  };
}

function transformHot(raw) {
  return {
    date: raw.date || '',
    summary: raw.summary || '',
    hot_topics: (raw.hot_topics || []).map(t => ({
      tag: t.tag, views: t.views || '', trend: t.trend || '', angle: t.angle || ''
    })),
    audio_suggestion: (raw.audio_suggestions || []).map(a => `${a.name}（${a.style}）— ${a.scene}`).join('；') || raw.audio_suggestion || '',
    recommended_shoot_this_week: (raw.shoot_ideas || []).map(s => `${s.title}：${s.hook}`) || raw.recommended_shoot_this_week || []
  };
}

function transformEnglish(raw) {
  return {
    sentences: (raw.phrases || []).map(p => ({ en: p.en, phonetic: p.phonetic || '', cn: p.zh })),
    words: (raw.words || []).map(w => ({ en: w.en, phonetic: w.phonetic || '', cn: w.zh })),
    core: { en: raw.core_phrase ? raw.core_phrase.en : '', cn: raw.core_phrase ? raw.core_phrase.zh : '' }
  };
}

async function loadData() {
  const today = todayKey(STATE.date);
  const tasks = [];

  // 减脂餐：取今天或最新一条
  tasks.push(
    fetch('data/meals/meal-log.json').then(r => r.ok ? r.json() : null).then(arr => {
      if (arr && arr.length) {
        const match = arr.find(m => m.id === today) || arr[arr.length - 1];
        if (match) TODAY_MEALS = transformMeal(match);
      }
    }).catch(() => {})
  );

  // 热点：按今天日期，404 则尝试昨天
  tasks.push(
    (async () => {
      for (const d of [today, todayKey(new Date(Date.now() - 86400000))]) {
        try {
          const r = await fetch(`data/hot-topics/${d}.json`);
          if (r.ok) { HOT = transformHot(await r.json()); break; }
        } catch(e) {}
      }
    })()
  );

  // 英语：取今天或最新一条
  tasks.push(
    fetch('data/english/english-log.json').then(r => r.ok ? r.json() : null).then(arr => {
      if (arr && arr.length) {
        const match = arr.find(e => e.date === today) || arr[arr.length - 1];
        if (match) ENGLISH = transformEnglish(match);
      }
    }).catch(() => {})
  );

  await Promise.all(tasks);
  // 数据加载完后重新渲染当前模块
  if (activeModule !== 'overview') activateModule(activeModule);
}

// -------- 路由 --------
function activateModule(name) {
  activeModule = name;
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.module === name));
  if (name === 'overview') {
    $('#moduleHost').innerHTML = '';
    return;
  }
  (MODULES[name] || (() => {}))();
}

// -------- 启动 --------
document.addEventListener('DOMContentLoaded', () => {
  renderCalendar();
  renderTodos();
  $$('.nav-item').forEach(el => {
    el.addEventListener('click', () => activateModule(el.dataset.module));
  });
  activateModule('overview');
  loadData(); // 异步加载最新数据，加载完自动刷新当前模块
});
