'use strict';

// ─── STATE ──────────────────────────────────────────────────────
let DB = {
  user: null, missions: {}, streak: 0, lastActive: null,
  lang: 'th', avatar: null, water: {}, weeklyMins: {},
  coins: 50, totalCoinsEarned: 50,
  currentPetId: 'dog', ownedPets: ['dog'],
  petStats: { dog: { happy:80, hungry:70, energy:90, level:1, xp:0 } },
  // ─ NEW ─
  healthProfile: null,
  setupStep: 1,
  foodLogs: {},          // { 'YYYY-MM-DD': [foodEntry] }
  weeklyNutrition: {},   // { 'YYYY-WW': summary }
  weeklyRisks: {},       // { 'YYYY-WW': riskScores }
  riskAlertShown: {},    // { 'YYYY-WW': true }
  lifestyle: null,       // AI-generated plan
  activeHealthSub: 'risk',
};

let selectedDate = '';
let todayStr = '';
let currentMissionIdx = null;
let wkRoutine = [];
let wkIdx = 0;
let wkTime = 0;
let _wkTimerId = null;
let wkPaused = false;
let wkTotalTime = 0;
let caloriesBurned = 0;

// ─── PETS DATA ───────────────────────────────────────────────────
const PETS = {
  dog:    { id:'dog',    name:'หมาน้อย Buddy', price:0,   emoji:'🐶', sounds:['โฮ่ง!','วู้ฟ!','หอย~','เล่นด้วยกัน!'], food:'🦴', toy:'🎾' },
  cat:    { id:'cat',    name:'แมวส้ม Mochi',  price:80,  emoji:'🐱', sounds:['เมี้ยว~','มิ้ว!','ฉันอยากนอน~','มาจับฉันสิ!'], food:'🐟', toy:'🧶' },
  rabbit: { id:'rabbit', name:'กระต่าย Coco',  price:120, emoji:'🐰', sounds:['จ๊าบ!','ฉันหิว!','กระโดดเล่น!','หือ?'], food:'🥕', toy:'🎀' },
  lion:   { id:'lion',   name:'สิงโต Leo',     price:300, emoji:'🦁', sounds:['ROAR!','ข้าหิว!','เล่นไหม!','กรรร~'], food:'🥩', toy:'🏈' },
  tiger:  { id:'tiger',  name:'เสือ Stripe',   price:350, emoji:'🐯', sounds:['RAWRR!','จะโดดนะ!','มาสิ!','รอแกอยู่!'], food:'🥩', toy:'🎯' },
  owl:    { id:'owl',    name:'นกฮูก Hoot',    price:200, emoji:'🦉', sounds:['ฮู้ฮู้!','ฉลาดมาก!','ฮูต!','บินแล้ว!'], food:'🐭', toy:'📚' },
  rhino:  { id:'rhino',  name:'แรด Rocky',     price:400, emoji:'🦏', sounds:['ฮึ่ม~','ฮื่อ!','มาเล่น!','แรดใจดีนะ!'], food:'🥬', toy:'🎱' },
};

const SHOP_FOODS = [
  { id:'basic',   name:'อาหารธรรมดา', emoji:'🥣', price:10, effect:{ hungry:20, happy:5  }, desc:'อาหารเบสิก ราคาถูก' },
  { id:'premium', name:'อาหารพรีเมียม',emoji:'🍖', price:30, effect:{ hungry:40, happy:15 }, desc:'อาหารเกรดดี อร่อยมาก' },
  { id:'cake',    name:'เค้กวันเกิด', emoji:'🎂', price:50, effect:{ hungry:30, happy:35 }, desc:'หวานหอม น่ากิน' },
  { id:'fish',    name:'ปลาสด',       emoji:'🐟', price:20, effect:{ hungry:30, happy:20 }, desc:'สดใหม่ สัตว์ชอบ' },
  { id:'carrot',  name:'แครอทสด',     emoji:'🥕', price:15, effect:{ hungry:25, happy:12 }, desc:'มีวิตามิน ดีต่อสุขภาพ' },
  { id:'meat',    name:'เนื้อย่าง',   emoji:'🥩', price:40, effect:{ hungry:50, happy:25 }, desc:'อร่อยสุดๆ สำหรับนักล่า' },
];
const SHOP_TOYS = [
  { id:'ball',    name:'ลูกบอล',   emoji:'🎾', price:20, effect:{ happy:20, energy:-10 }, desc:'โยนโต้กันสนุก' },
  { id:'yarn',    name:'ไหมพรม',   emoji:'🧶', price:15, effect:{ happy:25, energy:-8  }, desc:'แมวชอบที่สุด' },
  { id:'frisbee', name:'จานบิน',   emoji:'🥏', price:25, effect:{ happy:30, energy:-15 }, desc:'โยนไกลๆ วิ่งไปเอา' },
  { id:'puzzle',  name:'จิ๊กซอว์', emoji:'🧩', price:40, effect:{ happy:20, energy:-5  }, desc:'ฝึกสมอง น่าสนใจ' },
];

const COIN_REWARDS = { quick:15, standard:30, intense:60 };

// ─── DISEASE CONFIG ──────────────────────────────────────────────
const DISEASES = {
  diabetes:     { emoji:'🩸', nameTH:'เบาหวาน',          nameEN:'Diabetes',        baseAge:65, color:'#FF6B35', key:'sugar',   reduceTH:'ลดน้ำตาล ≤ 25g/วัน',        reduceEN:'Reduce sugar ≤ 25g/day' },
  hypertension: { emoji:'❤️', nameTH:'ความดันโลหิตสูง',  nameEN:'Hypertension',    baseAge:55, color:'#FF4757', key:'sodium',  reduceTH:'ลดโซเดียม ≤ 1,500mg/วัน',   reduceEN:'Reduce sodium ≤ 1,500mg/day' },
  heart:        { emoji:'💔', nameTH:'โรคหัวใจ',          nameEN:'Heart Disease',   baseAge:70, color:'#FF3F34', key:'fat',     reduceTH:'ลดไขมันอิ่มตัว ออกกำลังกาย', reduceEN:'Cut sat-fat, exercise more' },
  kidney:       { emoji:'🫘', nameTH:'โรคไต',             nameEN:'Kidney Disease',  baseAge:60, color:'#A29BFE', key:'sodium',  reduceTH:'ดื่มน้ำมาก ลดโซเดียม',       reduceEN:'Drink more water, cut sodium' },
  obesity:      { emoji:'⚖️', nameTH:'โรคอ้วน',           nameEN:'Obesity',         baseAge:40, color:'#FFA502', key:'calories',reduceTH:'ลดแคลอรี่ เพิ่มออกกำลังกาย', reduceEN:'Cut calories, exercise more' },
  liver:        { emoji:'🍺', nameTH:'โรคตับ',             nameEN:'Liver Disease',   baseAge:50, color:'#ECCC68', key:'alcohol', reduceTH:'ลดแอลกอฮอล์ ลดไขมัน',        reduceEN:'Reduce alcohol and fat' },
  cholesterol:  { emoji:'🧬', nameTH:'ไขมันในเลือดสูง',   nameEN:'High Cholesterol',baseAge:55, color:'#70A1FF', key:'fat',     reduceTH:'ลดไขมันอิ่มตัว กินผักมาก',    reduceEN:'Cut sat-fat, eat more greens' },
};

// ─── WORKOUT PROGRAMS ────────────────────────────────────────────
function buildProgram(ag) {
  const th = DB.lang === 'th';
  const programs = {
    child: [
      { type:'ex', name:th?'วอร์มอัพสนุก':'Fun Warm-Up',       anim:'ex-stretch', dur:585, muscles:th?['ทั้งตัว']:['Full Body'],           met:3, coachTip:th?'ยืดแขนขาให้ทั่ว สนุกได้เลย!':'Stretch your arms and legs!' },
      { type:'ex', name:th?'กระโดดตบ':'Jumping Jacks',          anim:'ex-jack',    dur:585, muscles:th?['ขา','แขน','หัวใจ']:['Legs','Arms'], met:8, coachTip:th?'กระโดดให้แขนยกสูง ขาถ่างออก!':'Jump! Arms up, legs wide!' },
      { type:'ex', name:th?'วิ่งอยู่กับที่':'Running in Place', anim:'ex-run',     dur:585, muscles:th?['ขา','หัวใจ']:['Legs','Heart'],      met:9, coachTip:th?'วิ่งในที่ ยกเข่าสูงๆ!':'Run in place, lift knees!' },
      { type:'rest', name:th?'พักครั้งที่ 1':'Rest 1', dur:45 },
      { type:'ex', name:th?'ลุกนั่ง':'Sit-Up',                 anim:'ex-squat',   dur:585, muscles:th?['หน้าท้อง']:['Abs'],                 met:5, coachTip:th?'ลุกขึ้นช้าๆ!':'Come up slow!' },
      { type:'ex', name:th?'กลูทบริดจ์':'Glute Bridge',        anim:'ex-lunge',   dur:585, muscles:th?['สะโพก','หลัง']:['Glutes','Back'],   met:4, coachTip:th?'ยกสะโพกขึ้น ค้างไว้!':'Lift hips, hold!' },
      { type:'rest', name:th?'พักครั้งที่ 2':'Rest 2', dur:45 },
      { type:'ex', name:th?'คูลดาวน์':'Cool-Down',             anim:'ex-stretch', dur:585, muscles:th?['ทั้งตัว']:['Full Body'],             met:2, coachTip:th?'หายใจลึกๆ ทำได้ดีมาก!':'Deep breath, well done!' },
    ],
    teen: [
      { type:'ex', name:th?'วอร์มอัพ':'Warm-Up',               anim:'ex-stretch', dur:420, muscles:th?['ทั้งตัว']:['Full Body'],                        met:4, coachTip:th?'เตรียมร่างกายให้พร้อม':'Get ready' },
      { type:'ex', name:th?'กระโดดตบ':'Jumping Jacks',          anim:'ex-jack',    dur:420, muscles:th?['ขา','แขน','หัวใจ']:['Legs','Arms'],              met:8, coachTip:th?'แขนยกสูงถึงหู!':'Arms up to ears!' },
      { type:'ex', name:th?'สควอท':'Squats',                    anim:'ex-squat',   dur:420, muscles:th?['ต้นขา','สะโพก']:['Quads','Glutes'],              met:5, coachTip:th?'หลังตรง เข่าไม่เกินปลายเท้า':'Back straight!' },
      { type:'rest', name:th?'พัก 30 วิ':'30s Rest', dur:30 },
      { type:'ex', name:th?'High Knees':'High Knees',            anim:'ex-knee',    dur:420, muscles:th?['ขา','หัวใจ']:['Legs','Cardio'],                  met:10, coachTip:th?'ยกเข่าสูง ทำให้เร็ว!':'High knees, speed up!' },
      { type:'ex', name:th?'ลันจ์':'Lunges',                    anim:'ex-lunge',   dur:420, muscles:th?['ต้นขา','น่อง']:['Quads','Calves'],                met:5, coachTip:th?'ก้าวยาว หลังตรง สลับข้าง':'Long step, alternate!' },
      { type:'rest', name:th?'พัก 45 วิ':'45s Rest', dur:45 },
      { type:'ex', name:th?'แพลงก์':'Plank',                    anim:'ex-plank',   dur:420, muscles:th?['แกนกลาง','หน้าท้อง']:['Core','Abs'],             met:4, coachTip:th?'ลำตัวตรง ค้างไว้!':'Body straight, hold!' },
      { type:'ex', name:th?'คูลดาวน์':'Cool-Down',              anim:'ex-stretch', dur:420, muscles:th?['ทั้งตัว']:['Full Body'],                          met:2, coachTip:th?'ผ่อนคลาย หายใจลึกๆ เยี่ยม!':'Relax, deep breath. Excellent!' },
      { type:'rest', name:th?'พัก 1 นาที':'1 min Rest', dur:60 },
    ],
    adult: [
      { type:'ex', name:th?'วอร์มอัพ':'Warm-Up',               anim:'ex-stretch', dur:155, muscles:th?['ทั้งตัว']:['Full Body'],                        met:4, coachTip:th?'ยืดกล้ามเนื้อทีละส่วน':'Stretch each group' },
      { type:'ex', name:th?'กระโดดตบ':'Jumping Jacks',          anim:'ex-jack',    dur:155, muscles:th?['ขา','แขน','หัวใจ']:['Legs','Arms'],              met:8, coachTip:th?'รักษาจังหวะสม่ำเสมอ!':'Keep steady rhythm!' },
      { type:'ex', name:th?'สควอท':'Squats',                    anim:'ex-squat',   dur:155, muscles:th?['ต้นขา','สะโพก','น่อง']:['Quads','Glutes'],      met:5, coachTip:th?'หลังตรง ลงช้า 3 วิ':'3s down, 1s up' },
      { type:'rest', name:th?'พัก 45 วิ':'45s Rest', dur:45 },
      { type:'ex', name:th?'High Knees':'High Knees',            anim:'ex-knee',    dur:155, muscles:th?['ขา','หัวใจ']:['Legs','Cardio'],                  met:10, coachTip:th?'ทำให้เร็วที่สุด Push it!':'Go as fast as you can!' },
      { type:'ex', name:th?'ลันจ์':'Lunges',                    anim:'ex-lunge',   dur:155, muscles:th?['ต้นขา','น่อง']:['Quads','Calves'],                met:5, coachTip:th?'ก้าวยาว เข่าตั้งฉาก':'Long step, knee 90°' },
      { type:'ex', name:th?'แพลงก์':'Plank',                    anim:'ex-plank',   dur:155, muscles:th?['แกนกลาง','หน้าท้อง']:['Core','Abs'],             met:4, coachTip:th?'สะโพกตรง ค้างไว้!':'Hips level, hold it!' },
      { type:'rest', name:th?'พัก 1 นาที':'1 min Rest', dur:60 },
      { type:'ex', name:th?'Push-Up':'Push-Up',                  anim:'ex-push',    dur:155, muscles:th?['หน้าอก','แขน']:['Chest','Arms'],                 met:5, coachTip:th?'ลำตัวตรง ลงช้า ขึ้นเร็ว':'Body straight, slow down!' },
      { type:'ex', name:th?'คูลดาวน์':'Cool-Down',              anim:'ex-stretch', dur:155, muscles:th?['ทั้งตัว']:['Full Body'],                          met:2, coachTip:th?'ผ่อนคลาย ทำได้ดีมาก! 🎉':'Relax. Fantastic work! 🎉' },
      { type:'rest', name:th?'พัก 1 นาที':'1 min Rest', dur:60 },
    ],
    senior: [
      { type:'ex', name:th?'แกว่งแขนเบาๆ':'Gentle Arm Circles', anim:'ex-stretch', dur:280, muscles:th?['แขน','ไหล่']:['Arms','Shoulders'], met:2.5, coachTip:th?'แกว่งแขนช้าๆ ไม่ต้องรีบ':'Take your time' },
      { type:'ex', name:th?'เดินในที่':'Marching in Place',       anim:'ex-march',   dur:280, muscles:th?['ขา','หัวใจ']:['Legs','Heart'],     met:3,   coachTip:th?'ยกเข่าเบาๆ มั่นคง':'Lift gently, stay steady' },
      { type:'ex', name:th?'ยืดต้นขา':'Leg Stretch',             anim:'ex-squat',   dur:280, muscles:th?['ต้นขา']:['Quads'],                 met:2,   coachTip:th?'ยืดช้าๆ ค้างไว้ 10 วิ':'Slow stretch, hold 10s' },
      { type:'rest', name:th?'พัก 1 นาที':'1 min Rest', dur:60 },
      { type:'ex', name:th?'ยืดเอ็นร้อยหวาย':'Hamstring Stretch',anim:'ex-lunge',   dur:280, muscles:th?['ต้นขาหลัง']:['Hamstrings'],        met:2,   coachTip:th?'โน้มตัวไปหาปลายเท้าช้าๆ':'Reach for toes slowly' },
      { type:'ex', name:th?'กลูทบริดจ์':'Glute Bridge',          anim:'ex-plank',   dur:280, muscles:th?['สะโพก','หลัง']:['Glutes','Back'],  met:2.5, coachTip:th?'ยกสะโพกขึ้นช้าๆ ค้าง 3 วิ':'Lift slow, hold 3s' },
      { type:'rest', name:th?'พัก 1 นาที':'1 min Rest', dur:60 },
      { type:'ex', name:th?'คูลดาวน์':'Cool-Down',               anim:'ex-stretch', dur:280, muscles:th?['ทั้งตัว']:['Full Body'],            met:1.5, coachTip:th?'หายใจลึกๆ 5 ครั้ง ทำได้ดีมาก!':'5 deep breaths. Excellent!' },
    ],
  };
  return programs[ag] || programs.adult;
}

