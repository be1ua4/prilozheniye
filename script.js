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
const pBg = decodeURIComponent(urlParams.get('bg') || 'Beginner');
const pGoal = decodeURIComponent(urlParams.get('goal') || 'Vertical Jump');
const userName = decodeURIComponent(urlParams.get('name') || 'Атлет');
const currentStreak = parseInt(urlParams.get('streak')) || 0;
const lastGain = parseFloat(urlParams.get('gain')) || 0;

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
document.getElementById('display-bg').innerText = pBg;
document.getElementById('display-xp').innerText = currentXP;

// Логика отображения "ДЕНЬ Х"
const dayDisplay = document.getElementById('day-display');
dayDisplay.innerHTML = `ДЕНЬ ${currentDay} / 3`;

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


// --- ВКЛАДКА JUMP (МАТЕМАТИКА) ---
const rimHeight = 305;
const maxTouch = pReach + pJump;
const needed = rimHeight - maxTouch;
document.getElementById('calc-touch').innerText = maxTouch.toFixed(1);

if (maxTouch >= rimHeight) {
    document.getElementById('calc-need').innerText = "0 (ТЫ ДОСТАЛ!)";
    document.getElementById('calc-need').style.color = "#00ff00";
} else {
    document.getElementById('calc-need').innerText = needed.toFixed(1);
}

document.getElementById('jump-tab-val').innerText = pJump.toFixed(2);
if (lastGain > 0) {
    document.getElementById('jump-tab-gain').innerText = `+${lastGain} см (посл. треня)`;
} else {
    document.getElementById('jump-tab-gain').innerText = "Тренируйся, чтобы расти!";
    document.getElementById('jump-tab-gain').style.background = 'transparent';
    document.getElementById('jump-tab-gain').style.color = '#8b8b93';
}

const barHeight = (maxTouch / 320) * 100;
document.getElementById('rim-bar').style.height = `${barHeight}%`;

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
    // 1. Позиция (Center -> Left -> Center -> Right)
    const posType = w % 4;
    let posClass = 'pos-center';
    if (posType === 1) posClass = 'pos-left';
    if (posType === 3) posClass = 'pos-right';

    // 2. Создаем ряд
    const row = document.createElement('div');
    row.className = `duo-row ${posClass}`;

    // 3. Статус и Короны
    let statusClass = 'locked';
    let icon = w;
    let earnedCrowns = 0;

    if (w < currentWeek) {
        statusClass = 'done'; // Пройденная неделя
        earnedCrowns = 3;     // Все короны получены
    } else if (w === currentWeek) {
        statusClass = 'active'; // Текущая неделя
        // Если день 1 -> 0 корон, День 2 -> 1 корона и т.д.
        earnedCrowns = currentDay - 1;
    } else {
        earnedCrowns = 0; // Будущее
    }

    // 4. Генерируем HTML корон
    let crownsHtml = '';
    for (let i = 0; i < WORKOUTS_PER_WEEK; i++) {
        const isEarned = i < earnedCrowns;
        crownsHtml += `<span class="crown-icon ${isEarned ? 'earned' : ''}">👑</span>`;
    }

    // 5. Собираем HTML узла
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

    // 6. Линии (Connector)
    if (w > 1) {
        const line = document.createElement('div');
        line.className = 'path-connector';
        line.style.top = "-50px"; // Тянемся вверх

        if (posClass === 'pos-center') line.style.left = "50%";
        if (posClass === 'pos-left') line.style.left = "30%";
        if (posClass === 'pos-right') line.style.left = "70%";

        mapContainer.appendChild(line);
    }

    mapContainer.appendChild(row);

    // 7. Пузырь "ТУТ ТЫ" (добавляем программно, чтобы не ломать верстку строки)
    if (statusClass === 'active') {
        const wrapper = row.querySelector('.node-wrapper');
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.innerText = 'ТУТ ТЫ';
        wrapper.appendChild(bubble);
    }
}

// =======================================================
// 6.1 ЛОГИКА МОДАЛЬНОГО ОКНА (ТРЕНИРОВКА ВНУТРИ НЕДЕЛИ)
// =======================================================

window.openWeekLevel = function(weekNum, element) {
    // Проверка доступа (если замок - трясем)
    if (element.classList.contains('locked')) {
        tg.HapticFeedback.notificationOccurred('error');
        element.style.animation = 'shake 0.5s';
        setTimeout(() => element.style.animation = '', 500);
        return;
    }

    // Открываем модалку
    tg.HapticFeedback.impactOccurred('light');
    document.getElementById('workout-modal-screen').classList.remove('hidden');
    document.getElementById('modal-title').innerText = `НЕДЕЛЯ ${weekNum}`;
    document.getElementById('modal-day-display').innerText = currentDay;

    // Подбираем программу
    let targetWorkout = [];
    if (weekNum === currentWeek && aiWorkout) {
        targetWorkout = aiWorkout; // AI программа на сегодня
    } else {
        targetWorkout = programs[weekNum] || []; // Стандартная программа из базы
    }

    renderDailyExercises(targetWorkout);
}

window.closeWorkoutModal = function() {
    document.getElementById('workout-modal-screen').classList.add('hidden');
}

