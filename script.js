const tg = window.Telegram.WebApp;
tg.expand();

// =======================================================
// 1. ПАРСИНГ ПАРАМЕТРОВ (ИЗ URL)
// =======================================================
const urlParams = new URLSearchParams(window.location.search);
const currentWeek = parseInt(urlParams.get('week')) || 1;
const currentDay = parseInt(urlParams.get('day')) || 1;
const currentXP = parseInt(urlParams.get('xp')) || 0;
const pHeight = parseInt(urlParams.get('h')) || 0;
const pWeight = parseInt(urlParams.get('w')) || 0;
const pJump = parseFloat(urlParams.get('j')) || 0;
const pReach = parseInt(urlParams.get('r')) || 0;
const pBg = decodeURIComponent(urlParams.get('bg') || 'Beginner'); // Это статический опыт
const pGoal = decodeURIComponent(urlParams.get('goal') || 'Vertical Jump');
const userName = decodeURIComponent(urlParams.get('name') || 'Атлет');
const currentStreak = parseInt(urlParams.get('streak')) || 0;
const lastGain = parseFloat(urlParams.get('gain')) || 0;

// --- СИСТЕМА РАНГОВ (ДИНАМИЧЕСКИЕ ЗВАНИЯ) ---
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
if (pHeight === 0 || pWeight === 0) {
    document.getElementById('onboarding-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('nav-bar').classList.add('hidden');
} else {
    document.getElementById('main-app').classList.remove('hidden');
}

// =======================================================
// 3. ЗАПОЛНЕНИЕ ДАННЫХ В ИНТЕРФЕЙСЕ
// =======================================================
document.getElementById('week-num').innerText = currentWeek;

// Заполнение профиля
document.getElementById('profile-name').innerText = userName;
document.getElementById('display-goal').innerText = pGoal;
document.getElementById('display-height').innerText = pHeight;
document.getElementById('display-jump').innerText = pJump.toFixed(1);
document.getElementById('display-reach').innerText = pReach;
document.getElementById('display-xp').innerText = currentXP;
document.getElementById('streak-display').innerText = currentStreak;

document.getElementById('display-bg').innerText = pBg;

// 🔥 НОВОЕ: Отображаем Ранг отдельной плашкой под именем
const currentRank = getRank(currentXP);
const profileHeader = document.querySelector('.profile-header');
let rankBadge = document.getElementById('rank-badge-dynamic');

// Если плашки нет - создаем её
if (!rankBadge) {
    rankBadge = document.createElement('div');
    rankBadge.id = 'rank-badge-dynamic';
    // Красивый стиль для звания (оранжевый градиент)
    rankBadge.style.cssText = `
        background: linear-gradient(45deg, #ff9800, #ff5722);
        color: white;
        padding: 5px 15px;
        border-radius: 20px;
        font-weight: 800;
        display: inline-block;
        margin-top: 10px;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(255, 87, 34, 0.4);
        border: 1px solid rgba(255,255,255,0.2);
        text-transform: uppercase;
        letter-spacing: 1px;
    `;
    // Вставляем сразу после имени
    const nameEl = document.getElementById('profile-name');
    nameEl.parentNode.insertBefore(rankBadge, nameEl.nextSibling);
}
rankBadge.innerText = `${currentRank.icon} ${currentRank.name}`;


// МОТИВАЦИЯ: Лог в консоль
const nextRankIdx = RANKS.indexOf(currentRank) + 1;
if (nextRankIdx < RANKS.length) {
    const nextRank = RANKS[nextRankIdx];
    const needed = nextRank.min - currentXP;
    console.log(`До ранга ${nextRank.name} осталось ${needed} XP`);
}

// Логика отображения "ДЕНЬ Х"
const dayDisplay = document.getElementById('day-display');
dayDisplay.innerHTML = `ДЕНЬ ${currentDay} / 3`;

// --- ЛОГИКА ПРОГРЕССА НЕДЕЛИ (ГЛАВНЫЙ ЭКРАН) ---
const mainProgressBar = document.getElementById('progress');
const mainProgressText = document.getElementById('progress-text-val');

// Считаем процент: (Текущий день - 1) / 3 дня в неделе
// День 1 = 0% (начало)
// День 2 = 33% (1 прошел)
// День 3 = 66% (2 прошло)
let weeklyPercent = Math.round(((currentDay - 1) / 3) * 100);

// Если неделя только началась, даем хотя бы 5% для красоты
if (currentDay === 1) weeklyPercent = 2;

if (mainProgressBar && mainProgressText) {
    // Анимация при загрузке (через 300мс)
    setTimeout(() => {
        mainProgressBar.style.width = `${weeklyPercent}%`;

        // Меняем цвет полоски на оранжевый, если это 3-й день (финишная прямая)
        if (currentDay === 3) {
            mainProgressBar.style.background = 'linear-gradient(90deg, #ff9800, #ff5722)';
            mainProgressBar.style.boxShadow = '0 0 15px #ff5722';
        }
    }, 300);

    mainProgressText.innerText = `${weeklyPercent}%`;
}
// Бейдж AI
if (aiWorkout) {
    const badge = document.createElement('span');
    badge.className = 'ai-badge';
    badge.innerHTML = 'AI 🧠';
    dayDisplay.appendChild(badge);
}

// --- ТАБЛИЦА ЛИДЕРОВ ---
const leaderContainer = document.getElementById('tab-leaderboard');
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

// Кнопка обновления
const btn = document.createElement('button');
btn.className = 'refresh-btn';
btn.innerText = '🔄 Обновить таблицу';
btn.onclick = window.refreshData;
leaderContainer.appendChild(btn);


// =======================================================
// ЛОГИКА ГЛОССАРИЯ (WIKI)
// =======================================================

function renderGlossary() {
    const list = document.getElementById('glossary-list');
    list.innerHTML = ""; // Очищаем

    // Пробегаемся по базе данных exercisesDB из data.js
    for (const [name, data] of Object.entries(exercisesDB)) {
        const div = document.createElement('div');
        div.className = 'card'; // Используем тот же стиль, что и в тренировке
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

// Запускаем рендер при старте
renderGlossary();

function openGlossaryItem(name, data) {
    const modal = document.getElementById('timerModal');
    const img = document.getElementById('exercise-gif');

    // Элементы глоссария
    const glossInfo = document.getElementById('glossary-info');
    const glossTitle = document.getElementById('gloss-title');
    const glossDesc = document.getElementById('gloss-desc');

    // Элементы таймера (их надо скрыть)
    const timerControls = document.getElementById('timer-controls');

    // 1. Наполняем контент
    img.src = data.gif;
    glossTitle.innerText = name;
    glossDesc.innerText = data.desc;

    // 2. Переключаем режим модалки (Инфо вместо Таймера)
    timerControls.classList.add('hidden');
    glossInfo.classList.remove('hidden');

    // 3. Открываем модалку (анимация)
    modal.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    modal.style.transform = '';
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });

    // Вибрация
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
    const j = document.getElementById('in-jump').value;
    const r = document.getElementById('in-reach').value;
    const bg = document.getElementById('in-bg').value;
    const goal = document.getElementById('in-goal').value;
    if(!h || !w || !goal || !r) {
        tg.showAlert("Заполни все поля, атлет!");
        return;
    }
    tg.sendData(JSON.stringify({
        action: "save_profile",
        h: h, w: w, j: j || 0, r: r, bg: bg, goal: goal
    }));
}

function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Sound error:", e));
    }
}

