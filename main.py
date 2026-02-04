import asyncio
import json
import logging
import aiosqlite
import urllib.parse
import base64
from datetime import datetime
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo

# --- НАСТРОЙКИ ---
TOKEN = "7590291969:AAGbIrhcgWLkcj0k3sRK_XiBsZPpmHrQin4"
WEBAPP_URL = "https://be1ua4.github.io/prilozheniye/"
DB_NAME = "spirit.db"

# ВСТАВЬ СЮДА СВОЙ КЛЮЧ ОТ GIGACHAT (Авторизационные данные)
GIGACHAT_KEY = "MDE5YzBhOTQtZDYwMi03ODQzLTk5OTAtYTNmNGQ0MWEzODc1OjAyMjVkZDM5LTEzN2QtNDQzMS04NDE0LWM2MmQyNjA0MzEwNw=="

dp = Dispatcher()

# Пытаемся импортировать GigaChat. Если библиотеки нет - бот не упадет, а предупредит.
try:
    from gigachat import GigaChat

    HAS_GIGACHAT = True
except ImportError:
    HAS_GIGACHAT = False
    print("⚠️ Библиотека 'gigachat' не найдена. Установите её: pip install gigachat")


# --- ГЕНЕРАЦИЯ ТРЕНИРОВКИ (GigaChat) ---
async def generate_ai_workout(height, weight, bg, goal):
    # Если библиотека не установлена или нет ключа — возвращаем стандартную тренировку
    if not HAS_GIGACHAT or "ЗДЕСЬ_ТВОЙ_КЛЮЧ" in GIGACHAT_KEY:
        logging.warning("GigaChat не настроен. Использую стандартную программу.")
        return json.dumps([{"name": "Выпрыгивания", "sets": 3, "reps": 20}])

    try:
        # Подключаемся к GigaChat
        chat = GigaChat(credentials=GIGACHAT_KEY, verify_ssl_certs=False)

        prompt = (
            f"Ты профессиональный тренер по прыжкам. Составь ОДНУ персональную тренировку (на 1 день) "
            f"для атлета с параметрами: Рост {height} см, Вес {weight} кг, Уровень {bg}, Цель: {goal}. "
            f"Ответь СТРОГО в формате JSON без лишних слов и markdown. "
            f"Формат: [{{'name': 'Название упражнения', 'sets': число_подходов, 'reps': число_повторений}}]. "
            f"Используй ТОЛЬКО эти названия упражнений (можно комбинировать): "
            f"Выпрыгивания, Зашагивания, Прыжки на икрах, Бёрнауты, Прыжки из приседа."
        )

        response = chat.chat(prompt)
        content = response.choices[0].message.content

        # Очистка ответа (иногда нейросеть пишет "Вот ваш json: [...]")
        start = content.find('[')
        end = content.rfind(']') + 1
        if start != -1 and end != -1:
            clean_json = content[start:end]
            return clean_json
        else:
            raise ValueError("Не удалось найти JSON в ответе")

    except Exception as e:
        logging.error(f"AI Error: {e}")
        # Fallback: Если ИИ ошибся, даем безопасную базу
        return json.dumps([
            {"name": "Выпрыгивания", "sets": 3, "reps": 15},
            {"name": "Бёрнауты", "sets": 1, "reps": 100}
        ])


