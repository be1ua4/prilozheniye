const tg = window.Telegram.WebApp;
tg.expand();

// 1. ПАРСИНГ ПАРАМЕТРОВ
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

// 2. ПРОВЕРКА ДАННЫХ
if (pHeight === 0 || pWeight === 0) {
    document.getElementById('onboarding-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('nav-bar').classList.add('hidden');
} else {
    document.getElementById('main-app').classList.remove('hidden');
}

// 3. ЗАПОЛНЕНИЕ ДАННЫХ
document.getElementById('week-num').innerText = currentWeek;

// 🔥 ДОБАВЛЕНО: Заполнение вкладки профиля
document.getElementById('profile-name').innerText = userName;
document.getElementById('display-goal').innerText = pGoal;
document.getElementById('display-height').innerText = pHeight;
document.getElementById('display-jump').innerText = pJump.toFixed(1);
document.getElementById('display-reach').innerText = pReach;
document.getElementById('display-bg').innerText = pBg;
document.getElementById('display-xp').innerText = currentXP;

// Логика отображения "ДЕНЬ Х" и Бейджа
const dayDisplay = document.getElementById('day-display');
dayDisplay.innerHTML = `ДЕНЬ ${currentDay} / 3`;

// ЕСЛИ ЕСТЬ AI WORKOUT - ДОБАВЛЯЕМ БЕЙДЖ
if (aiWorkout) {
    const badge = document.createElement('span');
    badge.className = 'ai-badge';
    badge.innerHTML = 'AI 🧠'; // Значок мозга или робота
    dayDisplay.appendChild(badge);
}

// --- ЗАПОЛНЕНИЕ ТАБЛИЦЫ ЛИДЕРОВ ---
const leaderContainer = document.getElementById('tab-leaderboard');
const refreshBtn = document.querySelector('.refresh-btn');

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

if (refreshBtn) {
    leaderContainer.appendChild(refreshBtn);
} else {
    const btn = document.createElement('button');
    btn.className = 'refresh-btn';
    btn.innerText = '🔄 Обновить таблицу';
    btn.onclick = window.refreshData;
    leaderContainer.appendChild(btn);
}

// --- МАТЕМАТИКА ДАНКА & JUMP TAB ---
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

// 4. ФУНКЦИЯ ОБНОВЛЕНИЯ ДАННЫХ
window.refreshData = function() {
    tg.showPopup({
        title: 'Обновление данных',
        message: 'Приложение перезагрузится. Продолжить?',
        buttons: [{id: 'ok', type: 'default', text: 'Да'}, {id: 'cancel', type: 'cancel', text: 'Отмена'}]
    }, function(buttonId) {
        if (buttonId === 'ok') {
            tg.HapticFeedback.impactOccurred('medium');
            const data = JSON.stringify({ action: "refresh" });
            tg.sendData(data);
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
            const data = JSON.stringify({ action: "generate_ai" });
            tg.sendData(data);
        }
    });
}

// 5. СОХРАНЕНИЕ ПРОФИЛЯ
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
    const data = JSON.stringify({
        action: "save_profile",
        h: h, w: w, j: j || 0, r: r, bg: bg, goal: goal
    });
    tg.sendData(data);
}

function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Sound error:", e));
    }
}


// 6. РЕНДЕР ТРЕНИРОВКИ (DUOLINGO STYLE)
// =======================================================
// 6. РЕНДЕР КАРТЫ (ВЕСЬ ПУТЬ: НЕДЕЛИ 1-15)
// =======================================================

const pathContainer = document.getElementById('exercise-list'); // Используем тот же контейнер
pathContainer.innerHTML = `<div class="duo-container" id="map-container"></div>`;
const mapContainer = document.getElementById('map-container');

// Всего 15 недель в программе Air Alert
const TOTAL_WEEKS = 15;