// ─── INIT ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadDB();
  const now = new Date(); now.setHours(0,0,0,0);
  todayStr = toDateStr(now);
  selectedDate = todayStr;
  checkStreak();

  if (!DB.user) {
    showSetupStep(1);
  } else {
    document.getElementById('setupScreen').classList.add('hidden');
    boot();
  }
  updateAgeGroup();
  setInterval(decayPetStats, 90000);
});

function boot() {
  updateTopBar();
  renderCalendar();
  renderMissions();
  renderWeeklyBars();
  updateSmartBanner();
  setInterval(updateSmartBanner, 60000);
  applyLang();
  renderPet();
  renderMyPets();
  populateShop('food');
  updateCoinDisplays();
  renderFoodTab();
  renderHealthTab();
  checkWeeklyRiskAlert();
}

// ─── DB ─────────────────────────────────────────────────────────
function loadDB() {
  try { const s = localStorage.getItem('hf_v2'); if (s) DB = { ...DB, ...JSON.parse(s) }; } catch(e) {}
}
function saveDB() { localStorage.setItem('hf_v2', JSON.stringify(DB)); }

// ─── DATE UTILS ─────────────────────────────────────────────────
function toDateStr(d) {
  const off = d.getTimezoneOffset()*60000;
  return (new Date(d-off)).toISOString().split('T')[0];
}
function parseDate(s) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y,m-1,d);
}
function getWeekKey(dateStr) {
  const d = parseDate(dateStr);
  const jan1 = new Date(d.getFullYear(),0,1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
}
function getCurrentWeekKey() { return getWeekKey(todayStr); }

// ─── SETUP MULTI-STEP ────────────────────────────────────────────
function showSetupStep(step) {
  DB.setupStep = step;
  document.querySelectorAll('.setup-step').forEach((el,i) => {
    el.style.display = (i+1 === step) ? 'flex' : 'none';
  });
  // Update dots
  document.querySelectorAll('.setup-dot').forEach((d,i) => {
    d.className = `setup-dot ${i < step ? 'done' : i === step-1 ? 'active' : ''}`;
  });
  document.getElementById('setupScreen').style.display = 'flex';
}

function updateAgeGroup(prefix='s') {
  const age = parseInt(document.getElementById(`${prefix}_age`)?.value || 0);
  const pills = document.querySelectorAll(`#agePills${prefix==='s'?'Setup':'Edit'} .age-pill`);
  pills.forEach(p => {
    p.classList.remove('active');
    const g = p.dataset.group;
    if ((g==='child'&&age>=5&&age<=12)||(g==='teen'&&age>=13&&age<=17)||
        (g==='adult'&&age>=18&&age<=50)||(g==='senior'&&age>=51)) p.classList.add('active');
  });
}
function updateAgeGroupEdit() { updateAgeGroup('e'); }
function getAgeGroup(age) {
  if (age<=12) return 'child'; if (age<=17) return 'teen'; if (age<=50) return 'adult'; return 'senior';
}

function saveSetupStep1() {
  const n = document.getElementById('s_name').value.trim();
  const a = parseInt(document.getElementById('s_age').value);
  const g = document.getElementById('s_gender').value;
  const h = parseFloat(document.getElementById('s_height').value);
  const w = parseFloat(document.getElementById('s_weight').value);
  if (!n||!a||!h||!w) { alert(DB.lang==='th'?'กรุณากรอกข้อมูลให้ครบ':'Please fill all fields'); return; }
  DB.user = { name:n, age:a, gender:g, height:h, weight:w };
  DB.user.bmi = calcBMI(h,w);
  DB.user.ageGroup = getAgeGroup(a);
  saveDB();
  showSetupStep(2);
}

function saveSetupStep2() {
  DB.healthProfile = {
    // Sleep
    sleepHoursAvg: parseFloat(document.getElementById('q_sleepHours').value) || 7,
    sleepBadDays: parseInt(document.getElementById('q_sleepBadDays').value) || 0,
    sleepQuality: parseInt(document.getElementById('q_sleepQuality').value) || 3,
    // Exercise
    exerciseDaysPerWeek: parseInt(document.getElementById('q_exerciseDays').value) || 3,
    exerciseType: document.getElementById('q_exerciseType').value || 'moderate',
    exerciseMinsPerSession: parseInt(document.getElementById('q_exerciseMins').value) || 30,
    // Diet
    saltIntake: parseInt(document.getElementById('q_salt').value) || 3,
    sugarIntake: parseInt(document.getElementById('q_sugar').value) || 3,
    fatIntake: parseInt(document.getElementById('q_fat').value) || 3,
    vegServings: parseInt(document.getElementById('q_veg').value) || 3,
    fruitServings: parseInt(document.getElementById('q_fruit').value) || 2,
    fastFoodPerWeek: parseInt(document.getElementById('q_fastfood').value) || 2,
    skippingMeals: parseInt(document.getElementById('q_skipmeals').value) || 0,
    // Drinks
    waterGlassesPerDay: parseInt(document.getElementById('q_water').value) || 6,
    alcoholDrinksPerWeek: parseInt(document.getElementById('q_alcohol').value) || 0,
    sugaryDrinksPerDay: parseInt(document.getElementById('q_sugarydrinks').value) || 1,
  };
  saveDB();
  showSetupStep(3);
}

function saveSetupStep3() {
  const fh = [];
  document.querySelectorAll('.fh-check:checked').forEach(cb => fh.push(cb.value));
  const cc = [];
  document.querySelectorAll('.cc-check:checked').forEach(cb => cc.push(cb.value));

  DB.healthProfile = {
    ...DB.healthProfile,
    // Risk behaviors
    smokingStatus: document.getElementById('q_smoking').value || 'never',
    stressLevel: parseInt(document.getElementById('q_stress').value) || 3,
    workHoursPerDay: parseInt(document.getElementById('q_workhours').value) || 8,
    screenHoursPerDay: parseInt(document.getElementById('q_screenhours').value) || 4,
    outdoorHoursPerDay: parseInt(document.getElementById('q_outdoor').value) || 1,
    // History
    familyHistory: fh,
    currentConditions: cc,
    takingMedications: document.getElementById('q_meds').checked,
    // Known vitals (optional)
    knownBP: document.getElementById('q_bp').value.trim() || '',
    knownBloodSugar: parseFloat(document.getElementById('q_bloodsugar').value) || 0,
    knownCholesterol: parseFloat(document.getElementById('q_cholesterol').value) || 0,
  };
  saveDB();
  document.getElementById('setupScreen').classList.add('hidden');
  boot();
  // Calculate initial risk
  const wk = getCurrentWeekKey();
  const risks = calculateRiskScores(DB.healthProfile, DB.weeklyNutrition[wk], DB.user);
  DB.weeklyRisks[wk] = risks;
  saveDB();
  renderHealthTab();
}

function calcBMI(h,w) { const hm=h/100; return parseFloat((w/(hm*hm)).toFixed(1)); }
function bmiLabel(bmi,lang) {
  if (bmi<18.5) return lang==='th'?'น้ำหนักน้อย':'Underweight';
  if (bmi<23)   return lang==='th'?'สมส่วน':'Normal';
  if (bmi<25)   return lang==='th'?'น้ำหนักเกิน':'Overweight';
  return lang==='th'?'อ้วน':'Obese';
}
function bmiClass(bmi) {
  if (bmi<18.5) return 'bmi-thin'; if (bmi<23) return 'bmi-normal'; if (bmi<25) return 'bmi-warn'; return 'bmi-danger';
}

// ─── TOP BAR ────────────────────────────────────────────────────
function updateTopBar() {
  if (!DB.user) return;
  document.getElementById('topName').textContent = DB.user.name;
  document.getElementById('topAvatar').src = DB.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  document.getElementById('profileAvtImg').src = DB.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  const bmiEl = document.getElementById('topBMI');
  bmiEl.textContent = `BMI ${DB.user.bmi} · ${bmiLabel(DB.user.bmi,DB.lang)}`;
  bmiEl.className = `bmi-tag ${bmiClass(DB.user.bmi)}`;
  document.getElementById('streakNum').textContent = DB.streak;
}
function updateCoinDisplays() {
  const c = DB.coins||0;
  document.getElementById('coinDisplay').textContent = c;
  const sd = document.getElementById('shopCoinDisplay');
  if (sd) sd.textContent = c;
}

// ─── STREAK ─────────────────────────────────────────────────────
function checkStreak() {
  if (DB.lastActive) {
    const diff = Math.round((parseDate(todayStr)-parseDate(DB.lastActive))/86400000);
    if (diff>1) { DB.streak=0; saveDB(); }
  }
}
function updateStreakOnComplete() {
  if (selectedDate!==todayStr) return;
  if (DB.lastActive!==todayStr) {
    DB.streak=(DB.streak||0)+1; DB.lastActive=todayStr; saveDB();
    document.getElementById('streakNum').textContent=DB.streak;
  }
}

// ─── TAB SWITCHING ──────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active-tab'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active-tab');
  const navBtn = document.getElementById(`nav-${tab}`);
  if (navBtn) navBtn.classList.add('active');
  if (tab==='pet') { renderPet(); renderMyPets(); }
  if (tab==='shop') { updateCoinDisplays(); }
  if (tab==='food') { renderFoodTab(); }
  if (tab==='health') { renderHealthTab(); }
}

// ─── SMART BANNER ───────────────────────────────────────────────
function updateSmartBanner() {
  const h = new Date().getHours();
  const th = DB.lang==='th';
  const schedules = [
    { from:5,  to:9,  icon:'🌅', title:th?'เวลาเช้า — ทานอาหารเช้า':'Morning — Eat Breakfast',    sub:th?'ร่างกายต้องการพลังงานหลังตื่นนอน':'Fuel up after sleeping',    timeLabel:'05–09', color:'#F0A500' },
    { from:9,  to:11, icon:'💧', title:th?'ช่วงเช้า — ดื่มน้ำ':'Mid-Morning — Drink Water',        sub:th?'ดื่มน้ำ 2 แก้ว เพิ่มสมาธิ':'Drink 2 glasses, boost focus', timeLabel:'09–11', color:'#00D9B5' },
    { from:11, to:13, icon:'🍽', title:th?'เที่ยง — มื้อกลางวัน':'Noon — Lunch Time',              sub:th?'รับพลังสำหรับช่วงบ่าย':'Refuel for the afternoon',       timeLabel:'11–13', color:'#FF79C6' },
    { from:13, to:16, icon:'🏃', title:th?'บ่าย — ออกกำลังกาย':'Afternoon — Workout Time',         sub:th?'ร่างกายพร้อมออกกำลังกายมากที่สุด':'Peak time for exercise',    timeLabel:'13–16', color:'#2ECC71' },
    { from:16, to:18, icon:'🍊', title:th?'ของว่างบ่าย':'Afternoon Snack',                           sub:th?'ผลไม้รักษาระดับน้ำตาล':'Fruit keeps blood sugar stable', timeLabel:'16–18', color:'#F0A500' },
    { from:18, to:20, icon:'🥗', title:th?'เย็น — มื้อเย็นเบาๆ':'Evening — Light Dinner',          sub:th?'ทานก่อน 19:00 ย่อยง่าย':'Eat before 7PM for digestion',   timeLabel:'18–20', color:'#BC8CFF' },
    { from:20, to:22, icon:'🧘', title:th?'ค่ำ — ผ่อนคลาย':'Evening — Wind Down',                   sub:th?'ลดแสงหน้าจอ ยืดเหยียด':'Dim screens, light stretching',   timeLabel:'20–22', color:'#58A6FF' },
    { from:22, to:24, icon:'🌙', title:th?'ดึก — เวลานอน':'Bedtime',                                sub:th?'นอน 7-9 ชั่วโมง ฟื้นฟูร่างกาย':'7–9 hours restores body',    timeLabel:'22+',   color:'#58A6FF' },
    { from:0,  to:5,  icon:'😴', title:th?'กลางคืน — นอนหลับ':'Night — Deep Sleep',                 sub:th?'ร่างกายกำลังซ่อมแซมตัวเอง':'Your body is repairing itself', timeLabel:'00–05', color:'#58A6FF' },
  ];
  const cur = schedules.find(s=>h>=s.from&&h<s.to)||schedules[0];
  document.getElementById('bannerIcon').textContent = cur.icon;
  document.getElementById('bannerTitle').textContent = cur.title;
  document.getElementById('bannerSub').textContent = cur.sub;
  document.getElementById('bannerTime').textContent = cur.timeLabel;
  document.getElementById('bannerTime').style.cssText = `background:${cur.color}22;color:${cur.color};font-size:.72rem;font-weight:700;padding:3px 9px;border-radius:20px;`;
}

// ─── CALENDAR ───────────────────────────────────────────────────
function renderCalendar() {
  const strip = document.getElementById('calStrip'); strip.innerHTML='';
  const daysTH=['อา','จ','อ','พ','พฤ','ศ','ส'];
  const daysEN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today=new Date(); today.setHours(0,0,0,0);
  for (let i=-3;i<=3;i++) {
    const d=new Date(today); d.setDate(today.getDate()+i);
    const ds=toDateStr(d);
    const div=document.createElement('div');
    const names=DB.lang==='th'?daysTH:daysEN;
    const mis=DB.missions[ds];
    const hasDone=mis&&mis.some(m=>m.completed);
    div.className=`cal-day ${ds===selectedDate?'active':''} ${hasDone?'has-data':''}`;
    div.innerHTML=`<span class="d-name">${names[d.getDay()]}</span><span class="d-num">${d.getDate()}</span>`;
    div.onclick=()=>{ selectedDate=ds; renderCalendar(); renderMissions(); };
    strip.appendChild(div);
  }
}

// ─── MISSIONS ───────────────────────────────────────────────────
function getMissions(dateStr) {
  if (DB.missions[dateStr]) return DB.missions[dateStr];
  const d=parseDate(dateStr);
  const isRest=(d.getDay()===0||d.getDay()===3);
  const ag=DB.user?DB.user.ageGroup:'adult';
  const ms=buildMissions(ag,isRest,DB.lang);
  DB.missions[dateStr]=ms; saveDB(); return ms;
}

