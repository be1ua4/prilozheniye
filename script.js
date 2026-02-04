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
document.getElementById('day-display').innerText = `ДЕНЬ ${currentDay} / 3`;
if (aiWorkout) {
    document.getElementById('day-display').innerHTML += ` <span style="color:#0f0; font-size:10px; border:1px solid #0f0; padding:1px 4px; border-radius:4px;">AI</span>`;
}

document.getElementById('streak-display').innerText = currentStreak;
document.getElementById('profile-name').innerText = userName;
document.getElementById('display-goal').innerText = pGoal;
document.getElementById('display-height').innerText = pHeight;
document.getElementById('display-jump').innerText = pJump.toFixed(2);
document.getElementById('display-reach').innerText = pReach;
document.getElementById('display-bg').innerText = pBg;
document.getElementById('display-xp').innerText = currentXP;

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
const workout = aiWorkout || programs[currentWeek] || [];
const list = document.getElementById('exercise-list');
const progressBar = document.getElementById('progress');
list.innerHTML = "";
workout.forEach((ex, index) => {
    const dbData = exercisesDB[ex.name] || { desc: "Упражнение от тренера", icon: "🤖", gif: "" };
    const div = document.createElement('div');
    div.className = 'card';
    div.onclick = () => toggleTask(index);
    div.innerHTML = `
        <div class="card-left">
            <div class="icon-box">${dbData.icon}</div>
            <div class="info">
                <h3>${ex.name}</h3>
                <p>${ex.sets} x ${ex.reps}</p>
            </div>
        </div>
        <div class="checkbox" id="check-${index}"></div>
    `;
    list.appendChild(div);
});

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

function showSuccessScreen() {
    document.getElementById('tab-workout').classList.remove('active');
    document.getElementById('nav-bar').classList.add('hidden');
    document.getElementById('success-screen').classList.remove('hidden');
    tg.HapticFeedback.notificationOccurred('success');
    playSound('sound-win');

    const estGain = (Math.random() * (0.4 - 0.1) + 0.1).toFixed(2);
    document.getElementById('jump-gain-display').innerText = `🚀 +${estGain} см к прыжку`;

    tg.MainButton.text = "💾 СОХРАНИТЬ ПРОГРЕСС";
    tg.MainButton.offClick(showSuccessScreen);
    tg.MainButton.onClick(sendDataAndClose);
}

function sendDataAndClose() {
    const data = JSON.stringify({
        week: currentWeek,
        day: currentDay,
        status: "success"
    });
    tg.sendData(data);
}

function startTimer(seconds) {
    const modal = document.getElementById('timerModal');
    const display = document.getElementById('timerValue');
    let timeLeft = seconds;

    // Сброс позиции перед открытием (на случай если прошлый раз свайпнули)
    modal.style.transform = 'translateY(0)';
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
    }, {passive: false}); // Изменено на false

    modal.addEventListener('touchmove', (e) => {
        // 🔥 ГЛАВНАЯ СТРОКА: Блокируем скролл всего приложения
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
    }, {passive: false}); // 🔥 ОБЯЗАТЕЛЬНО FALSE, иначе preventDefault не сработает

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

// Обновленная функция старта (чтобы сбрасывать стили перед открытием)
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


// Запускаем слушатель свайпов
enableSwipeToClose();