for (let w = 1; w <= TOTAL_WEEKS; w++) {
    // Определяем позицию змейки
    const posType = w % 4;
    let posClass = 'pos-center';
    if (posType === 1) posClass = 'pos-left';
    if (posType === 3) posClass = 'pos-right';

    // Создаем ряд
    const row = document.createElement('div');
    row.className = `duo-row ${posClass}`;

    // Определяем статус недели
    let statusClass = 'locked'; // По умолчанию закрыто
    let icon = w;

    if (w < currentWeek) {
        statusClass = 'done'; // Пройденная неделя
    } else if (w === currentWeek) {
        statusClass = 'active'; // Текущая неделя
    }

    // Рендер Узла (Недели)
    const nodeId = `week-node-${w}`;
    row.innerHTML = `
        <div class="duo-node ${statusClass}" id="${nodeId}" onclick="openWeekLevel(${w}, this)">
            <span style="font-weight:800; font-size:20px;">${icon}</span>
        </div>
    `;

    // Линии (Connector)
    if (w > 1) {
        const line = document.createElement('div');
        line.className = 'path-connector';
        line.style.top = "-50px";

        // Простая логика линий
        if (posClass === 'pos-center') line.style.left = "50%";
        if (posClass === 'pos-left') line.style.left = "30%";
        if (posClass === 'pos-right') line.style.left = "70%";

        mapContainer.appendChild(line); // Добавляем линию перед рядом
    }

    mapContainer.appendChild(row);

    // Добавляем "Пузырь" над текущей неделей
    if (statusClass === 'active') {
        const node = row.querySelector('.duo-node');
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.innerText = 'ТУТ ТЫ';
        node.appendChild(bubble);
    }
}

// --- ФУНКЦИИ ОТКРЫТИЯ УРОВНЯ (НЕДЕЛИ) ---

window.openWeekLevel = function(weekNum, element) {
    // 1. Проверка доступа
    if (element.classList.contains('locked')) {
        tg.HapticFeedback.notificationOccurred('error');
        element.style.animation = 'shake 0.5s';
        setTimeout(() => element.style.animation = '', 500);
        return;
    }

    // 2. Открываем модалку с тренировкой
    tg.HapticFeedback.impactOccurred('light');
    document.getElementById('workout-modal-screen').classList.remove('hidden');
    document.getElementById('modal-title').innerText = `НЕДЕЛЯ ${weekNum}`;
    document.getElementById('modal-day-display').innerText = currentDay;

    // Если открыли прошлую неделю - показываем её программу, но без возможности сохранять прогресс
    // Если текущую - показываем актуальную (или AI)

    let targetWorkout = [];
    if (weekNum === currentWeek && aiWorkout) {
        targetWorkout = aiWorkout; // Если сегодня AI тренировка
    } else {
        targetWorkout = programs[weekNum] || [];
    }

    renderDailyExercises(targetWorkout);
}

window.closeWorkoutModal = function() {
    document.getElementById('workout-modal-screen').classList.add('hidden');
}