function buildMissions(ag,isRest,lang) {
  const th=lang==='th';
  const R=isRest;
  const mByAge={
    child:{
      breakfast:{ title:th?'มื้อเช้า สร้างกระดูก':'Breakfast — Bone Builder', time:th?'07:00–08:00 น.':'7:00–8:00 AM',
        foods:[{name:th?'นม 1 แก้ว':'Milk 1 glass',cal:120},{name:th?'ขนมปังโฮลวีต 2 แผ่น':'Wholegrain 2 slices',cal:140},{name:th?'กล้วย 1 ผล':'Banana',cal:90},{name:th?'ไข่ต้ม 1 ฟอง':'Boiled egg',cal:78}],
        nutrients:[{icon:'🦴',name:'Ca',val:'300mg'},{icon:'💪',name:'Protein',val:'18g'},{icon:'⚡',name:'Energy',val:'428kcal'},{icon:'🌾',name:'Carbs',val:'55g'}],
        tips:th?'เด็กต้องการแคลเซียม 1,000mg/วัน เพื่อกระดูกแข็งแรง':'Children need 1,000mg calcium/day.' },
      lunch:{ title:th?'มื้อกลางวัน พลังสมอง':'Lunch — Brain Power', time:th?'11:30–12:30 น.':'11:30–12:30 PM',
        foods:[{name:th?'ข้าวสวย 1.5 ทัพพี':'Rice 1.5 cups',cal:180},{name:th?'ไก่ทอด 1 ชิ้น':'Chicken 1 pc',cal:220},{name:th?'ผักสด 1 ทัพพี':'Veggies 1 cup',cal:40},{name:th?'ส้ม 1 ผล':'Orange',cal:62}],
        nutrients:[{icon:'🧠',name:'DHA',val:'–'},{icon:'💪',name:'Protein',val:'26g'},{icon:'⚡',name:'Energy',val:'502kcal'},{icon:'🌿',name:'Vit-C',val:'70mg'}],
        tips:th?'โอเมก้า-3 จากปลาช่วยพัฒนาสมอง':'Omega-3 from fish supports brain development.' },
      dinner:{ title:th?'มื้อเย็น เติบโตตอนหลับ':'Dinner — Grow While Sleeping', time:th?'ก่อน 19:00 น.':'Before 7:00 PM',
        foods:[{name:th?'ข้าวกล้อง 1 ทัพพี':'Brown rice 1 cup',cal:150},{name:th?'ปลาย่าง':'Grilled fish',cal:190},{name:th?'ต้มจืดผัก':'Veg soup',cal:60},{name:th?'แก้วมังกร 1/2':'Dragon fruit ½',cal:55}],
        nutrients:[{icon:'🌙',name:'GH',val:'↑'},{icon:'💪',name:'Protein',val:'24g'},{icon:'⚡',name:'Energy',val:'455kcal'},{icon:'🦷',name:'Ca+D',val:'✓'}],
        tips:th?'โกรทฮอร์โมนหลั่งสูงสุดตอนหลับ':'Growth hormone peaks during sleep.' },
    },
    teen:{
      breakfast:{ title:th?'มื้อเช้า เติมพลัง':'Breakfast — Energy Boost', time:th?'07:00–08:00 น.':'7:00–8:00 AM',
        foods:[{name:th?'ข้าวโอ๊ต+นม':'Oats+Milk',cal:280},{name:th?'ไข่คน 2 ฟอง':'2 Scrambled eggs',cal:156},{name:th?'กล้วยหอม':'Banana',cal:105},{name:th?'น้ำส้มสด':'OJ',cal:110}],
        nutrients:[{icon:'💪',name:'Protein',val:'22g'},{icon:'🔋',name:'Energy',val:'651kcal'},{icon:'🦴',name:'Ca',val:'320mg'},{icon:'🩸',name:'Fe',val:'4mg'}],
        tips:th?'วัยรุ่นต้องการ 2,000–2,500 kcal/วัน อย่าข้ามเช้า!':'Teens need 2,000–2,500 kcal/day!' },
      lunch:{ title:th?'มื้อกลางวัน สร้างกล้าม':'Lunch — Build Muscle', time:th?'11:30–13:00 น.':'11:30–1:00 PM',
        foods:[{name:th?'ข้าวสวย 2 ทัพพี':'Rice 2 cups',cal:240},{name:th?'เนื้อสัตว์/เต้าหู้':'Meat or Tofu',cal:250},{name:th?'ผักสลัด':'Salad',cal:45},{name:th?'แอปเปิ้ล':'Apple',cal:80}],
        nutrients:[{icon:'💪',name:'Protein',val:'30g'},{icon:'⚡',name:'Energy',val:'615kcal'},{icon:'🌿',name:'Fiber',val:'8g'},{icon:'⚙️',name:'Zinc',val:'4mg'}],
        tips:th?'สังกะสี (Zinc) สำคัญต่อการเจริญเติบโต':'Zinc is crucial for growth in teens.' },
      dinner:{ title:th?'มื้อเย็น ฟื้นฟูกล้าม':'Dinner — Recovery', time:th?'ก่อน 19:30 น.':'Before 7:30 PM',
        foods:[{name:th?'ข้าวกล้อง 1 ทัพพี':'Brown rice 1 cup',cal:150},{name:th?'ปลาแซลมอน/ไข่':'Salmon or Eggs',cal:200},{name:th?'ผักต้ม':'Boiled veggies',cal:50},{name:th?'โยเกิร์ต':'Yogurt',cal:100}],
        nutrients:[{icon:'🦴',name:'Ca+D3',val:'450mg'},{icon:'💪',name:'Protein',val:'28g'},{icon:'⚡',name:'Energy',val:'500kcal'},{icon:'🧬',name:'Omega-3',val:'1g'}],
        tips:th?'โยเกิร์ตก่อนนอนให้แคลเซียมสำหรับสร้างกระดูกขณะหลับ':'Yogurt before bed for bone building.' },
    },
    adult:{
      breakfast:{ title:th?'มื้อเช้าปลุกพลัง':'Morning Power Breakfast', time:th?'07:00–09:00 น.':'7:00–9:00 AM',
        foods:[{name:th?'ข้าวกล้อง 1 ทัพพี':'Brown rice 1 cup',cal:150},{name:th?'ไข่ต้ม 2 ฟอง':'2 Boiled eggs',cal:156},{name:th?'อกไก่ 50g':'Chicken breast 50g',cal:82},{name:th?'กล้วยหอม':'Banana',cal:105}],
        nutrients:[{icon:'💪',name:'Protein',val:'28g'},{icon:'⚡',name:'Energy',val:'493kcal'},{icon:'🌾',name:'Fiber',val:'5g'},{icon:'🍌',name:'K+B6',val:'✓'}],
        tips:th?'ทานภายใน 1 ชั่วโมงหลังตื่น ช่วยเพิ่มเมตาบอลิซึม':'Eat within 1 hour of waking.' },
      lunch:{ title:th?'มื้อเที่ยงเติมพลัง':'Power Lunch', time:th?'11:30–13:00 น.':'11:30–1:00 PM',
        foods:[{name:th?'ข้าวสวย 2 ทัพพี':'Rice 2 cups',cal:240},{name:th?'เนื้อสัตว์ 3-4 ช้อน':'Meat 3-4 tbsp',cal:200},{name:th?'ผักสด 1-2 ทัพพี':'Veggies 1-2 cups',cal:50},{name:th?'ฝรั่ง 6-8 ชิ้น':'Guava 6-8 slices',cal:55}],
        nutrients:[{icon:'💪',name:'Protein',val:'32g'},{icon:'⚡',name:'Energy',val:'545kcal'},{icon:'🌿',name:'Vit-C',val:'80mg'},{icon:'🩸',name:'Fe',val:'5mg'}],
        tips:th?'ผักสีเขียวในมื้อกลางวันให้โฟเลตและธาตุเหล็ก':'Green veggies provide folate and iron.' },
      dinner:{ title:th?'มื้อเย็นเบาสบาย':'Light Dinner', time:th?'ก่อน 19:00 น.':'Before 7:00 PM',
        foods:[{name:th?'ข้าวกล้อง 1 ทัพพี':'Brown rice 1 cup',cal:150},{name:th?'ปลา/ไก่ 2-3 ช้อน':'Fish/Chicken 2-3 tbsp',cal:150},{name:th?'ผักต้ม 2 ทัพพี':'Boiled veggies',cal:60},{name:th?'ส้มครึ่งผล':'Half orange',cal:40}],
        nutrients:[{icon:'🔥',name:th?'เบา':'Light',val:'✓'},{icon:'💪',name:'Protein',val:'22g'},{icon:'⚡',name:'Energy',val:'400kcal'},{icon:'🌿',name:'Fiber',val:'9g'}],
        tips:th?'ทานก่อนนอนอย่างน้อย 3 ชั่วโมง ช่วยนอนหลับได้ดี':'Eat 3+ hours before bed.' },
    },
    senior:{
      breakfast:{ title:th?'มื้อเช้าย่อยง่าย':'Easy Morning Meal', time:th?'07:00–08:30 น.':'7:00–8:30 AM',
        foods:[{name:th?'ข้าวต้ม/โจ๊ก':'Porridge',cal:130},{name:th?'ปลานึ่ง/ไข่ต้ม':'Steamed fish/Egg',cal:100},{name:th?'นม Low-fat':'Low-fat milk',cal:100},{name:th?'มะละกอสุก':'Ripe papaya',cal:55}],
        nutrients:[{icon:'🦴',name:'Ca',val:'400mg'},{icon:'💪',name:'Protein',val:'18g'},{icon:'⚡',name:'Energy',val:'385kcal'},{icon:'🫁',name:'Vit-D',val:'200IU'}],
        tips:th?'ผู้สูงอายุต้องการแคลเซียม 1,200mg/วัน ป้องกันกระดูกพรุน':'Seniors need 1,200mg calcium/day.' },
      lunch:{ title:th?'มื้อเที่ยงอ่อนนุ่ม':'Soft Nutritious Lunch', time:th?'11:00–12:30 น.':'11:00–12:30 PM',
        foods:[{name:th?'ข้าวสวยนุ่ม':'Soft rice',cal:180},{name:th?'ตับหรือปลา':'Liver or Fish',cal:150},{name:th?'แกงจืดผัก':'Clear veg soup',cal:55},{name:th?'กล้วย':'Banana',cal:90}],
        nutrients:[{icon:'🩸',name:'Fe+B12',val:'✓'},{icon:'💪',name:'Protein',val:'22g'},{icon:'⚡',name:'Energy',val:'475kcal'},{icon:'🧠',name:'B12',val:'2µg'}],
        tips:th?'วิตามิน B12 สำคัญสำหรับระบบประสาทและความจำ':'Vitamin B12 vital for nerve and memory.' },
      dinner:{ title:th?'มื้อเย็นบำรุงหัวใจ':'Heart-Healthy Dinner', time:th?'ก่อน 18:30 น.':'Before 6:30 PM',
        foods:[{name:th?'ข้าวกล้อง/โอ๊ต':'Brown rice/Oats',cal:150},{name:th?'ปลาทะเล':'Sea fish',cal:180},{name:th?'ต้มผักใบเขียว':'Leafy green soup',cal:40},{name:th?'แอปเปิ้ลเขียว':'Green apple',cal:80}],
        nutrients:[{icon:'❤️',name:'Omega-3',val:'1.5g'},{icon:'💪',name:'Protein',val:'20g'},{icon:'⚡',name:'Energy',val:'450kcal'},{icon:'🌿',name:'Antioxidant',val:'✓'}],
        tips:th?'โอเมก้า-3 ลดความเสี่ยงโรคหัวใจ':'Omega-3 reduces heart disease risk.' },
    },
  };
  const meals=mByAge[ag]||mByAge.adult;
  const wkByAge={ child:{title:th?'ออกกำลัง 60 นาที':'Play 60 min',time:th?'300 นาที/สัปดาห์':'300 min/week',tips:th?'เด็กควรออกกำลัง 60 นาที/วัน':'Children: 60 min/day.'},
    teen:{title:th?'ออกกำลัง 60 นาที':'Workout 60 min',time:th?'300 นาที/สัปดาห์':'300 min/week',tips:th?'วัยรุ่นควรออกกำลัง 60 นาที/วัน':'Teens: 60 min/day.'},
    adult:{title:th?'ออกกำลัง 30 นาที':'30 Min Workout',time:th?'150 นาที/สัปดาห์':'150 min/week',tips:th?'WHO แนะนำ 150-300 นาที/สัปดาห์':'WHO: 150-300 min/week.'},
    senior:{title:th?'เดินเบาๆ + ยืดเหยียด':'Light Walk + Stretch',time:th?'150 นาที/สัปดาห์':'150 min/week',tips:th?'เน้นสมดุลและการทรงตัว':'Focus on balance.'} };
  const wk=wkByAge[ag]||wkByAge.adult;
  const slByAge={ child:{title:th?'นอน 9-11 ชั่วโมง':'Sleep 9–11 Hours',time:th?'ก่อน 20:30 น.':'Before 8:30 PM',tips:th?'โกรทฮอร์โมนหลั่งใน 2 ชั่วโมงแรก':'Growth hormone in first 2h.'},
    teen:{title:th?'นอน 8-10 ชั่วโมง':'Sleep 8–10 Hours',time:th?'ก่อน 22:00 น.':'Before 10 PM',tips:th?'การอดนอนลดสมาธิ':'Sleep deprivation impairs focus.'},
    adult:{title:th?'เข้านอน':'Bedtime',time:th?'22:00 น.':'10:00 PM',tips:th?'นอน 7-9 ชั่วโมง ปิดหน้าจอก่อนนอน':'7-9 hours. Screens off 30 min before bed.'},
    senior:{title:th?'พักผ่อนยามเย็น':'Evening Rest',time:th?'ก่อน 21:30 น.':'Before 9:30 PM',tips:th?'7-8 ชั่วโมง ไม่งีบหลังบ่าย 3':'7-8 hours. No naps after 3 PM.'} };
  const sl=slByAge[ag]||slByAge.adult;
  const water={ title:th?'ดื่มน้ำ 8 แก้ว':'Drink 8 Glasses', time:th?'กระจายตลอดวัน':'Throughout the Day', tips:th?'2-2.5 ลิตร/วัน ช่วยเมตาบอลิซึม':'2-2.5L/day boosts metabolism.' };

  return [
    { id:0,type:'food',subtype:'breakfast',completed:false,theme:'theme-food-am',icon:'fa-mug-hot',
      title:meals.breakfast.title,time:meals.breakfast.time,foods:meals.breakfast.foods,
      nutrients:meals.breakfast.nutrients,tips:meals.breakfast.tips,chips:[th?'เช้า':'AM',th?'พลังงาน':'Energy'] },
    { id:1,type:'food',subtype:'lunch',completed:false,theme:'theme-food-pm',icon:'fa-bowl-food',
      title:meals.lunch.title,time:meals.lunch.time,foods:meals.lunch.foods,
      nutrients:meals.lunch.nutrients,tips:meals.lunch.tips,chips:[th?'เที่ยง':'Noon',th?'สร้างกล้าม':'Muscle'] },
    { id:2,type:'food',subtype:'dinner',completed:false,theme:'theme-food-ev',icon:'fa-utensils',
      title:meals.dinner.title,time:meals.dinner.time,foods:meals.dinner.foods,
      nutrients:meals.dinner.nutrients,tips:meals.dinner.tips,chips:[th?'เย็น':'Eve',th?'เบาสบาย':'Light'] },
    { id:3,type:R?'rest':'workout',completed:false,theme:R?'theme-rest':'theme-workout',icon:R?'fa-couch':'fa-person-running',
      title:R?(th?'วันพักผ่อน':'Rest Day'):wk.title,time:R?(th?'พักกล้ามเนื้อ':'Recovery'):wk.time,
      tips:R?(th?'วันพักสำคัญเท่ากับวันออกกำลัง':'Rest days = muscles grow during recovery.'):wk.tips,
      chips:R?[th?'พัก':'Rest']:[th?'ออกกำลัง':'Workout'],foods:[],nutrients:[] },
    { id:4,type:'water',completed:false,theme:'theme-water',icon:'fa-droplet',
      title:water.title,time:water.time,tips:water.tips,chips:[th?'น้ำ':'Water','2L+'],foods:[],nutrients:[] },
    { id:5,type:'sleep',completed:false,theme:'theme-sleep',icon:'fa-moon',
      title:sl.title,time:sl.time,tips:sl.tips,chips:[th?'นอน':'Sleep'],foods:[],nutrients:[] },
  ];
}

function renderMissions() {
  const ms=getMissions(selectedDate);
  const list=document.getElementById('missionList'); list.innerHTML='';
  let done=0;
  ms.forEach((m,i)=>{
    if (m.completed) done++;
    const card=document.createElement('div');
    card.className=`mission-card ${m.theme} ${m.completed?'done':''}`;
    const chipHTML=(m.chips||[]).map(c=>`<span class="nutrient-chip" style="background:var(--surface2);color:var(--text2)">${c}</span>`).join('');
    const btnIcon=m.completed?'✓':(m.type==='workout'?'▶':'→');
    card.innerHTML=`
      <div class="m-icon"><i class="fa-solid ${m.icon}"></i></div>
      <div class="m-body">
        <div class="m-title">${m.title}</div>
        <div class="m-time">${m.time}</div>
        <div class="m-nutrients">${chipHTML}</div>
      </div>
      <button class="m-btn" onclick="event.stopPropagation();handleMission(${i})">${btnIcon}</button>`;
    card.onclick=()=>handleMission(i);
    list.appendChild(card);
  });
  document.getElementById('progCount').textContent=`${done}/${ms.length}`;
  document.getElementById('progFill').style.width=`${(done/ms.length)*100}%`;
}

