const tg = window.Telegram.WebApp;
tg.expand();

// 1. ПАРСИНГ ДАННЫХ ИЗ ССЫЛКИ
const urlParams = new URLSearchParams(window.location.search);
const currentWeek = parseInt(urlParams.get('week')) || 1;
const currentDay = parseInt(urlParams.get('day')) || 1;
const currentXP = parseInt(urlParams.get('xp')) || 0;
// Декодируем русское имя, если оно есть
const rawName = urlParams.get('name');
const userName = rawName ? decodeURIComponent(rawName) : 'Атлет';

// 2. ЗАПОЛНЕНИЕ ИНТЕРФЕЙСА
// Вкладка Work
document.getElementById('week-num').innerText = currentWeek;
document.getElementById('day-display').innerText = `ДЕНЬ ${currentDay} / 3`;

// Вкладка Profile
document.getElementById('profile-name').innerText = userName;
document.getElementById('profile-xp').innerText = currentXP;
document.getElementById('profile-week').innerText = currentWeek;

// Вкладка Leaderboard
document.getElementById('leader-name').innerText = userName + " (Вы)";
document.getElementById('leader-xp').innerText = currentXP + " XP";

// 3. РЕНДЕР УПРАЖНЕНИЙ
const workout = programs[currentWeek] || [];
const list = document.getElementById('exercise-list');
const progressBar = document.getElementById('progress');

workout.forEach((ex, index) => {
    const details = exercisesDB[ex.name] || { desc: "Делай технично", icon: "🔥" };

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

// 4. ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК (Обязательна!)
window.switchTab = function(tabId, element) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    // Убираем подсветку у всех кнопок
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    // Показываем выбранную
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');

    tg.HapticFeedback.impactOccurred('light'); // Вибрация
}

// 5. ЛОГИКА ВЫПОЛНЕНИЯ (ГАЛОЧКИ И ТАЙМЕР)
let timerInterval;

function toggleTask(index) {
    const checkbox = document.getElementById(`check-${index}`);

    if (!checkbox.classList.contains('checked')) {
        checkbox.classList.add('checked');
        tg.HapticFeedback.impactOccurred('medium');
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
        tg.MainButton.text = "✅ ЗАВЕРШИТЬ ДЕНЬ";
        tg.MainButton.color = "#00f2ff";
        tg.MainButton.textColor = "#000000";
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

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

tg.MainButton.onClick(() => {
    const data = JSON.stringify({
        week: currentWeek,
        day: currentDay,
        status: "success"
    });
    tg.sendData(data);
});