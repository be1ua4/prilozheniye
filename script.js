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

// 6. РЕНДЕР ТРЕНИРОВКИ
// 6. РЕНДЕР ТРЕНИРОВКИ (DUOLINGO STYLE)
const workout = aiWorkout || programs[currentWeek] || [];
const list = document.getElementById('exercise-list');
const progressBar = document.getElementById('progress');

// Очищаем и добавляем контейнер тропы
list.innerHTML = `<div class="duo-container" id="path-container"></div>`;
const pathContainer = document.getElementById('path-container');

workout.forEach((ex, index) => {
    const dbData = exercisesDB[ex.name] || { desc: "Упр", icon: "🤖", gif: "" };

    // Определяем позицию (Центр -> Влево -> Центр -> Вправо)
    // 0: Center, 1: Left, 2: Center, 3: Right
    const posType = index % 4;
    let posClass = 'pos-center';
    if (posType === 1) posClass = 'pos-left';
    if (posType === 3) posClass = 'pos-right';

    // Создаем ряд
    const row = document.createElement('div');
    row.className = `duo-row ${posClass}`;

    // Определяем состояние (Активен / Сделан / Закрыт)
    const isDone = document.getElementById(`check-mem-${index}`)?.classList.contains('done'); // (можно хранить в localStorage, но пока упростим)
    // В текущей логике мы используем классы динамически при клике,
    // но при начальной загрузке все "серые", кроме первого, или если мы не сохраняем состояние внутри сессии.
    // Для простоты: первый - активный, остальные закрыты, пока не нажмешь.

    // Генерируем HTML узла
    // Добавляем ID для чекбокса логики (хоть его и не видно)
    const nodeId = `node-${index}`;

    row.innerHTML = `
        <div class="duo-node" id="${nodeId}" onclick="toggleDuoTask(${index}, this)">
            ${dbData.icon}
            <div class="checkbox hidden" id="check-${index}"></div>
        </div>
    `;

    // Добавляем соединительную линию (Connector) к ПРЕДЫДУЩЕМУ элементу (кроме первого)
    if (index > 0) {
        const line = document.createElement('div');
        line.className = 'path-connector';

        // Логика поворота линии
        const prevPos = (index - 1) % 4;
        const currPos = index % 4;

        if (prevPos === 0 && currPos === 1) line.className += ' path-c-to-l'; // Center -> Left
        if (prevPos === 1 && currPos === 2) line.className += ' path-l-to-c'; // Left -> Center
        if (prevPos === 2 && currPos === 3) line.className += ' path-c-to-r'; // Center -> Right
        if (prevPos === 3 && currPos === 0) line.className += ' path-r-to-c'; // Right -> Center

        // Корректируем позицию линии (она абсолютная внутри duo-container, это сложно,
        // проще вставить её внутрь предыдущего ряда или высчитать.
        // УПРОЩЕНИЕ: Линия просто висит в текущем row и торчит ВВЕРХ)

        // В данном CSS решении (простом) линия прибита к центру экрана.
        // Для точного соединения нужно чуть больше математики, но визуально
        // "dashed border" по центру часто достаточно.
        // Оставим пока без сложной геометрии линий, просто пунктир по центру, если узлы по центру.
        // Сделаем упрощенную линию внутри row, которая ведет "вверх".

        // Переопределим логику линий для простоты:
        // Линия будет просто dashed вертикальная палка, наклоненная CSS transform

       line.style.top = "-50px"; // Тянемся к предыдущему ряду
       if (posClass === 'pos-center') line.style.left = "50%";
       if (posClass === 'pos-left') line.style.left = "30%"; // Подгон под 20% padding
       if (posClass === 'pos-right') line.style.left = "70%";

       // Вставляем линию в текущий ряд (чтобы она шла вверх)
       // row.appendChild(line); <--- (Это требует тонкой настройки CSS, пока отключим сложные линии, оставим простую вертикаль)
    }

    pathContainer.appendChild(row);
});

// Активируем первый элемент (START)
const firstNode = document.getElementById('node-0');
if (firstNode) {
    firstNode.classList.add('active');
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.innerText = 'СТАРТ';
    firstNode.appendChild(bubble);
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

// Перехватываем конец таймера, чтобы отметить "Выполнено"
const originalStopTimer = window.stopTimer;
window.stopTimer = function() {
    originalStopTimer(); // Закрываем окно

    // Отмечаем выполненным
    if (typeof window.currentTaskIndex !== 'undefined') {
        const idx = window.currentTaskIndex;
        const node = document.getElementById(`node-${idx}`);
        const checkbox = document.getElementById(`check-${idx}`);

        if (node && !node.classList.contains('done')) {
            // 1. Ставим статус DONE
            node.classList.remove('active');
            node.classList.add('done');

            // 2. Удаляем "пузырь" (Старт)
            const bubble = node.querySelector('.speech-bubble');
            if (bubble) bubble.remove();

            // 3. Отмечаем скрытый чекбокс (для прогресс-бара)
            checkbox.classList.add('checked');

            // 4. Открываем СЛЕДУЮЩИЙ уровень
            const nextIdx = idx + 1;
            const nextNode = document.getElementById(`node-${nextIdx}`);
            if (nextNode) {
                nextNode.classList.add('active');
                // Скроллим к нему плавно
                nextNode.scrollIntoView({behavior: "smooth", block: "center"});
            }

            playSound('sound-win'); // Звук успеха уровня
            updateProgress(); // Обновляем общий бар
        }
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

window.stopTimer = function() {
    clearInterval(timerInterval);
    document.getElementById('timerModal').classList.remove('active');
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