// =======================================================
// 6. РЕНДЕР КАРТЫ (ДИНАМИЧЕСКИЙ ПУТЬ С КОРОНАМИ)
// =======================================================

const pathContainer = document.getElementById('exercise-list');
pathContainer.innerHTML = `<div class="duo-container" id="map-container"></div>`;
const mapContainer = document.getElementById('map-container');

// 🔥 ДИНАМИКА: Минимум 15 недель, но если атлет дальше - рисуем больше
const TOTAL_WEEKS = Math.max(15, currentWeek + 5);
const WORKOUTS_PER_WEEK = 3;

for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const posType = w % 4;
    let posClass = 'pos-center';
    if (posType === 1) posClass = 'pos-left';
    if (posType === 3) posClass = 'pos-right';

    const row = document.createElement('div');
    row.className = `duo-row ${posClass}`;

    let statusClass = 'locked';
    let icon = w;
    let earnedCrowns = 0;

    if (w < currentWeek) {
        statusClass = 'done';
        earnedCrowns = 3;
    } else if (w === currentWeek) {
        statusClass = 'active';
        earnedCrowns = currentDay - 1;
    } else {
        earnedCrowns = 0;
    }

    let crownsHtml = '';
    for (let i = 0; i < WORKOUTS_PER_WEEK; i++) {
        const isEarned = i < earnedCrowns;
        crownsHtml += `<span class="crown-icon ${isEarned ? 'earned' : ''}">👑</span>`;
    }

    const nodeId = `week-node-${w}`;
    row.innerHTML = `
        <div class="node-wrapper">
            <div class="duo-node ${statusClass}" id="${nodeId}" onclick="openWeekLevel(${w}, this)">
                <span style="font-weight:800; font-size:20px;">${icon}</span>
            </div>
            <div class="crowns-row">
                ${crownsHtml}
            </div>
        </div>
    `;

    mapContainer.appendChild(row);

    if (statusClass === 'active') {
        const wrapper = row.querySelector('.node-wrapper');
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.innerText = 'ТУТ ТЫ';
        wrapper.appendChild(bubble);
    }
}

