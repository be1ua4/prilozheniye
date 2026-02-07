const tg = window.Telegram.WebApp;
tg.expand();

// =======================================================
// 1. ПАРСИНГ ПАРАМЕТРОВ (ИЗ URL)
// =======================================================
const urlParams = new URLSearchParams(window.location.search);

const SERVER_URL = decodeURIComponent(urlParams.get('server_url') || "https://app.feetonline.ru");
const USER_ID = tg.initDataUnsafe?.user?.id;

// 🔥 ИЗМЕНЕНИЕ: Используем let вместо const для динамического обновления
let currentWeek = parseInt(urlParams.get('week')) || 1;
let currentDay = parseInt(urlParams.get('day')) || 1;
let currentXP = parseInt(urlParams.get('xp')) || 0;
let pHeight = parseInt(urlParams.get('h')) || 0;
let pWeight = parseInt(urlParams.get('w')) || 0;
let pJump = parseFloat(urlParams.get('j')) || 0;
let pReach = parseInt(urlParams.get('r')) || 0;
let pBg = decodeURIComponent(urlParams.get('bg') || 'Beginner');
let pGoal = decodeURIComponent(urlParams.get('goal') || 'Vertical Jump');
let userName = decodeURIComponent(urlParams.get('name') || 'Атлет');
let currentStreak = parseInt(urlParams.get('streak')) || 0;
let lastGain = parseFloat(urlParams.get('gain')) || 0;

// 🔥 НОВОЕ: Универсальная синхронизация UI без хардкода
function syncUI() {
    const mapping = {
        'display-height': pHeight,
        'display-jump': pJump.toFixed(1),
        'display-reach': pReach,
        'display-bg': pBg,
        'display-goal': pGoal,
        'week-num': currentWeek,
        'streak-display': currentStreak,
        'profile-name': userName,
        'display-xp': currentXP
    };

    for (const [id, val] of Object.entries(mapping)) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    }

    updateRankBadge();

    const touchMax = pReach + pJump;
    const need = 305 - touchMax;
    const touchEl = document.getElementById('calc-touch');
    const needEl = document.getElementById('calc-need');
    if (touchEl) touchEl.innerText = touchMax;
    if (needEl) {
        needEl.innerText = need > 0 ? need : "DONE! ✅";
        if (need <= 0) needEl.style.color = "#00ff00";
    }
}

// --- СИСТЕМА РАНГОВ ---
const RANKS = [
    { min: 0, name: "Новичок", icon: "🌱" },
    { min: 500, name: "Любитель", icon: "🏀" },
    { min: 1500, name: "Профи", icon: "🔥" },
    { min: 3000, name: "Данкер", icon: "🚀" },
    { min: 5000, name: "Air Jordan", icon: "👑" },
    { min: 10000, name: "ЛЕГЕНДА", icon: "🐐" }
];

function getRank(xp) {
    return RANKS.slice().reverse().find(r => xp >= r.min) || RANKS[0];
}

function updateRankBadge() {
    const currentRank = getRank(currentXP);
    let rankBadge = document.getElementById('rank-badge-dynamic');

    if (!rankBadge) {
        rankBadge = document.createElement('div');
        rankBadge.id = 'rank-badge-dynamic';
        rankBadge.style.cssText = `
            background: linear-gradient(45deg, #ff9800, #ff5722);
            color: white; padding: 5px 15px; border-radius: 20px;
            font-weight: 800; display: inline-block; margin-top: 10px;
            font-size: 14px; box-shadow: 0 4px 15px rgba(255, 87, 34, 0.4);
            border: 1px solid rgba(255,255,255,0.2); text-transform: uppercase; letter-spacing: 1px;
        `;
        const nameEl = document.getElementById('profile-name');
        if (nameEl) nameEl.parentNode.insertBefore(rankBadge, nameEl.nextSibling);
    }
    if (rankBadge) rankBadge.innerText = `${currentRank.icon} ${currentRank.name}`;
}