// Рендер списка упражнений ВНУТРИ модалки
function renderDailyExercises(workoutData) {
    const list = document.getElementById('modal-exercise-list');
    const progressBar = document.getElementById('modal-progress');
    const finishArea = document.getElementById('modal-finish-btn-area');

    list.innerHTML = "";
    finishArea.innerHTML = ""; // Очищаем кнопку
    progressBar.style.width = "0%";

    // Глобально сохраняем текущий активный воркаут
    window.activeWorkoutData = workoutData;

    workoutData.forEach((ex, index) => {
        const dbData = exercisesDB[ex.name] || { desc: "Упр", icon: "🏋️", gif: "" };
        const div = document.createElement('div');
        div.className = 'card';
        div.onclick = () => toggleTaskInModal(index); // Новая функция клика
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

// --- ЛОГИКА ВНУТРИ ТРЕНИРОВКИ ---

window.toggleTaskInModal = function(index) {
    const checkbox = document.getElementById(`modal-check-${index}`);

    if (!checkbox.classList.contains('checked')) {
        checkbox.classList.add('checked');
        tg.HapticFeedback.impactOccurred('medium');
        playSound('sound-click');

        // Запуск таймера
        const exName = window.activeWorkoutData[index].name;
        const dbData = exercisesDB[exName];

        // Показываем картинку в таймере
        const img = document.getElementById('exercise-gif');
        img.src = dbData ? dbData.gif : "";
        img.style.display = dbData.gif ? 'block' : 'none';

        startTimer(60); // Запускаем общий таймер
    } else {
        checkbox.classList.remove('checked');
    }
    updateModalProgress();
}

function updateModalProgress() {
    const total = window.activeWorkoutData.length;
    const done = document.querySelectorAll('#modal-exercise-list .checkbox.checked').length;
    const progressBar = document.getElementById('modal-progress');

    progressBar.style.width = `${(done / total) * 100}%`;

    // Если всё сделано - показываем кнопку "Завершить" внутри модалки
    const finishArea = document.getElementById('modal-finish-btn-area');
    if (done === total) {
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
    showSuccessScreen(); // Вызываем экран успеха
}

// --- Вспомогательная функция остановки таймера (без изменений) ---
window.stopTimer = function() {
    clearInterval(timerInterval);
    document.getElementById('timerModal').classList.remove('active');
}
// 7. НОВАЯ ЛОГИКА КЛИКА (DUO STYLE)
window.toggleDuoTask = function(index, element) {
    const checkbox = document.getElementById(`check-${index}`);
    const isDone = element.classList.contains('done');

    // Если упражнение уже сделано - просто проигрываем звук
    if (isDone) {
        tg.HapticFeedback.impactOccurred('light');
        return;
    }

    // Если упражнение НЕ активно (заблокировано) - трясем его (ошибка)
    if (!element.classList.contains('active') && !isDone) {
        tg.HapticFeedback.notificationOccurred('error');
        element.style.animation = 'shake 0.5s';
        setTimeout(() => element.style.animation = '', 500);
        return;
    }

    // ЛОГИКА ЗАПУСКА
    tg.HapticFeedback.impactOccurred('medium');
    playSound('sound-click');

    const exName = workout[index].name;
    const dbData = exercisesDB[exName];

    // Показываем таймер / задание
    const img = document.getElementById('exercise-gif');
    img.src = dbData.gif || "";
    img.style.display = dbData.gif ? 'block' : 'none';

    // Передаем контекст в таймер, чтобы по завершению отметить именно этот узел
    window.currentTaskIndex = index;
    startTimer(60);
}

window.stopTimer = function() {
    // 1. Остановка таймера и закрытие окна
    clearInterval(timerInterval);
    document.getElementById('timerModal').classList.remove('active');

    // 2. Логика Duolingo: Отмечаем уровень пройденным
    if (typeof window.currentTaskIndex !== 'undefined') {
        const idx = window.currentTaskIndex;
        const node = document.getElementById(`node-${idx}`);
        const checkbox = document.getElementById(`check-${idx}`);

        // Если узел есть и он еще не "done"
        if (node && !node.classList.contains('done')) {
            // А. Красим текущий в золотой
            node.classList.remove('active');
            node.classList.add('done');

            // Б. Убираем пузырь "СТАРТ"
            const bubble = node.querySelector('.speech-bubble');
            if (bubble) bubble.remove();

            // В. Отмечаем скрытый чекбокс (чтобы ползла полоска прогресса сверху)
            if (checkbox) checkbox.classList.add('checked');

            // Г. Открываем СЛЕДУЮЩИЙ уровень
            const nextIdx = idx + 1;
            const nextNode = document.getElementById(`node-${nextIdx}`);

            if (nextNode) {
                nextNode.classList.add('active'); // Делаем синим и пульсирующим

                // Добавляем пузырь "GO" к следующему
                const nextBubble = document.createElement('div');
                nextBubble.className = 'speech-bubble';
                nextBubble.innerText = 'GO!';
                nextNode.appendChild(nextBubble);

                // Плавный скролл к следующему заданию
                setTimeout(() => {
                    nextNode.scrollIntoView({behavior: "smooth", block: "center"});
                }, 300);
            }

            // Д. Звук и обновление общего прогресса
            playSound('sound-win');
            updateProgress();
        }

        // Сбрасываем индекс, чтобы случайно не завершить повторно
        window.currentTaskIndex = undefined;
    }
}

// 7. ФУНКЦИИ ИНТЕРФЕЙСА
window.switchTab = function(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
    tg.HapticFeedback.impactOccurred('light');
}

let timerInterval;
function toggleTask(index) {
    const checkbox = document.getElementById(`check-${index}`);
    if (!checkbox.classList.contains('checked')) {
        checkbox.classList.add('checked');
        tg.HapticFeedback.impactOccurred('medium');
        playSound('sound-click');

        const exName = workout[index].name;
        const dbData = exercisesDB[exName];
        const gifUrl = dbData ? dbData.gif : "";
        const img = document.getElementById('exercise-gif');
        if (gifUrl) {
            img.src = gifUrl;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }
        startTimer(60);
    } else {
        checkbox.classList.remove('checked');
    }
    updateProgress();
}

function updateProgress() {
    const total = workout.length;
    const done = document.querySelectorAll('.checkbox.checked').length;
    progressBar.style.width = `${(done / total) * 100}%`;
    if (done === total) {
        tg.MainButton.text = "🏁 ЗАВЕРШИТЬ";
        tg.MainButton.color = "#00f2ff";
        tg.MainButton.textColor = "#000000";
        tg.MainButton.show();
        tg.MainButton.offClick(sendDataAndClose);
        tg.MainButton.offClick(showSuccessScreen);
        tg.MainButton.onClick(showSuccessScreen);
    } else {
        tg.MainButton.hide();
    }
}

// Глобальная переменная для хранения результата этой тренировки
let sessionGain = 0;

function showSuccessScreen() {
    document.getElementById('tab-workout').classList.remove('active');
    document.getElementById('nav-bar').classList.add('hidden');
    document.getElementById('success-screen').classList.remove('hidden');
    tg.HapticFeedback.notificationOccurred('success');
    playSound('sound-win');

    // --- 🧬 РАСЧЕТ ПРОГРЕССА ПРЯМО В ПРИЛОЖЕНИИ ---

    // 1. База от уровня (pBg берется из URL)
    let baseGain = 0.35;
    if (pBg === 'Intermediate') baseGain = 0.15;
    else if (pBg === 'Advanced') baseGain = 0.04;

    // 2. Бонус за стрик (+5% за каждый день, макс 50%)
    const streakBonus = 1.0 + Math.min(currentStreak * 0.05, 0.5);

    // 3. Убывающая отдача (чем выше прыжок pJump, тем сложнее)
    // 120 см - условный генетический предел
    const dimFactor = Math.max(0.1, (120 - pJump) / 80);

    // 4. Рандом фактор (от 0.9 до 1.1)
    const rnd = 0.9 + Math.random() * 0.2;

    // СЧИТАЕМ
    let rawGain = baseGain * streakBonus * dimFactor * rnd;

    // Округляем до 2 знаков и сохраняем в переменную
    sessionGain = parseFloat(rawGain.toFixed(2));

    // Показываем игроку
    document.getElementById('jump-gain-display').innerText = `🚀 +${sessionGain} см к прыжку`;

    tg.MainButton.text = "💾 СОХРАНИТЬ ПРОГРЕСС";
    tg.MainButton.offClick(showSuccessScreen);
    tg.MainButton.onClick(sendDataAndClose);
}

function sendDataAndClose() {
    // Отправляем посчитанный gain боту
    const data = JSON.stringify({
        week: currentWeek,
        day: currentDay,
        status: "success",
        gain: sessionGain // <--- ОТПРАВЛЯЕМ НАШ РАСЧЕТ
    });
    tg.sendData(data);
}

// Удалена лишняя дублирующая функция sendDataAndClose

function startTimer(seconds) {
    const modal = document.getElementById('timerModal');
    const display = document.getElementById('timerValue');
    let timeLeft = seconds;

    // СБРОС ПОЗИЦИИ ПЕРЕД ОТКРЫТИЕМ
    // Важно вернуть транзицию для выезда снизу-вверх
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


// --- НОВАЯ ФУНКЦИЯ: СВАЙП ДЛЯ ЗАКРЫТИЯ (SWIPE TO CLOSE) ---
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
        if (isDragging) {
             e.preventDefault();
        }

        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        // Если тянем вниз (diff > 0), двигаем окно
        if (diff > 0) {
            requestAnimationFrame(() => {
                modal.style.transform = `translateY(${diff}px)`;
            });
        }
    }, {passive: false});

    modal.addEventListener('touchend', (e) => {
        isDragging = false;
        const diff = currentY - startY;

        // Возвращаем анимацию
        modal.style.transition = 'transform 0.3s cubic-bezier(0.19, 1, 0.22, 1)';

        // Если протащили вниз больше чем на 100px - закрываем
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
            // Если мало - возвращаем назад
            modal.style.transform = 'translateY(0)';
        }

        startY = 0;
        currentY = 0;
    });
}

// Запускаем слушатель свайпов
enableSwipeToClose();