// =======================================================
// 6.1 ЛОГИКА МОДАЛЬНОГО ОКНА
// =======================================================

window.openWeekLevel = function(weekNum, element) {
    if (element.classList.contains('locked')) {
        tg.HapticFeedback.notificationOccurred('error');
        element.style.animation = 'shake 0.5s';
        setTimeout(() => element.style.animation = '', 500);
        return;
    }

    // 🔥 НОВАЯ ЛОГИКА: Если это текущая неделя, но плана НЕТ (aiWorkout пустой)
    // Значит мы в режиме Fast Mode, и нужно красиво сгенерировать план.
    if (weekNum === currentWeek && (!aiWorkout || aiWorkout.length === 0)) {
        tg.HapticFeedback.notificationOccurred('warning');

        // 1. Показываем эпичную заставку
        const overlay = document.getElementById('ai-loading-overlay');
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';

        // 2. Анимация текста (для красоты)
        const texts = ["Сканирование профиля...", "Анализ мышц...", "Генерация нейросети...", "Создание плана..."];
        let step = 0;
        const textEl = overlay.querySelector('p');

        const interval = setInterval(() => {
            if(step < texts.length) textEl.innerText = texts[step++];
        }, 500);

        // 3. Через 2 секунды (чтобы юзер успел кайфануть) отправляем сигнал боту
        setTimeout(() => {
            clearInterval(interval);
            // Это закроет WebApp и отправит "generate_ai" боту
            tg.sendData(JSON.stringify({ action: "generate_ai" }));
        }, 2000);

        return; // Прерываем открытие пустой модалки
    }

    // --- СТАНДАРТНОЕ ОТКРЫТИЕ (ЕСЛИ ПЛАН УЖЕ ЕСТЬ) ---
    tg.HapticFeedback.impactOccurred('light');
    document.getElementById('workout-modal-screen').classList.remove('hidden');
    document.getElementById('modal-title').innerText = `НЕДЕЛЯ ${weekNum}`;
    document.getElementById('modal-day-display').innerText = currentDay;

    let targetWorkout = [];

    // Логика выбора (как и была)
    if (weekNum === currentWeek && aiWorkout) {
        targetWorkout = aiWorkout;
        const typeIdx = ((currentDay - 1) % 3);
        const types = ["СОБСТВЕННЫЙ ВЕС 🤸", "СИЛОВАЯ 🏋️", "ВЗРЫВНАЯ 🧨"];
        document.getElementById('modal-title').innerText += ` | ${types[typeIdx]}`;
    } else {
        // Заглушка для архива
        targetWorkout = [
            { name: "Выпрыгивания", sets: 3, reps: 15 },
            { name: "Прыжки на икрах", sets: 3, reps: 20 }
        ];
        if (weekNum < currentWeek) {
             document.getElementById('modal-title').innerText += " (Архив)";
        }
    }

    renderDailyExercises(targetWorkout);
}