// --- ПОЛУЧЕНИЕ AI ПРОГРАММЫ ---
let aiWorkout = null;
try {
    const rawPlan = urlParams.get('plan');
    if (rawPlan) {
        const jsonStr = atob(rawPlan);
        const fixedJson = decodeURIComponent(escape(jsonStr));
        aiWorkout = JSON.parse(fixedJson);
    }
} catch (e) {
    console.log("Ошибка парсинга плана:", e);
}

// --- ЛИДЕРБОРД ---
const leadersRaw = decodeURIComponent(urlParams.get('top') || "");
const leadersList = leadersRaw ? leadersRaw.split('|') : ["Beast:5000", "Machine:3000", "You:0"];

// =======================================================
// 2. ПРОВЕРКА ДАННЫХ И ИНИЦИАЛИЗАЦИЯ
// =======================================================
function checkOnboarding() {
    if (pHeight === 0 || pWeight === 0) {
        document.getElementById('onboarding-screen').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('nav-bar').classList.add('hidden');
    } else {
        document.getElementById('onboarding-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('nav-bar').classList.remove('hidden');
    }
}

// Первичный запуск
checkOnboarding();
syncUI();

// Логика отображения "ДЕНЬ Х"
const dayDisplay = document.getElementById('day-display');
if (dayDisplay) dayDisplay.innerHTML = `ДЕНЬ ${currentDay} / 3`;

// --- ЛОГИКА ПРОГРЕССА НЕДЕЛИ ---
const mainProgressBar = document.getElementById('progress');
const mainProgressText = document.getElementById('progress-text-val');

let weeklyPercent = Math.round(((currentDay - 1) / 3) * 100);
if (currentDay === 1) weeklyPercent = 2;

if (mainProgressBar && mainProgressText) {
    setTimeout(() => {
        mainProgressBar.style.width = `${weeklyPercent}%`;
        if (currentDay === 3) {
            mainProgressBar.style.background = 'linear-gradient(90deg, #ff9800, #ff5722)';
            mainProgressBar.style.boxShadow = '0 0 15px #ff5722';
        }
    }, 300);
    mainProgressText.innerText = `${weeklyPercent}%`;
}

if (aiWorkout && dayDisplay) {
    const badge = document.createElement('span');
    badge.className = 'ai-badge';
    badge.innerHTML = 'AI 🧠';
    dayDisplay.appendChild(badge);
}

// --- ТАБЛИЦА ЛИДЕРОВ ---
const leaderContainer = document.getElementById('tab-leaderboard');
if (leaderContainer) {
    leaderContainer.innerHTML = `
        <h2 style="text-align: center;">Топ Атлетов</h2>
        <p style="text-align: center; opacity: 0.5; font-size: 12px;">Глобальный рейтинг (Beta)</p>
    `;

    leadersList.forEach((item, index) => {
        const [name, xp] = item.split(':');
        const isMe = name === userName;
        const div = document.createElement('div');
        div.className = 'card';
        if (isMe) div.style.borderColor = 'var(--primary)';
        div.innerHTML = `
            <div class="card-left">
                <b style="color:var(--primary); margin-right:10px;">#${index + 1}</b>
                <div>${name} ${isMe ? '(Вы)' : ''}</div>
            </div>
            <div style="font-weight:bold;">${xp} XP</div>
        `;
        leaderContainer.appendChild(div);
    });

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'refresh-btn';
    refreshBtn.innerText = '🔄 Обновить таблицу';
    refreshBtn.onclick = window.refreshData;
    leaderContainer.appendChild(refreshBtn);
}

// =======================================================
// ЛОГИКА ГЛОССАРИЯ (WIKI)
// =======================================================
function renderGlossary() {
    const list = document.getElementById('glossary-list');
    if (!list) return;
    list.innerHTML = "";
    for (const [name, data] of Object.entries(exercisesDB)) {
        const div = document.createElement('div');
        div.className = 'card';
        div.onclick = () => openGlossaryItem(name, data);
        div.innerHTML = `
            <div class="card-left">
                <div class="icon-box" style="background: rgba(255,255,255,0.05);">${data.icon}</div>
                <div class="info">
                    <h3 style="margin:0; font-size:15px;">${name}</h3>
                    <p style="margin:0; color:var(--text-sec); font-size:12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">
                        ${data.desc}
                    </p>
                </div>
            </div>
            <div style="color: var(--text-sec); font-size: 20px;">›</div>
        `;
        list.appendChild(div);
    }
}
renderGlossary();

function openGlossaryItem(name, data) {
    const modal = document.getElementById('timerModal');
    const img = document.getElementById('exercise-gif');
    const glossInfo = document.getElementById('glossary-info');
    const glossTitle = document.getElementById('gloss-title');
    const glossDesc = document.getElementById('gloss-desc');
    const timerControls = document.getElementById('timer-controls');

    img.src = data.gif;
    glossTitle.innerText = name;
    glossDesc.innerText = data.desc;
    timerControls.classList.add('hidden');
    glossInfo.classList.remove('hidden');

    modal.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    modal.style.transform = '';
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });
    tg.HapticFeedback.impactOccurred('light');
}