function renderWeeklyBars() {
  const wrap=document.getElementById('weeklyBars'); wrap.innerHTML='';
  const daysTH=['อา','จ','อ','พ','พฤ','ศ','ส'],daysEN=['S','M','T','W','T','F','S'];
  const today=new Date(); today.setHours(0,0,0,0);
  const ag2=DB.user?.ageGroup||'adult';
  const goal=(ag2==='child'||ag2==='teen')?60:30;
  for (let i=6;i>=0;i--) {
    const d=new Date(today); d.setDate(today.getDate()-i);
    const ds=toDateStr(d);
    const mins=DB.weeklyMins?.[ds]||0;
    const pct=Math.min((mins/goal)*100,100);
    const names=DB.lang==='th'?daysTH:daysEN;
    const b=document.createElement('div'); b.className='week-bar';
    b.innerHTML=`<div class="bar-wrap"><div class="bar-fill" style="height:${pct}%"></div></div><div class="bar-label">${names[d.getDay()]}</div><div class="bar-mins">${mins>0?mins+'m':''}</div>`;
    wrap.appendChild(b);
  }
}

// ─── MISSION HANDLING ───────────────────────────────────────────
function handleMission(idx) {
  const m=DB.missions[selectedDate][idx];
  if (m.completed) return;
  currentMissionIdx=idx;
  if (m.type==='workout') { startWorkout(); return; }
  openDetail(m);
}

function openDetail(m) {
  document.getElementById('detailTitle').textContent=m.title;
  document.getElementById('detailSub').textContent=m.time;
  const ng=document.getElementById('nutGrid');
  if (m.nutrients&&m.nutrients.length) {
    ng.style.display='grid';
    ng.innerHTML=m.nutrients.map(n=>`<div class="nut-item"><div class="nut-icon">${n.icon}</div><div class="nut-name">${n.name}</div><div class="nut-val">${n.val}</div></div>`).join('');
  } else ng.style.display='none';
  const fl=document.getElementById('foodList');
  fl.innerHTML=m.foods&&m.foods.length?m.foods.map(f=>`<li><span>${f.name}</span><span class="food-cal">${f.cal} kcal</span></li>`).join(''):'';
  const ws=document.getElementById('waterSection');
  if (m.type==='water') { ws.style.display='block'; renderWaterCups(); } else ws.style.display='none';
  const ts=document.getElementById('tipsSection');
  if (m.tips) { ts.style.display='block'; ts.innerHTML=`<b style="color:var(--blue)">💡 ${DB.lang==='th'?'เคล็ดลับ':'Tip'}:</b> ${m.tips}`; } else ts.style.display='none';
  const btn=document.getElementById('detailBtn');
  const colors={'theme-food-am':'--orange','theme-food-pm':'--pink','theme-food-ev':'--purple','theme-workout':'--green','theme-water':'--teal','theme-sleep':'--blue','theme-rest':'--text2'};
  const c=colors[m.theme]||'--green';
  btn.style.background=`var(${c})`; btn.style.color=c==='--text2'?'var(--bg)':'#0D1117';
  btn.textContent=DB.lang==='th'?'✓ ทำเสร็จแล้ว!':'✓ Mark Complete!';
  document.getElementById('detailOverlay').classList.add('active');
}
function closeDetail(e) { if (e) e.stopPropagation(); document.getElementById('detailOverlay').classList.remove('active'); }

function markDone() {
  if (currentMissionIdx===null) return;
  DB.missions[selectedDate][currentMissionIdx].completed=true;
  updateStreakOnComplete(); saveDB(); closeDetail(); renderMissions(); renderWeeklyBars();
  celebrate();
  earnCoins(5, DB.lang==='th'?'ทำภารกิจสำเร็จ':'Mission complete');
  const s=getPetStats(); s.happy=Math.min(100,s.happy+8); s.xp+=5;
  DB.petStats[DB.currentPetId]=s; checkLevelUp(); saveDB();
}

function renderWaterCups() {
  const key=selectedDate; if (!DB.water) DB.water={};
  const count=DB.water[key]||0;
  const row=document.getElementById('waterRow'); row.innerHTML='';
  for (let i=1;i<=8;i++) {
    const cup=document.createElement('div');
    cup.className=`water-cup ${i<=count?'filled':''}`;
    cup.textContent='🥛';
    cup.onclick=()=>{ DB.water[key]=i; saveDB(); renderWaterCups();
      if (i>=8) document.getElementById('waterLabel').textContent=DB.lang==='th'?'🎉 ครบ 8 แก้วแล้ว!':'🎉 All 8 glasses done!'; };
    row.appendChild(cup);
  }
  document.getElementById('waterLabel').textContent=`${count}/8 ${DB.lang==='th'?'แก้ว':'glasses'} ${count>=8?'🎉':''}`;
}

// ─── WORKOUT ────────────────────────────────────────────────────
function startWorkout() {
  const ag=DB.user?.ageGroup||'adult';
  wkRoutine=buildProgram(ag);
  wkIdx=0; caloriesBurned=0;
  buildDots();
  document.getElementById('workoutScreen').classList.add('active');
  loadExercise(0);
}
function buildDots() {
  const dots=document.getElementById('wkDots');
  dots.innerHTML=wkRoutine.map((_,i)=>`<div class="wk-dot ${i===0?'active':''}"></div>`).join('');
}
function updateDots() {
  document.querySelectorAll('.wk-dot').forEach((d,i)=>{
    const step=wkRoutine[i];
    d.className=`wk-dot ${i<wkIdx?'done':i===wkIdx?'active':''}${step&&step.type==='rest'?' rest':''}`;
  });
}
function loadExercise(idx) {
  if (idx>=wkRoutine.length) { endWorkout(); return; }
  const ex=wkRoutine[idx];
  wkPaused=false;
  const isRest=ex.type==='rest';
  document.getElementById('wkExName').textContent=ex.name;
  document.getElementById('wkStepLabel').textContent=`${DB.lang==='th'?'ท่าที่':'Step'} ${idx+1}/${wkRoutine.length}`;
  const banner=document.getElementById('coachBanner');
  const coachText=document.getElementById('coachText');
  if (isRest) {
    banner.className='coach-banner rest-banner';
    coachText.textContent=DB.lang==='th'?'💨 พักหายใจ เตรียมพร้อมสำหรับท่าถัดไป':'💨 Rest and breathe';
    document.getElementById('wkExSub').textContent=DB.lang==='th'?'ช่วงพัก — หายใจลึกๆ':'Rest Interval';
  } else {
    banner.className='coach-banner';
    coachText.textContent=ex.coachTip||'';
    document.getElementById('wkExSub').textContent='';
  }
  const ring=document.getElementById('ringPath');
  ring.setAttribute('class',`ring-fill ${isRest?'rest':''}`);
  ring.style.stroke=isRest?'var(--orange)':'var(--green)';
  document.getElementById('wkTimerLabel').textContent=isRest?(DB.lang==='th'?'พัก':'Rest'):(DB.lang==='th'?'เหลือเวลา':'Time left');
  document.getElementById('muscleTags').innerHTML=isRest?
    `<span class="muscle-tag" style="background:rgba(240,165,0,.12);color:var(--orange);border-color:rgba(240,165,0,.3)">${DB.lang==='th'?'ช่วงพัก':'Rest'}</span>`:
    (ex.muscles||[]).map(m=>`<span class="muscle-tag">${m}</span>`).join('');
  updateDots();
  if (_wkTimerId) { clearInterval(_wkTimerId); _wkTimerId=null; }
  wkTime=ex.dur; wkTotalTime=ex.dur;
  updateTimerDisplay();
  _wkTimerId=setInterval(()=>{
    if (wkPaused) return;
    wkTime--;
    if (wkTime<=0) { clearInterval(_wkTimerId); _wkTimerId=null; updateTimerDisplay(); setTimeout(nextEx,400); return; }
    if (!isRest) {
      const w=DB.user?.weight||70;
      caloriesBurned+=(ex.met*3.5*w/200)/60;
      document.getElementById('burnBadge').textContent=`🔥 ${Math.round(caloriesBurned)} kcal ${DB.lang==='th'?'เผาผลาญแล้ว':'burned'}`;
    }
    updateTimerDisplay();
  },1000);
  document.getElementById('wkPauseBtn').textContent=DB.lang==='th'?'⏸ หยุด':'⏸ Pause';
}
function updateTimerDisplay() {
  const m=Math.floor(wkTime/60).toString().padStart(2,'0');
  const s=(wkTime%60).toString().padStart(2,'0');
  document.getElementById('wkTimer').textContent=`${m}:${s}`;
  const offset=326.7-(wkTime/wkTotalTime)*326.7;
  document.getElementById('ringPath').style.strokeDashoffset=offset;
}
function togglePause() {
  wkPaused=!wkPaused;
  document.getElementById('wkPauseBtn').textContent=wkPaused?(DB.lang==='th'?'▶ เล่นต่อ':'▶ Resume'):(DB.lang==='th'?'⏸ หยุด':'⏸ Pause');
}
function nextEx() { clearInterval(_wkTimerId); _wkTimerId=null; wkIdx++; loadExercise(wkIdx); }
function endWorkout() {
  clearInterval(_wkTimerId);
  document.getElementById('workoutScreen').classList.remove('active');
  const totalMins=wkRoutine.reduce((s,r)=>s+(r.type==='ex'?r.dur:0),0)/60;
  if (!DB.weeklyMins) DB.weeklyMins={};
  DB.weeklyMins[selectedDate]=Math.round(totalMins);
  if (currentMissionIdx!==null) { DB.missions[selectedDate][currentMissionIdx].completed=true; updateStreakOnComplete(); }
  const s=getPetStats(); s.happy=Math.min(100,s.happy+25); s.energy=Math.min(100,s.energy+20); s.xp+=30;
  DB.petStats[DB.currentPetId]=s; checkLevelUp();
  const coins=COIN_REWARDS['standard']||30;
  DB.coins=(DB.coins||0)+coins; DB.totalCoinsEarned=(DB.totalCoinsEarned||0)+coins;
  saveDB(); updateCoinDisplays(); renderMissions(); renderWeeklyBars(); celebrate();
  showReward(DB.lang==='th'?'ออกกำลังกายเสร็จแล้ว! 💪':'Workout done! 💪', coins, `🔥 ${Math.round(caloriesBurned)} kcal · ⏱ ${Math.round(totalMins)} min`);
}
function closeWorkout() { clearInterval(_wkTimerId); _wkTimerId=null; document.getElementById('workoutScreen').classList.remove('active'); }

// ════════════════════════════════════════════════════════════════
// ─── FOOD SCANNER (Claude Vision) ───────────────────────────────
// ════════════════════════════════════════════════════════════════

let pendingFoodMeal = 'lunch';

function renderFoodTab() {
  renderTodayNutritionSummary();
  renderFoodLogList();
}

function renderTodayNutritionSummary() {
  const el = document.getElementById('nutritionSummaryCard');
  if (!el) return;
  const logs = (DB.foodLogs||{})[todayStr] || [];
  const totals = logs.reduce((acc, e) => {
    acc.calories  += e.nutrients.calories    || 0;
    acc.protein   += e.nutrients.protein_g   || 0;
    acc.carbs     += e.nutrients.carbs_g     || 0;
    acc.sugar     += e.nutrients.sugar_g     || 0;
    acc.fat       += e.nutrients.fat_g       || 0;
    acc.sodium    += e.nutrients.sodium_mg   || 0;
    acc.fiber     += e.nutrients.fiber_g     || 0;
    acc.meals++;
    return acc;
  }, { calories:0, protein:0, carbs:0, sugar:0, fat:0, sodium:0, fiber:0, meals:0 });

  const goal = DB.user?.ageGroup === 'child' ? 1800 : DB.user?.ageGroup === 'teen' ? 2200 : 2000;
  const pct = Math.min(100, Math.round((totals.calories/goal)*100));
  const th = DB.lang === 'th';

  el.innerHTML = `
    <div class="nut-sum-head">
      <div>
        <div class="nut-sum-title">${th?'แคลอรี่วันนี้':'Today\'s Calories'}</div>
        <div class="nut-sum-kcal">${Math.round(totals.calories)} <span>/ ${goal} kcal</span></div>
      </div>
      <div class="nut-sum-meals">${totals.meals} ${th?'มื้อ':'meals'}</div>
    </div>
    <div class="nut-cal-bar-wrap">
      <div class="nut-cal-bar" style="width:${pct}%;background:${pct>110?'var(--red)':pct>80?'var(--orange)':'var(--green)'}"></div>
    </div>
    <div class="nut-macro-row">
      <div class="nut-macro-chip" style="background:rgba(88,166,255,.15);color:var(--blue)">
        <span>${th?'โปรตีน':'Protein'}</span><b>${Math.round(totals.protein)}g</b>
      </div>
      <div class="nut-macro-chip" style="background:rgba(240,165,0,.15);color:var(--orange)">
        <span>${th?'คาร์บ':'Carbs'}</span><b>${Math.round(totals.carbs)}g</b>
      </div>
      <div class="nut-macro-chip" style="background:rgba(255,107,107,.15);color:var(--red)">
        <span>${th?'น้ำตาล':'Sugar'}</span><b>${Math.round(totals.sugar)}g</b>
      </div>
      <div class="nut-macro-chip" style="background:rgba(188,140,255,.15);color:var(--purple)">
        <span>${th?'ไขมัน':'Fat'}</span><b>${Math.round(totals.fat)}g</b>
      </div>
      <div class="nut-macro-chip" style="background:rgba(0,217,181,.15);color:var(--teal)">
        <span>${th?'โซเดียม':'Sodium'}</span><b>${Math.round(totals.sodium)}mg</b>
      </div>
    </div>`;
}

function renderFoodLogList() {
  const el = document.getElementById('foodLogList');
  if (!el) return;
  const logs = [...((DB.foodLogs||{})[todayStr] || [])].reverse();
  const th = DB.lang === 'th';
  if (!logs.length) {
    el.innerHTML = `<div class="empty-state">📷<br>${th?'ยังไม่มีรายการอาหาร<br>ถ่ายรูปอาหารเพื่อเริ่มต้น!':'No food logged yet.<br>Scan your meal to get started!'}</div>`;
    return;
  }
  el.innerHTML = logs.map(e => `
    <div class="food-log-card">
      ${e.imageBase64 ? `<img class="food-log-img" src="${e.imageBase64}" alt="">` : `<div class="food-log-img no-img">🍽</div>`}
      <div class="food-log-body">
        <div class="food-log-name">${e.foodName}</div>
        <div class="food-log-time">${e.meal ? mealLabel(e.meal,th) : ''} · ${new Date(e.timestamp).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}</div>
        <div class="food-log-macros">
          <span class="fl-chip cal">🔥 ${Math.round(e.nutrients.calories)} kcal</span>
          <span class="fl-chip pro">💪 ${Math.round(e.nutrients.protein_g||0)}g</span>
          <span class="fl-chip sug">🍬 ${Math.round(e.nutrients.sugar_g||0)}g</span>
          <span class="fl-chip sod">🧂 ${Math.round(e.nutrients.sodium_mg||0)}mg</span>
        </div>
        ${e.healthScore ? `<div class="food-health-score" style="color:${e.healthScore>=7?'var(--green)':e.healthScore>=4?'var(--orange)':'var(--red)'}">
          ${'⭐'.repeat(Math.round(e.healthScore/2))} ${th?'คะแนนสุขภาพ':'Health'}: ${e.healthScore}/10</div>` : ''}
        ${e.warnings && e.warnings.length ? `<div class="food-warnings">⚠️ ${e.warnings.slice(0,2).join(' · ')}</div>` : ''}
      </div>
      <button class="food-log-del" onclick="deleteFoodLog('${e.id}')">×</button>
    </div>`).join('');
}

function mealLabel(meal, th) {
  const m = { breakfast: th?'มื้อเช้า':'Breakfast', lunch: th?'มื้อกลางวัน':'Lunch', dinner: th?'มื้อเย็น':'Dinner', snack: th?'ของว่าง':'Snack' };
  return m[meal] || meal;
}

function deleteFoodLog(id) {
  if (!DB.foodLogs) DB.foodLogs = {};
  if (!DB.foodLogs[todayStr]) return;
  DB.foodLogs[todayStr] = DB.foodLogs[todayStr].filter(e => e.id !== id);
  aggregateWeeklyNutrition();
  saveDB(); renderFoodTab();
  const wk = getCurrentWeekKey();
  DB.weeklyRisks[wk] = calculateRiskScores(DB.healthProfile, DB.weeklyNutrition[wk], DB.user);
  saveDB(); renderHealthTab();
}