window.closeWorkoutModal = function() {
    document.getElementById('workout-modal-screen').classList.add('hidden');
}

function renderDailyExercises(workoutData) {
    const list = document.getElementById('modal-exercise-list');
    const finishArea = document.getElementById('modal-finish-btn-area');

    list.innerHTML = "";
    finishArea.innerHTML = "";
    updateModalProgress(); // Сбрасываем бар сразу при открытии

    window.activeWorkoutData = workoutData;

    workoutData.forEach((ex, index) => {
        const dbData = exercisesDB[ex.name] || { desc: "Упр", icon: "🏋️", gif: "" };
        const div = document.createElement('div');

        div.id = `card-ex-${index}`;
        div.className = 'card';
        // Первое упражнение сразу подсвечиваем
        if (index === 0) div.classList.add('next-up');

        div.onclick = () => toggleTaskInModal(index);
        div.innerHTML = `
            <div class="card-left">
                <div class="icon-box">${dbData.icon}</div>
                <div class="info">
                    <h3 style="margin:0; font-size:16px;">${ex.name}</h3>
                    <p style="margin:0; color:var(--text-sec); font-size:13px;">${ex.sets} x ${ex.reps}</p>
                </div>
            </div>
            <div class="checkbox" id="modal-check-${index}"></div>
        `;
        list.appendChild(div);
    });
}

window.toggleTaskInModal = function(index) {
    const checkbox = document.getElementById(`modal-check-${index}`);
    const card = document.getElementById(`card-ex-${index}`);

    if (!checkbox.classList.contains('checked')) {
        checkbox.classList.add('checked');

        // Гасим текущую карточку
        card.classList.remove('next-up');
        card.classList.add('completed');

        // Подсвечиваем следующую
        const nextCard = document.getElementById(`card-ex-${index + 1}`);
        if (nextCard) nextCard.classList.add('next-up');

        tg.HapticFeedback.impactOccurred('medium');
        playSound('sound-click');

        const exName = window.activeWorkoutData[index].name;
        const dbData = exercisesDB[exName];

        const img = document.getElementById('exercise-gif');
        img.src = dbData ? dbData.gif : "";

        if(dbData && dbData.gif) {
            startTimer(60);
        }

    } else {
        checkbox.classList.remove('checked');
        card.classList.remove('completed');

        // Возвращаем фокус
        card.classList.add('next-up');

        // Убираем фокус со следующей
        const nextCard = document.getElementById(`card-ex-${index + 1}`);
        if (nextCard) nextCard.classList.remove('next-up');
    }

    setTimeout(() => {
        updateModalProgress();
    }, 50);
}