// =======================================================
// 4. ФУНКЦИИ ВЗАИМОДЕЙСТВИЯ С БОТОМ
// =======================================================
window.refreshData = function() {
    tg.showPopup({
        title: 'Обновление данных',
        message: 'Приложение перезагрузится. Продолжить?',
        buttons: [{id: 'ok', type: 'default', text: 'Да'}, {id: 'cancel', type: 'cancel', text: 'Отмена'}]
    }, function(buttonId) {
        if (buttonId === 'ok') {
            tg.HapticFeedback.impactOccurred('medium');
            tg.sendData(JSON.stringify({ action: "refresh" }));
        }
    });
}

window.generateAIWorkout = function() {
    tg.showPopup({
        title: 'AI Тренер 🤖',
        message: 'Нейросеть составит новую уникальную программу на сегодня. Текущая тренировка будет заменена. Продолжить?',
        buttons: [{id: 'yes', type: 'default', text: 'Да, подобрать'}, {id: 'no', type: 'cancel', text: 'Отмена'}]
    }, function(btn) {
        if (btn === 'yes') {
            tg.HapticFeedback.impactOccurred('heavy');
            tg.sendData(JSON.stringify({ action: "generate_ai" }));
        }
    });
}

window.saveProfile = function() {
    const h = document.getElementById('in-height').value;
    const w = document.getElementById('in-weight').value;
    const j = document.getElementById('in-jump').value || 0;
    const r = document.getElementById('in-reach').value || 0;
    const bg = document.getElementById('in-bg').value;
    const goal = document.getElementById('in-goal').value;

    if(!h || !w) {
        tg.showAlert("Заполни рост и вес, атлет!");
        return;
    }

    fetch(`${SERVER_URL}/api/save_profile`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            user_id: USER_ID,
            h: h, w: w, j: j, r: r, bg: bg, goal: goal
        })
    })
    .then(response => {
        if (response.ok) {
            tg.showAlert("Профиль успешно сохранен!");

            // 🔥 ОБНОВЛЯЕМ ПЕРЕМЕННЫЕ
            pHeight = parseInt(h);
            pWeight = parseInt(w);
            pJump = parseFloat(j);
            pReach = parseInt(r);
            pBg = bg;
            pGoal = goal;

            // 🔥 СИНХРОНИЗИРУЕМ UI
            syncUI();
            checkOnboarding();

        } else {
            tg.showAlert("Ошибка сервера при сохранении.");
        }
    })
    .catch(error => {
        console.error(error);
        tg.showAlert("Не удалось связаться с сервером.");
    });
}