// Рендер списка карточек
function renderDailyExercises(workoutData) {
    const list = document.getElementById('modal-exercise-list');
    const progressBar = document.getElementById('modal-progress');
    const finishArea = document.getElementById('modal-finish-btn-area');

    list.innerHTML = "";
    finishArea.innerHTML = "";
    progressBar.style.width = "0%";

    // Сохраняем активную тренировку
    window.activeWorkoutData = workoutData;

    workoutData.forEach((ex, index) => {
        const dbData = exercisesDB[ex.name] || { desc: "Упр", icon: "🏋️", gif: "" };
        const div = document.createElement('div');
        div.className = 'card';
        div.onclick = () => toggleTaskInModal(index);
        div.innerHTML = `
            <div class="card-left">
                <div class="icon-box">${dbData.icon}</div>
                <div class="info">
                    <h3>${ex.name}</h3>
                    <p>${ex.sets} x ${ex.reps}</p>
                </div>
            </div>
            <div class="checkbox" id="modal-check-${index}"></div>
        `;
        list.appendChild(div);
    });
}

// Клик по упражнению в списке
window.toggleTaskInModal = function(index) {
    const checkbox = document.getElementById(`modal-check-${index}`);

    if (!checkbox.classList.contains('checked')) {
        // Если не сделано -> Запускаем таймер и отмечаем
        checkbox.classList.add('checked');
        tg.HapticFeedback.impactOccurred('medium');
        playSound('sound-click');

        const exName = window.activeWorkoutData[index].name;
        const dbData = exercisesDB[exName];

        // Картинка в таймере
        const img = document.getElementById('exercise-gif');
        img.src = dbData ? dbData.gif : "";
        img.style.display = dbData.gif ? 'block' : 'none';

        startTimer(60); // Запуск таймера
    } else {
        // Если уже сделано -> Снимаем галочку (если случайно нажали)
        checkbox.classList.remove('checked');
    }
    updateModalProgress();
}

function updateModalProgress() {
    const total = window.activeWorkoutData.length;
    const done = document.querySelectorAll('#modal-exercise-list .checkbox.checked').length;
    const progressBar = document.getElementById('modal-progress');

    progressBar.style.width = `${(done / total) * 100}%`;

    // Если все галочки стоят -> Показываем кнопку ЗАВЕРШИТЬ
    const finishArea = document.getElementById('modal-finish-btn-area');
    if (done === total && total > 0) {
        finishArea.innerHTML = `
            <button onclick="finishWorkoutFlow()" class="save-btn" style="background:#00f2ff; color:black; margin-top:20px; animation: bounceIn 0.5s;">
                🏁 ЗАВЕРШИТЬ ТРЕНИРОВКУ
            </button>
        `;
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

function showSuccessScreen() {
    document.getElementById('tab-workout').classList.remove('active');
    document.getElementById('nav-bar').classList.add('hidden');
    document.getElementById('success-screen').classList.remove('hidden');

    tg.HapticFeedback.notificationOccurred('success');
    playSound('sound-win');

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

    // 🔥 ПОКАЗЫВАЕМ КНОПКУ TELEGRAM
    tg.MainButton.text = "💾 СОХРАНИТЬ ПРОГРЕСС";
    tg.MainButton.color = "#00f2ff";
    tg.MainButton.textColor = "#000000";
    tg.MainButton.show();

    tg.MainButton.offClick(sendDataAndClose); // защита от дублей
    tg.MainButton.onClick(sendDataAndClose);
}

function sendDataAndClose() {
    const data = JSON.stringify({
        week: currentWeek,
        day: currentDay,
        status: "success",
        gain: sessionGain
    });
    tg.sendData(data);
}

// =======================================================
// 8. ТАЙМЕР И ИНТЕРФЕЙС
// =======================================================

let timerInterval;

function startTimer(seconds) {
    const modal = document.getElementById('timerModal');
    const display = document.getElementById('timerValue');
    let timeLeft = seconds;

    modal.style.transition = 'bottom 0.5s cubic-bezier(0.19, 1, 0.22, 1)';
    modal.style.transform = '';
    modal.classList.add('active');

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        const min = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const sec = (timeLeft % 60).toString().padStart(2, '0');
        display.innerText = `${min}:${sec}`;
        if (timeLeft <= 0) stopTimer();
    }, 1000);
}

window.stopTimer = function() {
    clearInterval(timerInterval);
    document.getElementById('timerModal').classList.remove('active');
}

// Переключение вкладок меню
window.switchTab = function(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
    tg.HapticFeedback.impactOccurred('light');
}

// Свайп для закрытия таймера
function enableSwipeToClose() {
    const modal = document.getElementById('timerModal');
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    modal.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
        modal.style.transition = 'none';
    }, {passive: false});

    modal.addEventListener('touchmove', (e) => {
        if (isDragging) e.preventDefault();
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0) {
            requestAnimationFrame(() => {
                modal.style.transform = `translateY(${diff}px)`;
            });
        }
    }, {passive: false});

    modal.addEventListener('touchend', (e) => {
        isDragging = false;
        const diff = currentY - startY;
        modal.style.transition = 'transform 0.3s cubic-bezier(0.19, 1, 0.22, 1)';
        if (diff > 100) {
            modal.style.transform = 'translateY(100%)';
            setTimeout(() => {
                stopTimer();
                setTimeout(() => {
                    modal.style.transform = '';
                    modal.style.transition = '';
                }, 100);
            }, 300);
        } else {
            modal.style.transform = 'translateY(0)';
        }
        startY = 0; currentY = 0;
    });
}
enableSwipeToClose();