function openFoodScanner(meal) {
  pendingFoodMeal = meal || 'lunch';
  document.getElementById('mealSelectBtns').querySelectorAll('.meal-sel-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.meal === pendingFoodMeal);
  });
  document.getElementById('scanResultSection').style.display = 'none';
  document.getElementById('scanLoadingSection').style.display = 'none';
  document.getElementById('scanIdleSection').style.display = 'flex';
  document.getElementById('foodScanOverlay').classList.add('active');
}
function closeFoodScanner() { document.getElementById('foodScanOverlay').classList.remove('active'); }
function selectMealType(meal) {
  pendingFoodMeal = meal;
  document.getElementById('mealSelectBtns').querySelectorAll('.meal-sel-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.meal === meal);
  });
}

function triggerCamera() { document.getElementById('foodCameraInput').click(); }
function triggerGallery() { document.getElementById('foodGalleryInput').click(); }

async function handleFoodFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';

  // Show loading
  document.getElementById('scanIdleSection').style.display = 'none';
  document.getElementById('scanResultSection').style.display = 'none';
  document.getElementById('scanLoadingSection').style.display = 'flex';

  try {
    // Resize + convert to base64
    const { base64, mediaType, smallBase64 } = await processImageFile(file);
    // Call Claude Vision API
    const result = await callClaudeVision(base64, mediaType);
    // Show result
    displayScanResult(result, smallBase64);
  } catch (err) {
    console.error(err);
    document.getElementById('scanLoadingSection').style.display = 'none';
    document.getElementById('scanIdleSection').style.display = 'flex';
    alert((DB.lang==='th'?'ไม่สามารถวิเคราะห์รูปภาพได้: ':'Could not analyze image: ') + err.message);
  }
}

async function processImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // Full size for API (max 1024px)
      const maxSide = 1024;
      let w = img.width, h = img.height;
      if (w > maxSide || h > maxSide) {
        if (w > h) { h = Math.round(h*maxSide/w); w = maxSide; }
        else       { w = Math.round(w*maxSide/h); h = maxSide; }
      }
      const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      const base64 = canvas.toDataURL('image/jpeg',0.8).split(',')[1];

      // Thumbnail for log display
      const th = Math.min(80, img.width), tw = Math.min(80, img.width);
      const tc = document.createElement('canvas'); tc.width=80; tc.height=80;
      tc.getContext('2d').drawImage(img,0,0,80,80);
      const smallBase64 = tc.toDataURL('image/jpeg',0.5);

      URL.revokeObjectURL(url);
      resolve({ base64, mediaType:'image/jpeg', smallBase64 });
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = url;
  });
}

async function callClaudeVision(base64, mediaType) {
  const th = DB.lang === 'th';
  const prompt = `Analyze this food image carefully. Return ONLY a valid JSON object with NO markdown, NO explanation, NO code blocks. Use this exact structure:
{
  "foodName": "ชื่ออาหารภาษาไทย",
  "foodNameEn": "English food name",
  "servingSize": "estimated serving size e.g. 1 plate 350g",
  "confidence": 0.9,
  "calories": 450,
  "protein_g": 15,
  "carbs_g": 55,
  "sugar_g": 8,
  "fat_g": 14,
  "saturatedFat_g": 4,
  "sodium_mg": 750,
  "fiber_g": 3,
  "cholesterol_mg": 60,
  "healthScore": 6,
  "warnings": ["high sodium","processed"],
  "benefits": ["good protein source"],
  "ingredients": ["rice","chicken","vegetables"]
}
Estimate realistic Thai portion sizes. If not food, return healthScore:0 and foodName:"ไม่ใช่อาหาร".`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: prompt }
        ]
      }]
    })
  });

  if (!response.ok) throw new Error('API error ' + response.status);
  const data = await response.json();
  const text = data.content.map(i => i.text||'').join('');
  const clean = text.replace(/```json|```/g,'').trim();
  return JSON.parse(clean);
}

let _pendingScanResult = null;
let _pendingSmallBase64 = null;

function displayScanResult(result, smallBase64) {
  _pendingScanResult = result;
  _pendingSmallBase64 = smallBase64;
  document.getElementById('scanLoadingSection').style.display = 'none';
  const el = document.getElementById('scanResultSection');
  el.style.display = 'block';
  const th = DB.lang === 'th';
  const hs = result.healthScore || 0;
  const hsColor = hs >= 7 ? 'var(--green)' : hs >= 4 ? 'var(--orange)' : 'var(--red)';

  el.innerHTML = `
    <div style="text-align:center;margin-bottom:14px">
      <div class="scan-food-name">${result.foodName}</div>
      <div style="font-size:.8rem;color:var(--text2);margin-bottom:8px">${result.foodNameEn} · ${result.servingSize||''}</div>
      <div style="font-size:1.3rem;font-weight:800;color:${hsColor}">
        ${'⭐'.repeat(Math.round(hs/2))} ${th?'คะแนนสุขภาพ':'Health Score'}: ${hs}/10
      </div>
    </div>
    <div class="scan-nut-grid">
      <div class="scan-nut-item"><div class="sni-icon">🔥</div><div class="sni-val">${Math.round(result.calories||0)}</div><div class="sni-name">kcal</div></div>
      <div class="scan-nut-item"><div class="sni-icon">💪</div><div class="sni-val">${Math.round(result.protein_g||0)}g</div><div class="sni-name">${th?'โปรตีน':'Protein'}</div></div>
      <div class="scan-nut-item"><div class="sni-icon">🌾</div><div class="sni-val">${Math.round(result.carbs_g||0)}g</div><div class="sni-name">${th?'คาร์บ':'Carbs'}</div></div>
      <div class="scan-nut-item"><div class="sni-icon">🍬</div><div class="sni-val">${Math.round(result.sugar_g||0)}g</div><div class="sni-name">${th?'น้ำตาล':'Sugar'}</div></div>
      <div class="scan-nut-item"><div class="sni-icon">🥑</div><div class="sni-val">${Math.round(result.fat_g||0)}g</div><div class="sni-name">${th?'ไขมัน':'Fat'}</div></div>
      <div class="scan-nut-item"><div class="sni-icon">🧂</div><div class="sni-val">${Math.round(result.sodium_mg||0)}</div><div class="sni-name">mg</div></div>
    </div>
    ${result.warnings&&result.warnings.length?`<div class="scan-warnings">⚠️ ${result.warnings.join(' · ')}</div>`:''}
    ${result.benefits&&result.benefits.length?`<div class="scan-benefits">✅ ${result.benefits.join(' · ')}</div>`:''}
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn-scan-save" onclick="saveScanResult()" style="flex:1;background:linear-gradient(135deg,var(--green),var(--teal));color:#0D1117;border:none;border-radius:12px;padding:12px;font-family:Prompt,sans-serif;font-size:.9rem;font-weight:800;cursor:pointer">
        💾 ${th?'บันทึกอาหาร':'Save Food Log'}
      </button>
      <button onclick="document.getElementById('scanIdleSection').style.display='flex';document.getElementById('scanResultSection').style.display='none';" style="padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;font-size:.85rem">
        🔄 ${th?'สแกนใหม่':'Rescan'}
      </button>
    </div>`;
}

function saveScanResult() {
  if (!_pendingScanResult) return;
  const entry = {
    id: Date.now().toString(),
    date: todayStr,
    meal: pendingFoodMeal,
    foodName: _pendingScanResult.foodName,
    foodNameEn: _pendingScanResult.foodNameEn,
    imageBase64: _pendingSmallBase64,
    nutrients: {
      calories:     _pendingScanResult.calories     || 0,
      protein_g:    _pendingScanResult.protein_g    || 0,
      carbs_g:      _pendingScanResult.carbs_g      || 0,
      sugar_g:      _pendingScanResult.sugar_g      || 0,
      fat_g:        _pendingScanResult.fat_g        || 0,
      saturatedFat_g: _pendingScanResult.saturatedFat_g || 0,
      sodium_mg:    _pendingScanResult.sodium_mg    || 0,
      fiber_g:      _pendingScanResult.fiber_g      || 0,
      cholesterol_mg: _pendingScanResult.cholesterol_mg || 0,
    },
    healthScore: _pendingScanResult.healthScore,
    warnings: _pendingScanResult.warnings || [],
    benefits: _pendingScanResult.benefits || [],
    timestamp: Date.now(),
  };

  if (!DB.foodLogs) DB.foodLogs = {};
  if (!DB.foodLogs[todayStr]) DB.foodLogs[todayStr] = [];
  DB.foodLogs[todayStr].push(entry);

  aggregateWeeklyNutrition();
  const wk = getCurrentWeekKey();
  DB.weeklyRisks[wk] = calculateRiskScores(DB.healthProfile, DB.weeklyNutrition[wk], DB.user);

  earnCoins(3, DB.lang==='th'?'บันทึกอาหาร':'Food logged');
  saveDB();
  closeFoodScanner();
  renderFoodTab();
  renderHealthTab();
  celebrate();
  _pendingScanResult = null;
  _pendingSmallBase64 = null;
}

// ─── WEEKLY NUTRITION AGGREGATION ───────────────────────────────
function aggregateWeeklyNutrition() {
  if (!DB.foodLogs) return;
  const wkMap = {};
  Object.entries(DB.foodLogs).forEach(([date, logs]) => {
    const wk = getWeekKey(date);
    if (!wkMap[wk]) wkMap[wk] = { totalCalories:0,totalProtein:0,totalCarbs:0,totalSugar:0,totalFat:0,totalSatFat:0,totalSodium:0,totalFiber:0,totalCholesterol:0,mealsLogged:0,days:new Set() };
    wkMap[wk].days.add(date);
    logs.forEach(e => {
      const n = e.nutrients;
      wkMap[wk].totalCalories  += n.calories      || 0;
      wkMap[wk].totalProtein   += n.protein_g     || 0;
      wkMap[wk].totalCarbs     += n.carbs_g       || 0;
      wkMap[wk].totalSugar     += n.sugar_g       || 0;
      wkMap[wk].totalFat       += n.fat_g         || 0;
      wkMap[wk].totalSatFat    += n.saturatedFat_g|| 0;
      wkMap[wk].totalSodium    += n.sodium_mg     || 0;
      wkMap[wk].totalFiber     += n.fiber_g       || 0;
      wkMap[wk].totalCholesterol += n.cholesterol_mg||0;
      wkMap[wk].mealsLogged++;
    });
  });
  // Convert Sets to counts
  Object.keys(wkMap).forEach(wk => {
    wkMap[wk].days = wkMap[wk].days.size;
  });
  DB.weeklyNutrition = wkMap;
}

// ════════════════════════════════════════════════════════════════
// ─── DISEASE RISK ENGINE ────────────────────────────────────────
// ════════════════════════════════════════════════════════════════

function calculateRiskScores(profile, weekNutrition, user) {
  const p = profile || {};
  const wn = weekNutrition || {};
  const days = wn.days || 1;
  const u = user || {};

  const avgCal    = days ? (wn.totalCalories||0) / days : 0;
  const avgSugar  = days ? (wn.totalSugar||0)    / days : 0;
  const avgSodium = days ? (wn.totalSodium||0)   / days : 0;
  const avgFat    = days ? (wn.totalFat||0)      / days : 0;
  const avgSatFat = days ? (wn.totalSatFat||0)   / days : 0;

  const bmi   = u.bmi  || 22;
  const age   = u.age  || 30;
  const exDays = p.exerciseDaysPerWeek || 3;
  const sleep  = p.sleepHoursAvg || 7;
  const stress = p.stressLevel   || 2;
  const salt   = p.saltIntake    || 2;
  const sugar  = p.sugarIntake   || 2;
  const alcohol= p.alcoholDrinksPerWeek || 0;
  const smoke  = p.smokingStatus || 'never';
  const water  = p.waterGlassesPerDay  || 6;
  const ff     = p.fastFoodPerWeek     || 1;
  const fh     = p.familyHistory       || [];
  const fat_q  = p.fatIntake           || 2;

  // ── Diabetes ──────────────────────────────────────
  let d = 5;
  if (fh.includes('diabetes'))  d += 25;
  if (bmi >= 30) d += 22; else if (bmi >= 27) d += 14; else if (bmi >= 25) d += 8;
  if (exDays < 2) d += 18; else if (exDays < 4) d += 9;
  if (sugar >= 4) d += 15; else if (sugar >= 3) d += 8;
  if (avgSugar > 60) d += 18; else if (avgSugar > 40) d += 10; else if (avgSugar > 25) d += 5;
  if (ff >= 5) d += 10; else if (ff >= 3) d += 5;
  if (age >= 60) d += 12; else if (age >= 45) d += 6;
  if (stress >= 4) d += 6;
  if (sleep < 6) d += 8; else if (sleep < 7) d += 4;

  // ── Hypertension ──────────────────────────────────
  let h = 5;
  if (fh.includes('hypertension')) h += 22;
  if (salt >= 4) h += 22; else if (salt >= 3) h += 12;
  if (avgSodium > 3500) h += 22; else if (avgSodium > 2300) h += 14; else if (avgSodium > 1500) h += 6;
  if (stress >= 4) h += 15; else if (stress >= 3) h += 8;
  if (exDays < 3) h += 10;
  if (alcohol > 14) h += 16; else if (alcohol > 7) h += 8;
  if (bmi >= 30) h += 15; else if (bmi >= 25) h += 8;
  if (sleep < 6) h += 12; else if (sleep < 7) h += 6;
  if (smoke === 'current') h += 12;
  if (age >= 55) h += 8; else if (age >= 45) h += 4;

  // ── Heart Disease ──────────────────────────────────
  let hd = 5;
  if (fh.includes('heart'))    hd += 25;
  if (smoke === 'current')     hd += 28; else if (smoke === 'former') hd += 10;
  if (exDays < 3)              hd += 15; else if (exDays < 5)         hd += 7;
  if (avgSatFat > 22) hd += 18; else if (avgSatFat > 14) hd += 10;
  if (stress >= 4)   hd += 12; else if (stress >= 3) hd += 6;
  if (bmi >= 30)     hd += 12; else if (bmi >= 25) hd += 6;
  if (alcohol > 14)  hd += 12; else if (alcohol > 7) hd += 5;
  if (age >= 55)     hd += 8;
  if (fat_q >= 4)    hd += 8;

  // ── Kidney Disease ─────────────────────────────────
  let k = 5;
  if (fh.includes('kidney'))  k += 22;
  if (avgSodium > 3500)       k += 18; else if (avgSodium > 2300) k += 10;
  if (d > 50)                 k += 18; else if (d > 30) k += 9;
  if (h > 50)                 k += 12; else if (h > 30) k += 6;
  if (water < 5) k += 18; else if (water < 7) k += 8;
  if (smoke === 'current') k += 10;
  if (bmi >= 30) k += 8;

  // ── Obesity ────────────────────────────────────────
  let ob = 5;
  if (bmi >= 30)      ob = Math.max(ob, 65); else if (bmi >= 27) ob = Math.max(ob, 45); else if (bmi >= 25) ob = Math.max(ob, 28);
  if (avgCal > 2800)  ob += 22; else if (avgCal > 2200) ob += 12; else if (avgCal > 1800) ob += 4;
  if (exDays < 2)     ob += 18; else if (exDays < 4) ob += 8;
  if (ff >= 5)        ob += 15; else if (ff >= 3) ob += 7;
  if (sugar >= 4)     ob += 10; else if (sugar >= 3) ob += 5;
  if (sleep < 6)      ob += 10;

  // ── Liver Disease ──────────────────────────────────
  let lv = 5;
  if (fh.includes('liver'))   lv += 18;
  if (alcohol > 21)  lv = Math.max(lv+35, 60); else if (alcohol > 14) lv += 28; else if (alcohol > 7) lv += 12;
  if (bmi >= 30)     lv += 16; else if (bmi >= 25) lv += 8;
  if (avgFat > 90)   lv += 12; else if (avgFat > 70) lv += 6;
  if (smoke === 'current') lv += 8;
  if (exDays < 2)    lv += 8;

  // ── High Cholesterol ───────────────────────────────
  let ch = 5;
  if (fh.includes('cholesterol')) ch += 22;
  if (avgSatFat > 22) ch += 22; else if (avgSatFat > 14) ch += 12;
  if (exDays < 3)     ch += 14;
  if (bmi >= 30)      ch += 16; else if (bmi >= 25) ch += 8;
  if (smoke === 'current') ch += 10;
  if (fat_q >= 4)     ch += 12; else if (fat_q >= 3) ch += 6;
  if (avgCal > 2800)  ch += 8;

  return {
    diabetes:     Math.min(98, Math.round(d)),
    hypertension: Math.min(98, Math.round(h)),
    heart:        Math.min(98, Math.round(hd)),
    kidney:       Math.min(98, Math.round(k)),
    obesity:      Math.min(98, Math.round(ob)),
    liver:        Math.min(98, Math.round(lv)),
    cholesterol:  Math.min(98, Math.round(ch)),
  };
}

