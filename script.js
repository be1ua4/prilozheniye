const tg = window.Telegram.WebApp;
tg.expand();

// 1. Парсинг параметров
const urlParams = new URLSearchParams(window.location.search);
const currentWeek = parseInt(urlParams.get('week')) || 1;
const currentDay = parseInt(urlParams.get('day')) || 1;

// 2. Инициализация
document.getElementById('week-num').innerText = currentWeek;
document.getElementById('day-display').innerText = `ДЕНЬ ${currentDay} / 3`;

const workout = programs[currentWeek] || [];
const list = document.getElementById('exercise-list');
const progressBar = document.getElementById('progress');

// 3. Рендер карточек
workout.forEach((ex, index) => {
    // Берем детали упражнения из базы
    const details = exercisesDB[ex.name] || { desc: "Выполняй технично", icon: "💪" };

    const div = document.createElement('div');
    div.className = 'card';
    // Клик по карточке открывает таймер (эмуляция выполнения) или просто ставит галочку
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

// 4. Логика выполнения
let timerInterval;

function toggleTask(index) {
    const checkbox = document.getElementById(`check-${index}`);
    const isChecked = checkbox.classList.contains('checked');

    if (!isChecked) {
        // Если отмечаем как сделанное
        checkbox.classList.add('checked');
        tg.HapticFeedback.impactOccurred('medium'); // Вибрация
        startTimer(60); // Запускаем таймер на 60 сек
    } else {
        // Если снимаем отметку
        checkbox.classList.remove('checked');
    }

    updateProgress();
}

function updateProgress() {
    const total = workout.length;
    const done = document.querySelectorAll('.checkbox.checked').length;
    const percent = (done / total) * 100;

    progressBar.style.width = `${percent}%`;

    if (done === total) {
        tg.MainButton.text = "✅ ЗАВЕРШИТЬ ДЕНЬ";
        tg.MainButton.color = "#00f2ff"; // Цвет кнопки под дизайн
        tg.MainButton.textColor = "#000000";
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

// 5. Таймер
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

        if (timeLeft <= 0) {
            stopTimer();
            tg.HapticFeedback.notificationOccurred('success');
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    document.getElementById('timerModal').classList.remove('active');
}

// 6. Отправка
tg.MainButton.onClick(() => {
    const data = JSON.stringify({
        week: currentWeek,
        day: currentDay,
        status: "success"
    });
    tg.sendData(data);
});