// --- КАРТА ПУТИ ---
const pathContainer = document.getElementById('exercise-list');
if (pathContainer) {
    pathContainer.innerHTML = `<div class="duo-container" id="map-container"></div>`;
    const mapContainer = document.getElementById('map-container');
    const TOTAL_WEEKS = Math.max(15, currentWeek + 5);

    for (let w = 1; w <= TOTAL_WEEKS; w++) {
        const posType = w % 4;
        let posClass = 'pos-center';
        if (posType === 1) posClass = 'pos-left';
        if (posType === 3) posClass = 'pos-right';

        const row = document.createElement('div');
        row.className = `duo-row ${posClass}`;

        let statusClass = 'locked';
        if (w < currentWeek) statusClass = 'done';
        else if (w === currentWeek) statusClass = 'active';

        let earnedCrowns = (w < currentWeek) ? 3 : (w === currentWeek ? currentDay - 1 : 0);
        let crownsHtml = '';
        for (let i = 0; i < 3; i++) crownsHtml += `<span class="crown-icon ${i < earnedCrowns ? 'earned' : ''}">👑</span>`;

        row.innerHTML = `
            <div class="node-wrapper">
                <div class="duo-node ${statusClass}" onclick="openWeekLevel(${w}, this)">
                    <span style="font-weight:800; font-size:20px;">${w}</span>
                </div>
                <div class="crowns-row">${crownsHtml}</div>
                ${statusClass === 'active' ? '<div class="speech-bubble">ТУТ ТЫ</div>' : ''}
            </div>
        `;
        mapContainer.appendChild(row);
    }
}