function getProjectedOnsetAge(disease, riskScore, currentAge) {
  const baseOnset = { diabetes:65, hypertension:55, heart:70, kidney:62, obesity:38, liver:52, cholesterol:58 };
  const base = baseOnset[disease] || 65;
  const reduction = riskScore * 0.32;
  return Math.max(currentAge + 3, Math.round(base - reduction));
}

function getRiskLevel(score, th) {
  if (score >= 70) return { text: th?'สูงมาก':'Very High', color:'var(--red)' };
  if (score >= 50) return { text: th?'สูง':'High',         color:'var(--orange)' };
  if (score >= 30) return { text: th?'ปานกลาง':'Moderate', color:'#FFD700' };
  return                  { text: th?'ต่ำ':'Low',           color:'var(--green)' };
}

function getLatestRisks() {
  const wk = getCurrentWeekKey();
  return DB.weeklyRisks?.[wk] || {};
}

// ─── WEEKLY RISK ALERT ──────────────────────────────────────────
function checkWeeklyRiskAlert() {
  const wk = getCurrentWeekKey();
  if (DB.riskAlertShown?.[wk]) return;
  const risks = getLatestRisks();
  if (!risks || !Object.keys(risks).length) return;
  const highRisks = Object.entries(risks).filter(([,v]) => v >= 50);
  if (!highRisks.length) return;
  // Show alert only once per week
  DB.riskAlertShown = DB.riskAlertShown || {};
  DB.riskAlertShown[wk] = true;
  saveDB();
  // Show after small delay
  setTimeout(() => showWeeklyRiskPopup(highRisks, risks), 1500);
}

function showWeeklyRiskPopup(highRisks, allRisks) {
  const th = DB.lang === 'th';
  const el = document.getElementById('weeklyAlertPopup');
  const top3 = highRisks.sort((a,b)=>b[1]-a[1]).slice(0,3);
  el.innerHTML = `
    <div class="reward-card" style="max-width:340px">
      <div style="font-size:2.5rem;margin-bottom:8px">🏥</div>
      <div style="font-family:Prompt,sans-serif;font-size:1.2rem;font-weight:800;color:var(--orange);margin-bottom:6px">
        ${th?'รายงานสุขภาพประจำสัปดาห์':'Weekly Health Report'}
      </div>
      <div style="font-size:.82rem;color:var(--text2);margin-bottom:14px">
        ${th?'พบความเสี่ยงที่ควรระวัง':'Health risks detected this week'}
      </div>
      ${top3.map(([disease, score]) => {
        const cfg = DISEASES[disease];
        const lvl = getRiskLevel(score, th);
        const reduce = th ? cfg.reduceTH : cfg.reduceEN;
        return `<div style="background:var(--surface2);border-radius:12px;padding:10px 12px;margin-bottom:8px;text-align:left;border-left:3px solid ${lvl.color}">
          <div style="font-weight:700;color:${lvl.color}">${cfg.emoji} ${th?cfg.nameTH:cfg.nameEN} — ${score}%</div>
          <div style="font-size:.78rem;color:var(--text2);margin-top:3px">💡 ${reduce}</div>
        </div>`;
      }).join('')}
      <button class="btn-primary" style="margin-top:12px" onclick="document.getElementById('weeklyAlertPopup').style.display='none';switchTab('health')">
        ${th?'ดูรายละเอียด':'View Details'}
      </button>
      <button style="width:100%;padding:10px;margin-top:6px;border-radius:12px;border:1px solid var(--border);background:transparent;color:var(--text2);cursor:pointer;font-size:.85rem" onclick="document.getElementById('weeklyAlertPopup').style.display='none'">
        ${th?'ปิด':'Close'}
      </button>
    </div>`;
  el.style.display = 'flex';
}

// ─── HEALTH TAB RENDERING ────────────────────────────────────────
function renderHealthTab() {
  if (!DB.healthProfile) {
    const el = document.getElementById('healthTabContent');
    if (!el) return;
    const th = DB.lang==='th';
    el.innerHTML = `<div class="empty-state" style="margin-top:40px">🏥<br><br>${th?'กรุณากรอกแบบสอบถามสุขภาพก่อน<br>เพื่อรับการคาดการณ์ความเสี่ยงโรค':'Please complete the health questionnaire<br>to receive disease risk predictions'}<br><br>
      <button class="btn-primary" style="width:auto;padding:12px 28px;margin-top:4px" onclick="reopenQuestionnaire()">${th?'กรอกแบบสอบถาม':'Fill Questionnaire'}</button></div>`;
    return;
  }
  renderDiseaseRiskDashboard();
}

function switchHealthSub(sub) {
  DB.activeHealthSub = sub;
  document.querySelectorAll('.health-sub-btn').forEach(b => b.classList.toggle('active', b.dataset.sub === sub));
  document.getElementById('healthRiskSection').style.display  = sub==='risk'  ? 'block' : 'none';
  document.getElementById('healthLifeSection').style.display  = sub==='life'  ? 'block' : 'none';
  document.getElementById('healthAlertSection').style.display = sub==='alerts'? 'block' : 'none';
  if (sub === 'alerts') renderAlertsSection();
  if (sub === 'life')   renderLifestyleSection();
}

function renderDiseaseRiskDashboard() {
  const el = document.getElementById('healthTabContent');
  if (!el) return;
  const th = DB.lang==='th';
  const wk = getCurrentWeekKey();

  // Recalculate risks with latest data
  const risks = calculateRiskScores(DB.healthProfile, DB.weeklyNutrition[wk], DB.user);
  DB.weeklyRisks[wk] = risks;
  saveDB();

  const sub = DB.activeHealthSub || 'risk';

  el.innerHTML = `
    <!-- Subtabs -->
    <div class="health-subtab-row">
      <button class="health-sub-btn ${sub==='risk'?'active':''}" data-sub="risk" onclick="switchHealthSub('risk')">
        🎯 ${th?'ความเสี่ยง':'Risk'}
      </button>
      <button class="health-sub-btn ${sub==='alerts'?'active':''}" data-sub="alerts" onclick="switchHealthSub('alerts')">
        ⚠️ ${th?'คำแนะนำ':'Alerts'}
      </button>
      <button class="health-sub-btn ${sub==='life'?'active':''}" data-sub="life" onclick="switchHealthSub('life')">
        ✨ ${th?'ไลฟ์สไตล์':'Lifestyle'}
      </button>
    </div>

    <!-- Risk Section -->
    <div id="healthRiskSection" style="${sub==='risk'?'':'display:none'}">
      <div class="health-wk-label">${th?`สัปดาห์นี้ (${wk})`:`This Week (${wk})`}</div>
      ${Object.entries(DISEASES).map(([key, cfg]) => {
        const score = risks[key] || 0;
        const lvl = getRiskLevel(score, th);
        const onsetAge = getProjectedOnsetAge(key, score, DB.user?.age||30);
        return `
        <div class="risk-card" onclick="toggleRiskDetail('${key}')">
          <div class="risk-card-head">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="risk-emoji-badge" style="background:${cfg.color}22">${cfg.emoji}</div>
              <div>
                <div class="risk-disease-name">${th?cfg.nameTH:cfg.nameEN}</div>
                <div class="risk-onset">${th?'คาดการณ์เป็นตอนอายุ':'Projected onset'}: ~${onsetAge} ${th?'ปี':'yrs'}</div>
              </div>
            </div>
            <div style="text-align:right">
              <div class="risk-score" style="color:${lvl.color}">${score}%</div>
              <div class="risk-level-label" style="color:${lvl.color}">${lvl.text}</div>
            </div>
          </div>
          <div class="risk-bar-wrap"><div class="risk-bar-fill" style="width:${score}%;background:${lvl.color}"></div></div>
          <div class="risk-detail" id="rd_${key}" style="display:none">
            <div class="risk-advice">💡 ${th?cfg.reduceTH:cfg.reduceEN}</div>
          </div>
        </div>`;
      }).join('')}
      <div style="font-size:.72rem;color:var(--text3);text-align:center;margin:12px 0;padding:0 8px">
        ${th?'* การคาดการณ์นี้เป็นเพียงการประมาณการ ไม่ใช่การวินิจฉัยทางการแพทย์':'* Estimates only, not medical diagnosis'}
      </div>
    </div>

    <!-- Alerts Section -->
    <div id="healthAlertSection" style="${sub==='alerts'?'':'display:none'}"></div>

    <!-- Lifestyle Section -->
    <div id="healthLifeSection" style="${sub==='life'?'':'display:none'}"></div>
  `;

  if (sub==='alerts') renderAlertsSection();
  if (sub==='life')   renderLifestyleSection();
}