function updateModalProgress() {
    if (!window.activeWorkoutData) return;

    const total = window.activeWorkoutData.length;
    const done = document.querySelectorAll('#modal-exercise-list .checkbox.checked').length;

    const progressBar = document.getElementById('modal-progress');
    const progressText = document.getElementById('modal-progress-text');

    const percent = total === 0 ? 0 : (done / total) * 100;

    // Теперь это работает плавно за счет CSS transition
    progressBar.style.width = `${percent}%`;

    if (progressText) {
        progressText.innerText = `${done} / ${total}`;
        progressText.style.color = (done === total) ? '#00ff00' : 'var(--text-sec)';
    }

    const finishArea = document.getElementById('modal-finish-btn-area');
    if (done === total && total > 0) {
        finishArea.innerHTML = `
            <button onclick="finishWorkoutFlow()" class="save-btn" style="background:#00f2ff; color:black; margin-top:20px; animation: bounceIn 0.5s;">
                🏁 ЗАВЕРШИТЬ ТРЕНИРОВКУ
            </button>
        `;
        setTimeout(() => {
            finishArea.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
    } else {
        finishArea.innerHTML = "";
    }
}

window.finishWorkoutFlow = function() {
    closeWorkoutModal();
    showSuccessScreen();
}

// =======================================================
// 7. ЭКРАН УСПЕХА И СОХРАНЕНИЕ
// =======================================================

let sessionGain = 0;
let xpReward = 50;

function showSuccessScreen() {
    document.getElementById('tab-workout').classList.remove('active');
    document.getElementById('nav-bar').classList.add('hidden');
    document.getElementById('success-screen').classList.remove('hidden');

    tg.HapticFeedback.notificationOccurred('success');
    playSound('sound-win');

    // КРИТ (Dopamine #2)
    const isCrit = Math.random() < 0.10;
    xpReward = 50;

    const xpBox = document.querySelector('.xp-reward');

    if (isCrit) {
        xpReward = 100;
        xpBox.style.color = "#ffd700";
        xpBox.style.boxShadow = "0 0 30px #ffd700";
        tg.HapticFeedback.notificationOccurred('warning');
    } else {
        xpBox.style.color = "var(--primary)";
        xpBox.style.boxShadow = "0 0 20px rgba(0, 242, 255, 0.3)";
    }

    // Анимация чисел (Dopamine #3)
    animateValue(xpBox, 0, xpReward, 1500);

    // Расчет прогресса
    let baseGain = 0.35;
    if (pBg === 'Intermediate') baseGain = 0.15;
    else if (pBg === 'Advanced') baseGain = 0.04;

    const streakBonus = 1.0 + Math.min(currentStreak * 0.05, 0.5);
    const dimFactor = Math.max(0.1, (120 - pJump) / 80);
    const rnd = 0.9 + Math.random() * 0.2;

    let rawGain = baseGain * streakBonus * dimFactor * rnd;
    sessionGain = parseFloat(rawGain.toFixed(2));

    document.getElementById('jump-gain-display').innerText = `🚀 +${sessionGain} см к прыжку`;

    tg.MainButton.text = "💾 СОХРАНИТЬ ПРОГРЕСС";
    tg.MainButton.color = "#00f2ff";
    tg.MainButton.textColor = "#000000";
    tg.MainButton.show();

    tg.MainButton.offClick(sendDataAndClose);
    tg.MainButton.onClick(sendDataAndClose);
}

// Анимация чисел
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);

        const prefix = value > 50 ? "🔥 КРИТ! +" : "+";
        obj.innerHTML = prefix + value + " XP";

        if (value % 5 === 0) tg.HapticFeedback.selectionChanged();

        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function sendDataAndClose() {
    const data = JSON.stringify({
        week: currentWeek,
        day: currentDay,
        status: "success",
        gain: sessionGain,
        xp_earned: xpReward
    });
    tg.sendData(data);
}

// =======================================================
// 8. ТАЙМЕР И СВАЙПЫ (GPU ОПТИМИЗАЦИЯ)
// =======================================================

let timerInterval;

function startTimer(seconds) {
    const modal = document.getElementById('timerModal');

    // 🔥 ФИКС: Показываем таймер, скрываем текст глоссария
    document.getElementById('timer-controls').classList.remove('hidden');
    document.getElementById('glossary-info').classList.add('hidden');
    let timeLeft = seconds;

    // Сбрасываем стили перед открытием
    modal.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    modal.style.transform = '';

    // Запускаем открытие через класс
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });

    clearInterval(timerInterval);
    display.innerText = "01:00";

    timerInterval = setInterval(() => {
        timeLeft--;
        const min = Math.floor(timeLeft / 60).toString().padStart(2,'0');
        const sec = (timeLeft % 60).toString().padStart(2,'0');
        display.innerText = `${min}:${sec}`;
        if(timeLeft <= 0) stopTimer();
    }, 1000);
}