window.openWeekLevel = function(weekNum, element) {
    if (element.classList.contains('locked')) {
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }
    if (weekNum === currentWeek && (!aiWorkout || aiWorkout.length === 0)) {
        const overlay = document.getElementById('ai-loading-overlay');
        const textEl = document.getElementById('loading-text');
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
        textEl.innerText = "СВЯЗЬ С СЕРВЕРОМ...";

        fetch(`${SERVER_URL}/api/generate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: USER_ID })
        })
        .then(r => r.json())
        .then(data => {
            if (data.status === 'ok') {
                aiWorkout = data.plan;
                overlay.classList.add('hidden');
                openWeekLevel(weekNum, element);
            }
        });
        return;
    }

    tg.HapticFeedback.impactOccurred('light');
    document.getElementById('workout-modal-screen').classList.remove('hidden');
    document.getElementById('modal-title').innerText = `НЕДЕЛЯ ${weekNum}`;
    const modalDayDisplay = document.getElementById('modal-day-display');
    if (modalDayDisplay) modalDayDisplay.innerText = currentDay;

    let targetWorkout = (weekNum === currentWeek && aiWorkout) ? aiWorkout : [{ name: "Выпрыгивания", sets: 3, reps: 15 }];
    renderDailyExercises(targetWorkout);
}

window.closeWorkoutModal = function() {
    document.getElementById('workout-modal-screen').classList.add('hidden');
}

function renderDailyExercises(workoutData) {
    const list = document.getElementById('modal-exercise-list');
    if (!list) return;
    list.innerHTML = "";
    window.activeWorkoutData = workoutData;
    workoutData.forEach((ex, index) => {
        const dbData = exercisesDB[ex.name] || { icon: "🏋️" };
        const div = document.createElement('div');
        div.id = `card-ex-${index}`;
        div.className = 'card' + (index === 0 ? ' next-up' : '');
        div.onclick = () => toggleTaskInModal(index);
        div.innerHTML = `
            <div class="card-left">
                <div class="icon-box">${dbData.icon}</div>
                <div class="info"><h3>${ex.name}</h3><p>${ex.sets} x ${ex.reps}</p></div>
            </div>
            <div class="checkbox" id="modal-check-${index}"></div>
        `;
        list.appendChild(div);
    });
    updateModalProgress();
}

window.toggleTaskInModal = function(index) {
    const checkbox = document.getElementById(`modal-check-${index}`);
    const card = document.getElementById(`card-ex-${index}`);
    if (checkbox && !checkbox.classList.contains('checked')) {
        checkbox.classList.add('checked');
        card.classList.remove('next-up');
        card.classList.add('completed');
        const nextCard = document.getElementById(`card-ex-${index + 1}`);
        if (nextCard) nextCard.classList.add('next-up');
        tg.HapticFeedback.impactOccurred('medium');
        const dbData = exercisesDB[window.activeWorkoutData[index].name];
        if(dbData && dbData.gif) {
            document.getElementById('exercise-gif').src = dbData.gif;
            startTimer(60);
        }
    }
    updateModalProgress();
}

function updateModalProgress() {
    const total = window.activeWorkoutData ? window.activeWorkoutData.length : 0;
    const done = document.querySelectorAll('#modal-exercise-list .checkbox.checked').length;
    const percent = total === 0 ? 0 : (done / total) * 100;
    const modalProgressBar = document.getElementById('modal-progress');
    const modalProgressText = document.getElementById('modal-progress-text');
    if (modalProgressBar) modalProgressBar.style.width = `${percent}%`;
    if (modalProgressText) modalProgressText.innerText = `${done} / ${total}`;
    const finishArea = document.getElementById('modal-finish-btn-area');
    if (finishArea && done === total && total > 0) {
        finishArea.innerHTML = `<button onclick="finishWorkoutFlow()" class="save-btn">🏁 ЗАВЕРШИТЬ ТРЕНИРОВКУ</button>`;
    }
}

window.finishWorkoutFlow = function() {
    closeWorkoutModal();
    document.getElementById('tab-workout').classList.remove('active');
    document.getElementById('success-screen').classList.remove('hidden');
    const gain = parseFloat((0.35 + Math.random() * 0.2).toFixed(2));
    const gainDisplay = document.getElementById('jump-gain-display');
    if (gainDisplay) gainDisplay.innerText = `🚀 +${gain} см к прыжку`;

    tg.MainButton.text = "⏳ СОХРАНЕНИЕ...";
    tg.MainButton.show();
    tg.MainButton.disable();

    fetch(`${SERVER_URL}/api/complete`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ user_id: USER_ID, gain: gain })
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'ok') {
            tg.MainButton.text = "✅ ЗАКРЫТЬ";
            tg.MainButton.enable();
            tg.MainButton.onClick(() => tg.close());

            currentDay++;
            if(currentDay > 3) { currentDay = 1; currentWeek++; }
            currentXP += 50;
            pJump += gain;
            syncUI();
        }
    });
}

let timerInterval;
const timerValueDisplay = document.getElementById('timerValue');
function startTimer(seconds) {
    const modal = document.getElementById('timerModal');
    const timerControls = document.getElementById('timer-controls');
    const glossaryInfo = document.getElementById('glossary-info');
    if (timerControls) timerControls.classList.remove('hidden');
    if (glossaryInfo) glossaryInfo.classList.add('hidden');
    modal.classList.add('active');
    let timeLeft = seconds;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        const min = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const sec = (timeLeft % 60).toString().padStart(2, '0');
        if (timerValueDisplay) timerValueDisplay.innerText = `${min}:${sec}`;
        if(timeLeft <= 0) stopTimer();
    }, 1000);
}

window.stopTimer = function() {
    clearInterval(timerInterval);
    document.getElementById('timerModal').classList.remove('active');
}

window.switchTab = function(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    if (element) element.classList.add('active');
    tg.HapticFeedback.impactOccurred('light');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 🔥 СВАЙП-ЛОГИКА (СОХРАНЕНА)
function enableSwipeToClose() {
    const modal = document.getElementById('timerModal');
    const content = document.getElementById('glossary-info');
    if (!modal || !content) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let startScrollTop = 0;
    let isTouchingContent = false;

    modal.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isTouchingContent = !!e.target.closest('#glossary-info');
        if (isTouchingContent && !content.classList.contains('hidden')) {
            startScrollTop = content.scrollTop;
        } else {
            startScrollTop = 0;
        }
        isDragging = true;
    }, {passive: false});

    modal.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0 && startScrollTop <= 0) {
            if (e.cancelable) e.preventDefault();
            modal.style.transition = 'none';
            modal.style.transform = `translate3d(0, ${diff}px, 0)`;
        }
    }, {passive: false});

    modal.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const diff = currentY - startY;
        modal.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        if (diff > 120 && startScrollTop <= 0) {
            modal.style.transform = 'translate3d(0, 100%, 0)';
            setTimeout(() => {
                modal.classList.remove('active');
                modal.style.transform = '';
                stopTimer();
            }, 300);
        } else {
            if (modal.classList.contains('active')) {
                modal.style.transform = 'translate3d(0, 0, 0)';
            }
        }
    });
}
enableSwipeToClose();