# --- БАЗА ДАННЫХ ---
async def init_db():
    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                week INTEGER DEFAULT 1,
                day INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                height INTEGER DEFAULT 0,
                weight INTEGER DEFAULT 0,
                jump INTEGER DEFAULT 0,
                reach INTEGER DEFAULT 0,
                sport_bg TEXT DEFAULT 'Beginner',
                goal TEXT DEFAULT 'Стать выше',
                streak INTEGER DEFAULT 0,
                last_active TEXT DEFAULT ''
            )
        ''')
        await db.commit()


async def get_top_users():
    async with aiosqlite.connect(DB_NAME) as db:
        async with db.execute("SELECT username, xp FROM users ORDER BY xp DESC LIMIT 10") as cursor:
            rows = await cursor.fetchall()
            top_list = []
            for row in rows:
                name = row[0] if row[0] else "Атлет"
                xp = row[1]
                top_list.append(f"{name}:{xp}")
            return "|".join(top_list)


# --- ГЕНЕРАЦИЯ ССЫЛКИ ---
async def create_app_link(user_id):
    async with aiosqlite.connect(DB_NAME) as db:
        async with db.execute(
                "SELECT week, day, xp, height, weight, jump, reach, sport_bg, goal, streak, username FROM users WHERE user_id = ?",
                (user_id,)) as cursor:
            row = await cursor.fetchone()
            if not row: return None
            week, day, xp, height, weight, jump, reach, sport_bg, goal, streak, username = row

    # 1. Генерируем AI программу
    # Если данных нет (0), ставим дефолтные для генерации
    h_val = height if height > 0 else 180
    w_val = weight if weight > 0 else 75
    ai_plan_json = await generate_ai_workout(h_val, w_val, sport_bg, goal)

    # 2. Кодируем в Base64
    safe_plan = base64.b64encode(ai_plan_json.encode('utf-8')).decode('utf-8')

    # 3. Остальные параметры
    safe_name = urllib.parse.quote(username or "Атлет")
    safe_goal = urllib.parse.quote(goal)
    safe_bg = urllib.parse.quote(sport_bg)
    top_leaders = await get_top_users()
    safe_leaders = urllib.parse.quote(top_leaders)

    return f"{WEBAPP_URL}?week={week}&day={day}&xp={xp}&name={safe_name}&h={height}&w={weight}&j={jump}&r={reach}&bg={safe_bg}&goal={safe_goal}&streak={streak}&top={safe_leaders}&plan={safe_plan}"


@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    raw_username = message.from_user.username or message.from_user.first_name or "Атлет"
    clean_username = raw_username.replace(":", "").replace("|", "")

    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute("INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)", (user_id, clean_username))
        await db.execute("UPDATE users SET username=? WHERE user_id=?", (clean_username, user_id))
        await db.commit()

        async with db.execute("SELECT streak FROM users WHERE user_id = ?", (user_id,)) as cursor:
            row = await cursor.fetchone()
            streak = row[0] if row else 0

    app_link = await create_app_link(user_id)

    kb = ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="🔥 Открыть Spirit App", web_app=WebAppInfo(url=app_link))]
    ], resize_keyboard=True)

    await message.answer(
        f"🌪 **Spirit of Power**\n"
        f"Атлет: {clean_username}\n"
        f"Серия: {streak} 🔥\n"
        f"Тренер: GigaChat 🧠\n"
        "Заходи в приложение 👇",
        reply_markup=kb,
        parse_mode="Markdown"
    )


@dp.message(F.content_type == types.ContentType.WEB_APP_DATA)
async def process_data(message: types.Message):
    data = json.loads(message.web_app_data.data)
    user_id = message.from_user.id

    raw_username = message.from_user.username or message.from_user.first_name or "Атлет"
    clean_username = raw_username.replace(":", "").replace("|", "")

    async with aiosqlite.connect(DB_NAME) as db:
        if data.get("action") == "refresh":
            await db.execute("UPDATE users SET username=? WHERE user_id=?", (clean_username, user_id))
            await db.commit()

            new_link = await create_app_link(user_id)
            kb = ReplyKeyboardMarkup(
                keyboard=[[KeyboardButton(text="🔥 Тренироваться", web_app=WebAppInfo(url=new_link))]],
                resize_keyboard=True)
            await message.answer("🔄 Данные обновлены! Программа пересчитана 🤖", reply_markup=kb)

        elif data.get("action") == "save_profile":
            await db.execute(
                "UPDATE users SET height=?, weight=?, jump=?, reach=?, sport_bg=?, goal=?, username=? WHERE user_id=?",
                (data['h'], data['w'], data['j'], data['r'], data['bg'], data['goal'], clean_username, user_id))
            await db.commit()

            new_link = await create_app_link(user_id)
            kb = ReplyKeyboardMarkup(
                keyboard=[[KeyboardButton(text="🔥 Тренироваться", web_app=WebAppInfo(url=new_link))]],
                resize_keyboard=True)
            await message.answer(f"✅ Профиль сохранен!\nGigaChat составил план под твои параметры 💪", reply_markup=kb)

        elif data.get("status") == "success":
            async with db.execute("SELECT week, day, xp, streak, last_active FROM users WHERE user_id = ?",
                                  (user_id,)) as cursor:
                week, day, xp, streak, last_active = await cursor.fetchone()

            today_str = datetime.now().strftime("%Y-%m-%d")
            new_streak = streak
            if last_active:
                last_date = datetime.strptime(last_active, "%Y-%m-%d")
                delta = (datetime.now() - last_date).days
                if delta == 1:
                    new_streak += 1
                elif delta > 1:
                    new_streak = 1
            else:
                new_streak = 1

            new_day = day + 1
            new_week = week
            bonus_xp = 50
            msg = f"✅ День {day} выполнен! +{bonus_xp} XP\n🔥 Серия: {new_streak} дн."

            if new_day > 3:
                new_day = 1
                new_week += 1
                bonus_xp = 150
                msg = f"🏆 **НЕДЕЛЯ {week} ЗАКРЫТА!**\nПереход на уровень {new_week}.\nБонус +{bonus_xp} XP\n🔥 Серия: {new_streak} дн."

            await db.execute(
                "UPDATE users SET week=?, day=?, xp=xp+?, streak=?, last_active=?, username=? WHERE user_id=?",
                (new_week, new_day, bonus_xp, new_streak, today_str, clean_username, user_id))
            await db.commit()

            new_link = await create_app_link(user_id)
            kb = ReplyKeyboardMarkup(
                keyboard=[[KeyboardButton(text="🔥 Следующая тренировка", web_app=WebAppInfo(url=new_link))]],
                resize_keyboard=True)
            await message.answer(msg, reply_markup=kb, parse_mode="Markdown")


async def main():
    await init_db()
    bot = Bot(token=TOKEN)
    logging.basicConfig(level=logging.INFO)
    print("Бот запущен...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())