const tg = window.Telegram.WebApp;
tg.expand();

// 1. ПАРСИНГ ПАРАМЕТРОВ (Теперь принимаем reach и bg)
const urlParams = new URLSearchParams(window.location.search);
const currentWeek = parseInt(urlParams.get('week')) || 1;
const currentDay = parseInt(urlParams.get('day')) || 1;
const currentXP = parseInt(urlParams.get('xp')) || 0;

// Новые параметры профиля
const pHeight = parseInt(urlParams.get('h')) || 0;
const pWeight = parseInt(urlParams.get('w')) || 0;
const pJump = parseInt(urlParams.get('j')) || 0;
const pReach = parseInt(urlParams.get('r')) || 0; // Касание стоя
const pBg = decodeURIComponent(urlParams.get('bg') || 'Beginner'); // Опыт
const pGoal = decodeURIComponent(urlParams.get('goal') || 'Стать легендой');
const userName = decodeURIComponent(urlParams.get('name') || 'Атлет');

// Вычисляем количество выполненных тренировок
const totalWorkouts = ((currentWeek - 1) * 3) + (currentDay - 1);

// 2. ПРОВЕРКА: ПОКАЗАТЬ АНКЕТУ ИЛИ ПРИЛОЖЕНИЕ?
// Проверяем, заполнил ли он высоту касания и рост
if (pHeight === 0 || pWeight === 0) {
    document.getElementById('onboarding-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('nav-bar').classList.add('hidden');
} else {
    document.getElementById('main-app').classList.remove('hidden');
}

// 3. ЗАПОЛНЕНИЕ ДАННЫХ В ПРОФИЛЕ
document.getElementById('week-num').innerText = currentWeek;
document.getElementById('day-display').innerText = `ДЕНЬ ${currentDay} / 3`;

document.getElementById('profile-name').innerText = userName;
document.getElementById('display-goal').innerText = pGoal;
document.getElementById('display-height').innerText = pHeight;
document.getElementById('display-jump').innerText = pJump;
document.getElementById('display-reach').innerText = pReach; // Показываем касание
document.getElementById('display-bg').innerText = pBg; // Показываем опыт
document.getElementById('display-xp').innerText = currentXP;

document.getElementById('leader-name').innerText = userName;
document.getElementById('leader-xp').innerText = currentXP + " XP";

// --- МАТЕМАТИКА ДАНКА ---
const rimHeight = 305;
const maxTouch = pReach + pJump; // Касание стоя + Прыжок
const needed = rimHeight - maxTouch;

document.getElementById('calc-touch').innerText = maxTouch;

if (maxTouch >= rimHeight) {
    document.getElementById('calc-need').innerText = "0 (ТЫ ДОСТАЛ!)";
    document.getElementById('calc-need').style.color = "#00ff00";
} else {
    document.getElementById('calc-need').innerText = needed;
}

// 4. ФУНКЦИЯ СОХРАНЕНИЯ АНКЕТЫ
window.saveProfile = function() {
    const h = document.getElementById('in-height').value;
    const w = document.getElementById('in-weight').value;
    const j = document.getElementById('in-jump').value;
    const r = document.getElementById('in-reach').value; // Новое поле
    const bg = document.getElementById('in-bg').value;   // Новое поле
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


// 5. РЕНДЕР ТРЕНИРОВКИ
const workout = programs[currentWeek] || [];
const list = document.getElementById('exercise-list');
const progressBar = document.getElementById('progress');

workout.forEach((ex, index) => {
    const details = exercisesDB[ex.name] || { desc: "...", icon: "🔥" };
    const div = document.createElement('div');
    div.className = 'card';
    div.onclick = () => toggleTask(index);
    div.innerHTML = `
        <div class="card-left">
            <div class="icon-box">${details.icon}</div>
            <div class="info">
                <h3>${ex.name}</h3>
                <p>${ex.sets} x ${ex.reps}</p>
            </div>
        </div>
        <div class="checkbox" id="check-${index}"></div>
    `;
    list.appendChild(div);
});

// 6. ФУНКЦИИ ИНТЕРФЕЙСА
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

        // GIF
        const exName = workout[index].name;
        const gifUrl = exercisesDB[exName].gif;
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

// Таймер
function startTimer(seconds) {
    const modal = document.getElementById('timerModal');
    const display = document.getElementById('timerValue');
    let timeLeft = seconds;
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