window.stopTimer = function() {
    clearInterval(timerInterval);
    const modal = document.getElementById('timerModal');

    // Закрываем убиранием класса
    modal.classList.remove('active');

    // Ждем окончания анимации закрытия (300мс) перед проверкой прогресса
    setTimeout(() => {
        updateModalProgress();
        // Скролл к кнопке завершения, если она появилась
        const finishBtn = document.getElementById('modal-finish-btn-area');
        if (finishBtn && finishBtn.innerHTML !== "") {
            finishBtn.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, 300);
}

// 🔥 СУПЕР ПЛАВНЫЙ СВАЙП (ВЕРСИЯ 3.0 - FIX SCROLL)
function enableSwipeToClose() {
    const modal = document.getElementById('timerModal');
    const content = document.getElementById('glossary-info');

    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let startScrollTop = 0;
    let isTouchingContent = false; // Флаг: касаемся ли мы текста?

    modal.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;

        // Проверяем, коснулись ли мы блока с текстом
        // e.target.closest('#glossary-info') вернет элемент, если мы внутри текста
        isTouchingContent = !!e.target.closest('#glossary-info');

        // ЛОГИКА:
        // 1. Если мы касаемся текста, запоминаем его позицию скролла.
        // 2. Если мы касаемся "ручки" или картинки (не текста), считаем скролл = 0 (всегда готовы тянуть).
        if (isTouchingContent && !content.classList.contains('hidden')) {
            startScrollTop = content.scrollTop;
        } else {
            startScrollTop = 0;
        }

        isDragging = true;
    }, {passive: false}); // passive: false ОБЯЗАТЕЛЬНО для блокировки скролла страницы

    modal.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        // Если тянем ВНИЗ (diff > 0) И мы находимся в самом верху текста (startScrollTop <= 0)
        if (diff > 0 && startScrollTop <= 0) {
            // ⛔️ Блокируем стандартный скролл страницы/телеграма
            if (e.cancelable) e.preventDefault();

            modal.style.transition = 'none';
            modal.style.transform = `translate3d(0, ${diff}px, 0)`;
        }
        // Если тянем текст вверх (читаем дальше) - работает обычный скролл (не preventDefault)
    }, {passive: false});

    modal.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const diff = currentY - startY;

        // Включаем обратно плавную анимацию
        modal.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';

        // Если тянули окно вниз достаточно сильно и текст был наверху
        if (diff > 120 && startScrollTop <= 0) {
            // Закрываем
            modal.style.transform = 'translate3d(0, 100%, 0)';
            setTimeout(() => {
                modal.classList.remove('active');
                modal.style.transform = '';
                stopTimer();
            }, 300);
        } else {
            // Возвращаем на место (пружина)
            if (modal.classList.contains('active')) {
                modal.style.transform = 'translate3d(0, 0, 0)';
            }
        }
        startY = 0;
        currentY = 0;
    });
}
enableSwipeToClose();
// =======================================================
// 9. НАВИГАЦИЯ (Этой функции не хватало)
// =======================================================
window.switchTab = function(tabId, element) {
    // 1. Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // 2. Убираем подсветку со всех кнопок
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // 3. Показываем нужную вкладку
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    // 4. Подсвечиваем нажатую кнопку
    if (element) {
        element.classList.add('active');
    }

    // 5. Легкая вибрация для тактильности
    tg.HapticFeedback.impactOccurred('light');

    // Скроллим наверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
}