function toggleRiskDetail(key) {
  const el = document.getElementById(`rd_${key}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function renderAlertsSection() {
  const el = document.getElementById('healthAlertSection');
  if (!el) return;
  const th = DB.lang==='th';
  const risks = getLatestRisks();
  const wn = DB.weeklyNutrition?.[getCurrentWeekKey()] || {};
  const days = wn.days || 1;
  const avgSugar  = days ? (wn.totalSugar||0)  / days : 0;
  const avgSodium = days ? (wn.totalSodium||0) / days : 0;
  const avgCal    = days ? (wn.totalCalories||0)/ days : 0;
  const avgFat    = days ? (wn.totalFat||0)    / days : 0;

  const alerts = [];

  if (risks.diabetes > 50 || avgSugar > 40) {
    alerts.push({ color:'#FF6B35', icon:'🩸', title: th?'เบาหวาน — ลดน้ำตาล':'Diabetes — Cut Sugar',
      items: th
        ? [`น้ำตาลเฉลี่ย: ${Math.round(avgSugar)}g/วัน (เป้าหมาย ≤ 25g)`, 'ลดเครื่องดื่มหวาน น้ำอัดลม', 'เพิ่มออกกำลังกาย 30 นาที/วัน', 'เลือกผลไม้ที่น้ำตาลต่ำ']
        : [`Daily sugar avg: ${Math.round(avgSugar)}g (target ≤ 25g)`, 'Cut sugary drinks & soda', 'Exercise 30+ min/day', 'Choose low-sugar fruits'] });
  }
  if (risks.hypertension > 50 || avgSodium > 2300) {
    alerts.push({ color:'#FF4757', icon:'❤️', title: th?'ความดันสูง — ลดเกลือ':'Hypertension — Cut Salt',
      items: th
        ? [`โซเดียมเฉลี่ย: ${Math.round(avgSodium)}mg/วัน (เป้าหมาย ≤ 1,500mg)`, 'ลดอาหารหมักดอง อาหารแปรรูป', 'ผ่อนคลายความเครียด นอนหลับให้เพียงพอ', 'ออกกำลังกาย 30 นาที/วัน']
        : [`Sodium avg: ${Math.round(avgSodium)}mg/day (target ≤ 1,500mg)`, 'Cut pickled and processed foods', 'Manage stress, sleep well', 'Exercise 30+ min/day'] });
  }
  if (risks.heart > 50 || avgFat > 70) {
    alerts.push({ color:'#FF3F34', icon:'💔', title: th?'หัวใจ — ลดไขมัน':'Heart — Cut Fat',
      items: th
        ? [`ไขมันเฉลี่ย: ${Math.round(avgFat)}g/วัน (เป้าหมาย ≤ 65g)`, 'ลดของทอด อาหารมันๆ', 'เพิ่มปลา ถั่ว ธัญพืช', 'ออกกำลังกายแบบคาร์ดิโอ']
        : [`Fat avg: ${Math.round(avgFat)}g/day (target ≤ 65g)`, 'Cut fried and fatty foods', 'Eat more fish, nuts, whole grains', 'Do cardio exercise'] });
  }
  if (risks.obesity > 50 || avgCal > 2500) {
    alerts.push({ color:'#FFA502', icon:'⚖️', title: th?'โรคอ้วน — ควบคุมแคลอรี่':'Obesity — Control Calories',
      items: th
        ? [`แคลอรี่เฉลี่ย: ${Math.round(avgCal)} kcal/วัน`, 'ลดอาหารแปรรูป fast food', 'เพิ่มผักและไฟเบอร์', 'ออกกำลังกายสม่ำเสมอ']
        : [`Calories avg: ${Math.round(avgCal)} kcal/day`, 'Cut processed & fast food', 'Increase vegetables & fiber', 'Exercise regularly'] });
  }
  if (risks.kidney > 50) {
    alerts.push({ color:'#A29BFE', icon:'🫘', title: th?'ไต — เพิ่มน้ำ ลดเกลือ':'Kidney — Hydrate, Cut Salt',
      items: th
        ? ['ดื่มน้ำ 8-10 แก้ว/วัน', 'ลดโซเดียมต่ำกว่า 1,500mg/วัน', 'หลีกเลี่ยงยาแก้ปวด NSAIDs บ่อยๆ', 'ตรวจสุขภาพไตประจำปี']
        : ['Drink 8-10 glasses/day', 'Keep sodium below 1,500mg/day', 'Avoid frequent NSAID pain relievers', 'Annual kidney function check'] });
  }

  if (!alerts.length) {
    el.innerHTML = `<div class="empty-state">✅<br><br>${th?'สุขภาพดีเยี่ยม! ไม่พบความเสี่ยงสูง<br>ในสัปดาห์นี้':'Excellent! No high risks detected<br>this week. Keep it up!'}</div>`;
    return;
  }

  el.innerHTML = `
    <div class="alert-header">${th?`📋 พบ ${alerts.length} เรื่องที่ควรระวัง`:`📋 ${alerts.length} areas to watch`}</div>
    ${alerts.map(a => `
      <div class="alert-card" style="border-left:4px solid ${a.color}">
        <div class="alert-title" style="color:${a.color}">${a.icon} ${a.title}</div>
        <ul class="alert-list">
          ${a.items.map(i=>`<li>${i}</li>`).join('')}
        </ul>
      </div>`).join('')}`;
}

function renderLifestyleSection() {
  const el = document.getElementById('healthLifeSection');
  if (!el) return;
  const th = DB.lang==='th';
  const plan = DB.lifestyle;

  if (!plan) {
    el.innerHTML = `
      <div style="text-align:center;padding:24px 16px">
        <div style="font-size:3rem;margin-bottom:12px">✨</div>
        <div style="font-family:Prompt,sans-serif;font-size:1.1rem;font-weight:700;margin-bottom:8px">
          ${th?'ออกแบบไลฟ์สไตล์ของคุณ':'Design Your Lifestyle'}
        </div>
        <div style="font-size:.85rem;color:var(--text2);margin-bottom:20px;line-height:1.7">
          ${th?'ให้ AI วิเคราะห์ข้อมูลสุขภาพของคุณและออกแบบตารางชีวิตที่เหมาะสมที่สุด':'Let AI analyze your health data and design an optimal lifestyle plan just for you.'}
        </div>
        <button class="btn-primary" style="margin-bottom:10px" onclick="generateAILifestyle()">
          🤖 ${th?'ให้ AI ออกแบบให้ฉัน':'AI Design My Plan'}
        </button>
        <div style="font-size:.75rem;color:var(--text3)">${th?'หรือ':'or'}</div>
        <button style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;font-family:Prompt,sans-serif;font-weight:700;margin-top:8px" onclick="openCustomLifestyle()">
          ✏️ ${th?'ออกแบบเอง':'Design Manually'}
        </button>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="lifestyle-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-family:Prompt,sans-serif;font-size:1rem;font-weight:800">${th?'แผนไลฟ์สไตล์ของคุณ':'Your Lifestyle Plan'}</div>
        <button style="border:none;background:var(--surface3);border-radius:8px;padding:5px 10px;color:var(--text2);cursor:pointer;font-size:.78rem" onclick="DB.lifestyle=null;saveDB();renderLifestyleSection()">
          🔄 ${th?'รีเซ็ต':'Reset'}
        </button>
      </div>
      ${plan.summary ? `<div class="lifestyle-summary">${plan.summary}</div>` : ''}
      
      <!-- Schedule -->
      ${plan.wakeTime ? `<div class="ls-section-title">⏰ ${th?'ตารางประจำวัน':'Daily Schedule'}</div>
      <div class="ls-schedule-item">🌅 ${th?'ตื่นนอน':'Wake up'}: ${plan.wakeTime}</div>
      <div class="ls-schedule-item">🌙 ${th?'เข้านอน':'Bedtime'}: ${plan.sleepTime}</div>` : ''}

      <!-- Meals -->
      ${plan.meals && plan.meals.length ? `<div class="ls-section-title">🍽 ${th?'มื้ออาหาร':'Meals'}</div>
      ${plan.meals.map(m=>`<div class="ls-meal-item">
        <div style="font-weight:700;color:var(--orange)">${m.time} — ${m.name}</div>
        <div style="font-size:.8rem;color:var(--text2);margin-top:3px">${m.description}</div>
        ${m.calories?`<div style="font-size:.75rem;color:var(--text3)">~${m.calories} kcal</div>`:''}
      </div>`).join('')}` : ''}

      <!-- Exercise -->
      ${plan.exercise ? `<div class="ls-section-title">🏃 ${th?'การออกกำลังกาย':'Exercise'}</div>
      <div class="ls-info-box">
        ${th?`ออกกำลัง ${plan.exercise.days} วัน/สัปดาห์ — ${plan.exercise.type} — ${plan.exercise.duration} ${th?'นาที':'min'}`
            :`Exercise ${plan.exercise.days} days/week — ${plan.exercise.type} — ${plan.exercise.duration} min`}
        ${plan.exercise.description?`<div style="margin-top:4px;font-size:.8rem;color:var(--text2)">${plan.exercise.description}</div>`:''}
      </div>` : ''}

      <!-- Weekly Goals -->
      ${plan.weeklyGoals && plan.weeklyGoals.length ? `<div class="ls-section-title">🎯 ${th?'เป้าหมายสัปดาห์นี้':'Weekly Goals'}</div>
      ${plan.weeklyGoals.map((g,i)=>`<div class="ls-goal-item">
        <input type="checkbox" id="lg_${i}" onchange="toggleLifestyleGoal(${i}, this.checked)" ${(plan._goalsDone||[])[i]?'checked':''}>
        <label for="lg_${i}">${g}</label>
      </div>`).join('')}` : ''}

      <!-- Diet Recommendations -->
      ${plan.dietRecommendations ? `<div class="ls-section-title">🥗 ${th?'คำแนะนำด้านอาหาร':'Diet Advice'}</div>
      <div class="ls-info-box" style="color:var(--text2)">${plan.dietRecommendations}</div>` : ''}

      <div style="margin-top:14px">
        <button class="btn-primary" onclick="generateAILifestyle()">
          🤖 ${th?'สร้างแผนใหม่':'Regenerate Plan'}
        </button>
      </div>
    </div>`;
}

function toggleLifestyleGoal(idx, checked) {
  if (!DB.lifestyle) return;
  if (!DB.lifestyle._goalsDone) DB.lifestyle._goalsDone = [];
  DB.lifestyle._goalsDone[idx] = checked;
  saveDB();
}

// ─── AI LIFESTYLE GENERATOR ──────────────────────────────────────
async function generateAILifestyle() {
  const th = DB.lang === 'th';
  const el = document.getElementById('healthLifeSection');
  if (!el) return;
  el.innerHTML = `<div style="text-align:center;padding:40px 20px">
    <div class="ai-loading-spinner"></div>
    <div style="margin-top:16px;font-family:Prompt,sans-serif;font-size:.9rem;color:var(--text2)">
      ${th?'🤖 AI กำลังวิเคราะห์ข้อมูลสุขภาพของคุณ...':'🤖 AI is analyzing your health data...'}
    </div>
  </div>`;

  const p  = DB.healthProfile || {};
  const u  = DB.user || {};
  const risks = getLatestRisks();

  const prompt = `You are a certified Thai health and nutrition expert. Based on this person's complete health profile, create a highly personalized lifestyle plan in Thai language.

PROFILE:
- Age: ${u.age}, Gender: ${u.gender==='male'?'ชาย':'หญิง'}, BMI: ${u.bmi} (${bmiLabel(u.bmi,'th')})
- Sleep: ${p.sleepHoursAvg}h/night, ${p.sleepBadDays} poor-sleep days/week, quality ${p.sleepQuality}/5
- Exercise: ${p.exerciseDaysPerWeek} days/week, type: ${p.exerciseType}, ${p.exerciseMinsPerSession} min/session
- Diet: salt ${p.saltIntake}/5, sugar ${p.sugarIntake}/5, fat ${p.fatIntake}/5
- Vegetables: ${p.vegServings} servings/day, Fruit: ${p.fruitServings}/day
- Fast food: ${p.fastFoodPerWeek} times/week
- Water: ${p.waterGlassesPerDay} glasses/day
- Alcohol: ${p.alcoholDrinksPerWeek} drinks/week
- Stress: ${p.stressLevel}/5, Work: ${p.workHoursPerDay}h/day
- Smoking: ${p.smokingStatus}
- Family history: ${(p.familyHistory||[]).join(', ')||'none'}
- Current conditions: ${(p.currentConditions||[]).join(', ')||'none'}
- DISEASE RISKS: diabetes ${risks.diabetes||0}%, hypertension ${risks.hypertension||0}%, heart ${risks.heart||0}%, kidney ${risks.kidney||0}%, obesity ${risks.obesity||0}%

Create a detailed, realistic, practical lifestyle plan. Return ONLY valid JSON (no markdown):
{
  "summary": "2-3 sentences personalized summary addressing their main health risks in Thai",
  "wakeTime": "06:30",
  "sleepTime": "22:30",
  "meals": [
    {"time": "07:00", "name": "มื้อเช้า", "description": "detailed meal with specific Thai foods addressing their risks", "calories": 500},
    {"time": "12:00", "name": "มื้อเที่ยง", "description": "...", "calories": 600},
    {"time": "18:00", "name": "มื้อเย็น", "description": "...", "calories": 450},
    {"time": "10:00", "name": "ของว่างเช้า", "description": "...", "calories": 150},
    {"time": "15:30", "name": "ของว่างบ่าย", "description": "...", "calories": 150}
  ],
  "exercise": {"days": 4, "type": "cardio + strength", "duration": 35, "description": "specific workout tailored to their fitness level and health risks"},
  "water": {"glasses": 8, "tips": "specific hydration tips"},
  "sleep": {"hours": 8, "tips": "specific sleep hygiene advice for their stress level"},
  "stress": {"tips": "practical stress management for their work hours"},
  "weeklyGoals": ["specific goal 1", "specific goal 2", "specific goal 3", "specific goal 4", "specific goal 5"],
  "dietRecommendations": "detailed paragraph about foods to eat and avoid based on their risk profile",
  "warnings": ["important warning based on their highest risk"]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    const text = data.content.map(i=>i.text||'').join('');
    const clean = text.replace(/```json|```/g,'').trim();
    DB.lifestyle = JSON.parse(clean);
    saveDB();
    renderLifestyleSection();
  } catch(err) {
    el.innerHTML = `<div class="empty-state">❌<br>${th?'ไม่สามารถสร้างแผนได้ กรุณาลองใหม่':'Could not generate plan, try again'}<br><br>
      <button class="btn-primary" style="width:auto;padding:10px 24px" onclick="generateAILifestyle()">${th?'ลองใหม่':'Retry'}</button></div>`;
    console.error(err);
  }
}

function openCustomLifestyle() {
  document.getElementById('customLifestyleOverlay').classList.add('active');
}
function closeCustomLifestyle() {
  document.getElementById('customLifestyleOverlay').classList.remove('active');
}
function saveCustomLifestyle() {
  const th = DB.lang==='th';
  DB.lifestyle = {
    summary: document.getElementById('cl_summary').value || '',
    wakeTime: document.getElementById('cl_wake').value || '06:30',
    sleepTime: document.getElementById('cl_sleep').value || '22:30',
    meals: [
      { time: document.getElementById('cl_bfTime').value||'07:00', name: th?'มื้อเช้า':'Breakfast', description: document.getElementById('cl_bf').value||'', calories: 0 },
      { time: document.getElementById('cl_lnTime').value||'12:00', name: th?'มื้อเที่ยง':'Lunch',     description: document.getElementById('cl_ln').value||'', calories: 0 },
      { time: document.getElementById('cl_dnTime').value||'18:30', name: th?'มื้อเย็น':'Dinner',     description: document.getElementById('cl_dn').value||'', calories: 0 },
    ],
    exercise: { days: parseInt(document.getElementById('cl_exdays').value)||3, type: document.getElementById('cl_extype').value||'', duration: parseInt(document.getElementById('cl_exmins').value)||30, description: '' },
    weeklyGoals: (document.getElementById('cl_goals').value||'').split('\n').filter(g=>g.trim()),
    dietRecommendations: document.getElementById('cl_diet').value || '',
  };
  saveDB();
  closeCustomLifestyle();
  renderLifestyleSection();
}

function reopenQuestionnaire() {
  document.getElementById('setupScreen').style.display = 'flex';
  showSetupStep(2);
}

// ─── PET SYSTEM ─────────────────────────────────────────────────
function getPetStats() {
  if (!DB.petStats) DB.petStats={};
  if (!DB.petStats[DB.currentPetId]) DB.petStats[DB.currentPetId]={happy:80,hungry:70,energy:90,level:1,xp:0};
  return DB.petStats[DB.currentPetId];
}
function decayPetStats() {
  if (!DB.currentPetId) return;
  const s=getPetStats();
  s.happy=Math.max(0,s.happy-3); s.hungry=Math.max(0,s.hungry-4); s.energy=Math.min(100,s.energy+1);
  DB.petStats[DB.currentPetId]=s; updatePetStatBars(s); saveDB();
  if (s.hungry<20) showPetMood(DB.lang==='th'?'หิวมาก! ให้อาหารหน่อย 🍖':'So hungry! Feed me 🍖');
  if (s.happy<20)  showPetMood(rnd(PETS[DB.currentPetId]?.sounds)||'...');
}
function updatePetStatBars(s) {
  const clamp=v=>Math.max(0,Math.min(100,Math.round(v)));
  ['Happy','Hungry','Energy'].forEach(k=>{
    const key=k.toLowerCase();
    const el=document.getElementById(`bar${k}`); const vel=document.getElementById(`v${k}`);
    if (!el) return;
    el.style.width=clamp(s[key])+'%'; vel.textContent=clamp(s[key]);
  });
}
function checkLevelUp() {
  const s=getPetStats(); const need=s.level*100;
  if (s.xp>=need) { s.xp-=need; s.level++;
    document.getElementById('petLevelBadge').textContent=`Lv.${s.level}`;
    showReward(DB.lang==='th'?'สัตว์เลี้ยงโตขึ้น! 🎊':'Pet leveled up! 🎊',0,`Level ${s.level}`);
  }
}

function renderPet() {
  if (!DB.currentPetId) return;
  const pet=PETS[DB.currentPetId];
  const s=getPetStats();
  document.getElementById('petNameDisplay').textContent=pet.name;
  document.getElementById('petLevelBadge').textContent=`Lv.${s.level}`;
  updatePetStatBars(s);
  const cont=document.getElementById('activePetRender');
  cont.innerHTML=`<div class="pet-idle">${buildPetSVG(pet)}</div>`;
}

function buildPetSVG(pet) {
  const svgs={
    dog:`<svg width="150" height="170" viewBox="0 0 150 170" xmlns="http://www.w3.org/2000/svg">
      <path d="M115 130 Q140 110 136 84 Q134 70 126 74" stroke="#CD853F" stroke-width="10" fill="none" stroke-linecap="round"/>
      <ellipse cx="75" cy="122" rx="46" ry="37" fill="#DEB887"/><ellipse cx="75" cy="126" rx="28" ry="22" fill="#F5DEB3" opacity=".5"/>
      <rect x="50" y="143" width="17" height="26" rx="8" fill="#CD853F"/><rect x="80" y="143" width="17" height="26" rx="8" fill="#CD853F"/>
      <ellipse cx="58" cy="170" rx="11" ry="7" fill="#CD853F"/><ellipse cx="88" cy="170" rx="11" ry="7" fill="#CD853F"/>
      <ellipse cx="75" cy="84" rx="20" ry="18" fill="#DEB887"/><circle cx="75" cy="63" r="32" fill="#DEB887"/>
      <ellipse cx="48" cy="43" rx="13" ry="20" fill="#CD853F" transform="rotate(-18,48,43)"/>
      <ellipse cx="48" cy="43" rx="8" ry="14" fill="#DEB887" opacity=".5" transform="rotate(-18,48,43)"/>
      <ellipse cx="102" cy="43" rx="13" ry="20" fill="#CD853F" transform="rotate(18,102,43)"/>
      <ellipse cx="102" cy="43" rx="8" ry="14" fill="#DEB887" opacity=".5" transform="rotate(18,102,43)"/>
      <circle cx="64" cy="58" r="7" fill="#1A1A1A"/><circle cx="86" cy="58" r="7" fill="#1A1A1A"/>
      <circle cx="66" cy="56" r="2.5" fill="white"/><circle cx="88" cy="56" r="2.5" fill="white"/>
      <ellipse cx="75" cy="70" rx="8" ry="6" fill="#1A1A1A"/><ellipse cx="75" cy="79" rx="7" ry="5" fill="#FF6B9D"/>
      <rect x="58" y="81" width="34" height="7" rx="3" fill="#FF6B35"/><circle cx="75" cy="85" r="3" fill="#FFD700"/>
    </svg>`,
    cat:`<svg width="150" height="170" viewBox="0 0 150 170" xmlns="http://www.w3.org/2000/svg">
      <path d="M112 140 Q138 118 134 88 Q132 72 124 76" stroke="#FF8C00" stroke-width="10" fill="none" stroke-linecap="round"/>
      <ellipse cx="74" cy="122" rx="43" ry="35" fill="#FFA500"/><ellipse cx="74" cy="128" rx="25" ry="20" fill="#FFF8DC" opacity=".6"/>
      <rect x="51" y="144" width="15" height="26" rx="7" fill="#FF8C00"/><rect x="80" y="144" width="15" height="26" rx="7" fill="#FF8C00"/>
      <circle cx="74" cy="66" r="31" fill="#FFA500"/>
      <polygon points="50,48 40,18 63,42" fill="#FF8C00"/><polygon points="98,48 110,18 87,42" fill="#FF8C00"/>
      <ellipse cx="63" cy="62" rx="8" ry="9" fill="#3CB371"/><ellipse cx="85" cy="62" rx="8" ry="9" fill="#3CB371"/>
      <ellipse cx="63" cy="62" rx="3" ry="8" fill="#1A1A1A"/><ellipse cx="85" cy="62" rx="3" ry="8" fill="#1A1A1A"/>
      <circle cx="61" cy="60" r="2" fill="white"/><circle cx="83" cy="60" r="2" fill="white"/>
      <polygon points="74,72 70,76 78,76" fill="#FF69B4"/>
      <rect x="59" y="85" width="30" height="7" rx="3" fill="#7C4DFF"/><circle cx="74" cy="92" r="4" fill="#FFD700"/>
    </svg>`,
    rabbit:`<svg width="150" height="170" viewBox="0 0 150 170" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="58" cy="26" rx="11" ry="28" fill="#FFB6C1" transform="rotate(-10,58,26)"/>
      <ellipse cx="58" cy="26" rx="6" ry="22" fill="#FF69B4" transform="rotate(-10,58,26)"/>
      <ellipse cx="96" cy="26" rx="11" ry="28" fill="#FFB6C1" transform="rotate(10,96,26)"/>
      <ellipse cx="75" cy="128" rx="44" ry="40" fill="#FFB6C1"/>
      <rect x="50" y="150" width="17" height="25" rx="8" fill="#FF9ABD"/><rect x="80" y="150" width="17" height="25" rx="8" fill="#FF9ABD"/>
      <circle cx="75" cy="78" r="30" fill="#FFB6C1"/>
      <circle cx="65" cy="74" r="9" fill="#E91E8C"/><circle cx="85" cy="74" r="9" fill="#E91E8C"/>
      <circle cx="65" cy="74" r="5" fill="#1A1A1A"/><circle cx="85" cy="74" r="5" fill="#1A1A1A"/>
      <circle cx="63" cy="72" r="2.5" fill="white"/><circle cx="83" cy="72" r="2.5" fill="white"/>
      <circle cx="75" cy="84" r="5" fill="#FF69B4"/>
    </svg>`,
    lion:`<svg width="150" height="170" viewBox="0 0 150 170" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="76" cy="124" rx="48" ry="39" fill="#F4A460"/>
      <rect x="50" y="146" width="19" height="27" rx="9" fill="#D2691E"/><rect x="81" y="146" width="19" height="27" rx="9" fill="#D2691E"/>
      <circle cx="76" cy="66" r="42" fill="#8B4513"/><circle cx="76" cy="63" r="29" fill="#F4A460"/>
      <circle cx="65" cy="58" r="8" fill="#DAA520"/><circle cx="87" cy="58" r="8" fill="#DAA520"/>
      <circle cx="65" cy="58" r="5" fill="#1A1A1A"/><circle cx="87" cy="58" r="5" fill="#1A1A1A"/>
      <circle cx="63" cy="56" r="2" fill="white"/><circle cx="85" cy="56" r="2" fill="white"/>
      <ellipse cx="76" cy="71" rx="8" ry="5" fill="#1A1A1A"/>
      <polygon points="76,16 68,28 74,24 76,32 78,24 84,28" fill="#FFD700"/>
    </svg>`,
    tiger:`<svg width="150" height="170" viewBox="0 0 150 170" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="76" cy="123" rx="46" ry="37" fill="#FFA500"/>
      <rect x="50" y="146" width="17" height="26" rx="8" fill="#FF8C00"/><rect x="79" y="146" width="17" height="26" rx="8" fill="#FF8C00"/>
      <circle cx="76" cy="65" r="33" fill="#FFA500"/>
      <polygon points="50,50 42,25 63,44" fill="#FFA500"/><polygon points="102,50 110,25 89,44" fill="#FFA500"/>
      <ellipse cx="65" cy="60" rx="3.5" ry="7" fill="#1A1A1A"/><ellipse cx="87" cy="60" rx="3.5" ry="7" fill="#1A1A1A"/>
      <circle cx="63" cy="58" r="2" fill="white"/><circle cx="85" cy="58" r="2" fill="white"/>
      <ellipse cx="76" cy="71" rx="7" ry="5" fill="#FF69B4"/>
    </svg>`,
    owl:`<svg width="150" height="170" viewBox="0 0 150 170" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="75" cy="128" rx="42" ry="44" fill="#A0522D"/>
      <circle cx="75" cy="70" r="38" fill="#A0522D"/>
      <polygon points="55,38 47,14 65,36" fill="#8B4513"/><polygon points="95,38 103,14 85,36" fill="#8B4513"/>
      <circle cx="63" cy="64" r="14" fill="#DAA520"/><circle cx="87" cy="64" r="14" fill="#DAA520"/>
      <circle cx="63" cy="64" r="7" fill="#1A1A1A"/><circle cx="87" cy="64" r="7" fill="#1A1A1A"/>
      <circle cx="60" cy="61" r="3" fill="white"/><circle cx="84" cy="61" r="3" fill="white"/>
      <polygon points="75,72 69,80 81,80" fill="#DAA520"/>
    </svg>`,
    rhino:`<svg width="150" height="170" viewBox="0 0 150 170" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="76" cy="128" rx="56" ry="41" fill="#A9A9A9"/>
      <rect x="40" y="153" width="22" height="20" rx="9" fill="#808080"/><rect x="86" y="153" width="22" height="20" rx="9" fill="#808080"/>
      <ellipse cx="76" cy="70" rx="36" ry="30" fill="#A9A9A9"/>
      <ellipse cx="76" cy="44" rx="7" ry="17" fill="#888" transform="rotate(-5,76,44)"/>
      <circle cx="60" cy="64" r="7" fill="#2196F3"/><circle cx="92" cy="64" r="7" fill="#2196F3"/>
      <circle cx="60" cy="64" r="4" fill="#1A1A1A"/><circle cx="92" cy="64" r="4" fill="#1A1A1A"/>
      <circle cx="59" cy="63" r="1.5" fill="white"/><circle cx="91" cy="63" r="1.5" fill="white"/>
    </svg>`,
  };
  return svgs[pet.id]||svgs.dog;
}

function onPetTap() {
  const pet=PETS[DB.currentPetId]; const s=getPetStats();
  let msg=rnd(pet.sounds);
  if (s.hungry<25) msg=DB.lang==='th'?'หิวมาก! ให้อาหารหน่อย 🍖':'So hungry! Feed me 🍖';
  showPetMood(msg);
  const wrap=document.getElementById('petWrap');
  const inner=wrap.querySelector('.pet-idle');
  if (inner) { inner.className='pet-happy'; setTimeout(()=>{ inner.className='pet-idle'; },1800); }
}
function feedPet() {
  const pet=PETS[DB.currentPetId]; const s=getPetStats();
  if (DB.coins<5) { showPetMood(DB.lang==='th'?'ซื้ออาหารก่อนนะ! 🛒':'Buy food first! 🛒'); return; }
  DB.coins=Math.max(0,(DB.coins||0)-5); updateCoinDisplays();
  s.hungry=Math.min(100,s.hungry+25); s.happy=Math.min(100,s.happy+10); s.xp+=5;
  checkLevelUp(); DB.petStats[DB.currentPetId]=s;
  showPetMood('อร่อยมาก! '+pet.food); showFloatEmoji(pet.food);
  const wrap=document.getElementById('petWrap'); const inner=wrap.querySelector('.pet-idle');
  if (inner) { inner.className='pet-eat'; setTimeout(()=>{ inner.className='pet-idle'; },1600); }
  updatePetStatBars(s); saveDB();
}
function playWithPet() {
  const pet=PETS[DB.currentPetId]; const s=getPetStats();
  s.happy=Math.min(100,s.happy+20); s.energy=Math.max(0,s.energy-12); s.xp+=8;
  checkLevelUp(); DB.petStats[DB.currentPetId]=s;
  showPetMood('สนุกจัง! '+pet.toy); showFloatEmoji(pet.toy);
  updatePetStatBars(s); saveDB();
}
function showPetMood(text) {
  const b=document.getElementById('petMoodBubble');
  b.textContent=text; b.style.display='block';
  clearTimeout(b._t); b._t=setTimeout(()=>b.style.display='none',2500);
}
function showFloatEmoji(emoji) {
  const fi=document.getElementById('floatEmoji');
  fi.textContent=emoji; fi.style.display='block';
  fi.style.left=(50+Math.random()*20)+'%'; fi.style.bottom='55%';
  fi.style.animation='none'; void fi.offsetWidth;
  fi.style.animation='floatUp 1s ease-out forwards';
  setTimeout(()=>fi.style.display='none',1100);
}
function renderMyPets() {
  const row=document.getElementById('myPetsRow'); if (!row) return;
  row.innerHTML='';
  (DB.ownedPets||['dog']).forEach(id=>{
    const pet=PETS[id]; const s=DB.petStats?.[id]||{level:1};
    const div=document.createElement('div');
    div.className=`pet-thumb ${DB.currentPetId===id?'active-pet':''}`;
    div.innerHTML=`<span class="pet-thumb-emoji">${pet.emoji}</span><div class="pet-thumb-name">${pet.name}</div><div class="pet-thumb-lvl">Lv.${s.level}</div>`;
    div.onclick=()=>{ DB.currentPetId=id; saveDB(); renderPet(); renderMyPets(); showPetMood(rnd(pet.sounds)); };
    row.appendChild(div);
  });
}

// ─── SHOP ───────────────────────────────────────────────────────
let currentShopTab='food';
function switchShopTab(tab) {
  currentShopTab=tab;
  document.querySelectorAll('.shop-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById(`stab-${tab}`).classList.add('active');
  populateShop(tab);
}
function populateShop(tab) {
  const grid=document.getElementById('shopGrid'); grid.innerHTML='';
  if (tab==='food') SHOP_FOODS.forEach(item=>grid.appendChild(makeShopCard(item,'food')));
  else if (tab==='toy') SHOP_TOYS.forEach(item=>grid.appendChild(makeShopCard(item,'toy')));
  else Object.values(PETS).forEach(pet=>{
    const owned=(DB.ownedPets||[]).includes(pet.id);
    const selected=DB.currentPetId===pet.id;
    const card=document.createElement('div');
    card.className=`shop-item ${owned?'owned':''} ${selected?'active-sel':''}`;
    card.innerHTML=`${selected?'<span class="shop-badge badge-active">ใช้งาน</span>':owned?'<span class="shop-badge badge-owned">มีแล้ว</span>':''}
      <span class="shop-emoji">${pet.emoji}</span><div class="shop-name">${pet.name}</div>
      <div class="shop-price">${owned?(selected?'✓ กำลังใช้':'🐾 เลือก'):`🪙 ${pet.price}`}</div>`;
    card.onclick=()=>owned?selectPet(pet.id):buyPet(pet);
    grid.appendChild(card);
  });
}
function makeShopCard(item,type) {
  const card=document.createElement('div'); card.className='shop-item';
  card.innerHTML=`<span class="shop-emoji">${item.emoji}</span><div class="shop-name">${item.name}</div><div class="shop-desc">${item.desc}</div><div class="shop-price">🪙 ${item.price}</div>`;
  card.onclick=()=>buyShopItem(item,type);
  return card;
}
function buyShopItem(item,type) {
  if ((DB.coins||0)<item.price) { showPetMood(DB.lang==='th'?'เหรียญไม่พอ 😢':'Not enough coins 😢'); return; }
  DB.coins-=item.price;
  const s=getPetStats();
  if (item.effect) Object.entries(item.effect).forEach(([k,v])=>{ s[k]=Math.max(0,Math.min(100,(s[k]||0)+v)); });
  DB.petStats[DB.currentPetId]=s;
  saveDB(); updateCoinDisplays(); updatePetStatBars(s);
  celebrate(); showPetMood(item.emoji+' ขอบคุณ!');
}
function buyPet(pet) {
  if ((DB.coins||0)<pet.price) { alert(DB.lang==='th'?'เหรียญไม่พอ!':'Not enough coins!'); return; }
  DB.coins-=pet.price;
  if (!DB.ownedPets) DB.ownedPets=['dog'];
  DB.ownedPets.push(pet.id);
  if (!DB.petStats) DB.petStats={};
  DB.petStats[pet.id]={happy:80,hungry:70,energy:90,level:1,xp:0};
  saveDB(); updateCoinDisplays(); populateShop('pet'); renderMyPets(); celebrate();
  showReward(`ได้ ${pet.name}! 🎉`,0,`${pet.emoji} น่ารักมาก!`);
}
function selectPet(id) {
  DB.currentPetId=id; saveDB(); renderPet(); renderMyPets(); populateShop('pet');
  switchTab('pet'); showPetMood(rnd(PETS[id]?.sounds)||'สวัสดี!');
}
function openMyPets() { switchTab('pet'); }

// ─── COINS ──────────────────────────────────────────────────────
function earnCoins(amount,reason) {
  DB.coins=(DB.coins||0)+amount;
  DB.totalCoinsEarned=(DB.totalCoinsEarned||0)+amount;
  saveDB(); updateCoinDisplays();
}

// ─── REWARD ─────────────────────────────────────────────────────
function showReward(title,coins,msg) {
  document.getElementById('rewardTitle').textContent=title;
  document.getElementById('rewardCoins').textContent=coins>0?`+${coins} 🪙`:'🎊';
  document.getElementById('rewardMsg').textContent=msg||'';
  document.getElementById('rewardPopup').style.display='flex';
}
function closeReward() { document.getElementById('rewardPopup').style.display='none'; }

// ─── PROFILE ────────────────────────────────────────────────────
function openProfileModal() {
  if (!DB.user) return;
  document.getElementById('e_name').value=DB.user.name;
  document.getElementById('e_age').value=DB.user.age;
  document.getElementById('e_height').value=DB.user.height;
  document.getElementById('e_weight').value=DB.user.weight;
  document.getElementById('profileName2').textContent=DB.user.name;
  document.getElementById('profileBMIFull').textContent=`BMI ${DB.user.bmi} · ${bmiLabel(DB.user.bmi,DB.lang)}`;
  document.getElementById('profileAvtImg').src=DB.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  document.getElementById('profileOverlay').classList.add('active');
}
function closeProfile(e) { if (e) e.stopPropagation(); document.getElementById('profileOverlay').classList.remove('active'); }
function saveProfile() {
  const n=document.getElementById('e_name').value.trim()||DB.user.name;
  const a=parseInt(document.getElementById('e_age').value)||DB.user.age;
  const h=parseFloat(document.getElementById('e_height').value)||DB.user.height;
  const w=parseFloat(document.getElementById('e_weight').value)||DB.user.weight;
  DB.user={...DB.user,name:n,age:a,height:h,weight:w};
  DB.user.bmi=calcBMI(h,w); DB.user.ageGroup=getAgeGroup(a);
  DB.missions={};
  saveDB(); closeProfile(); boot();
}
function uploadAvatar(e) {
  const f=e.target.files[0]; if (!f) return;
  const r=new FileReader();
  r.onload=ev=>{ DB.avatar=ev.target.result; saveDB();
    document.getElementById('profileAvtImg').src=DB.avatar;
    document.getElementById('topAvatar').src=DB.avatar; };
  r.readAsDataURL(f);
}

// ─── LANG ───────────────────────────────────────────────────────
function toggleLang() { DB.lang=DB.lang==='th'?'en':'th'; DB.missions={}; saveDB(); boot(); }
function setLang(l) {
  DB.lang=l;
  document.getElementById('btnTH').className=`lang-opt ${l==='th'?'active':''}`;
  document.getElementById('btnEN').className=`lang-opt ${l==='en'?'active':''}`;
}
function applyLang() {
  document.getElementById('langBtn').textContent=DB.lang==='th'?'EN':'TH';
  const grp=DB.user?.ageGroup||'adult';
  const labels={child:DB.lang==='th'?'เด็ก':'Child',teen:DB.lang==='th'?'วัยรุ่น':'Teen',adult:DB.lang==='th'?'ผู้ใหญ่':'Adult',senior:DB.lang==='th'?'ผู้สูงอายุ':'Senior'};
  document.getElementById('ageGroupBadge').textContent=labels[grp]||labels.adult;
  document.getElementById('progLabel').textContent=DB.lang==='th'?'ความคืบหน้าวันนี้':"Today's Progress";
  document.getElementById('missionHeading').textContent=DB.lang==='th'?'ภารกิจประจำวัน':'Daily Missions';
}

// ─── LOGOUT ─────────────────────────────────────────────────────
function confirmLogout() {
  const msg=DB.lang==='th'?'ออกจากระบบและล้างข้อมูลทั้งหมดใช่ไหม?':'Log out and clear all data?';
  if (confirm(msg)) { localStorage.removeItem('hf_v2'); location.reload(); }
}

// ─── CELEBRATE ──────────────────────────────────────────────────
function celebrate() {
  const colors=['#2ECC71','#00D9B5','#58A6FF','#BC8CFF','#F0A500','#FF79C6'];
  const wrap=document.getElementById('confettiWrap');
  for (let i=0;i<25;i++) {
    const c=document.createElement('div');
    c.className='confetti-piece';
    c.style.cssText=`left:${Math.random()*100}%;top:-10px;background:${colors[Math.floor(Math.random()*colors.length)]};animation-delay:${Math.random()*.5}s;animation-duration:${1+Math.random()}s;transform:rotate(${Math.random()*360}deg);border-radius:${Math.random()>.5?'50%':'2px'}`;
    wrap.appendChild(c); setTimeout(()=>c.remove(),2200);
  }
}

// ─── UTILS ──────────────────────────────────────────────────────
function rnd(arr) { return arr?arr[Math.floor(Math.random()*arr.length)]:''; }
