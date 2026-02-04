import asyncio
import json
import logging
import aiosqlite  # Используем SQLite
import urllib.parse
import base64
import random
import os
from datetime import datetime
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo

# --- НАСТРОЙКИ ---
TOKEN = "7590291969:AAGbIrhcgWLkcj0k3sRK_XiBsZPpmHrQin4"
WEBAPP_URL = "https://be1ua4.github.io/prilozheniye/"

# --- УМНАЯ НАСТРОЙКА БАЗЫ ДАННЫХ ---
# Если мы на сервере (Railway) и там подключен Volume /app/data
if os.path.exists("/app/data"):
    DB_NAME = "/app/data/spirit.db"
    print("📂 LOG: Работаю с базой на сервере (Volume)")
else:
    DB_NAME = "spirit.db"
    print("💻 LOG: Работаю с локальной базой")

GIGACHAT_KEY = "MDE5YzBhOTQtZDYwMi03ODQzLTk5OTAtYTNmNGQ0MWEzODc1OjAyMjVkZDM5LTEzN2QtNDQzMS04NDE0LWM2MmQyNjA0MzEwNw=="
ADMIN_IDS = [941369221]  # Замените на свой ID

dp = Dispatcher()

# Проверка GigaChat
try:
    from gigachat import GigaChat

    HAS_GIGACHAT = True
except ImportError:
    HAS_GIGACHAT = False
    print("⚠️ Библиотека 'gigachat' не найдена.")


# --- ГЕНЕРАЦИЯ ТРЕНИРОВКИ (AI) ---
async def generate_ai_workout(height, weight, bg, goal, week, day):
    print(f"DEBUG: Генерация AI. Неделя {week}, День {day}. Цель: {goal}")

    if not HAS_GIGACHAT:
        return json.dumps([{"name": "Выпрыгивания", "sets": 3, "reps": 15}])

    try:
        chat = GigaChat(credentials=GIGACHAT_KEY, verify_ssl_certs=False)

        # 1. ПРОГРЕССИЯ
        base_reps = 80
        progression_rate = 20
        if bg == "Intermediate":
            base_reps, progression_rate = 200, 30
        elif bg == "Advanced":
            base_reps, progression_rate = 400, 50

        target_volume = base_reps + ((week - 1) * progression_rate)

        # 2. ФОКУС ДНЯ
        day_focus = ""
        cycle = day % 3
        if cycle == 1:
            day_focus = "ФОКУС: Взрывная сила (Плиометрика). Прыжки в высоту."
        elif cycle == 2:
            day_focus = "ФОКУС: Сила ног (Strength). Приседания, выпады."
        else:
            day_focus = "ФОКУС: Скорость (Speed). Пого, частота."

        full_list = "['Выпрыгивания', 'Зашагивания', 'Прыжки на икрах', 'Бёрнауты', 'Прыжки из приседа', 'Запрыгивания на тумбу', 'Глубинные прыжки', 'Пого прыжки', 'Прыжок в длину', 'Болгарские выпады', 'Прыжки в выпаде', 'Пистолетик', 'Спринты', 'Становая тяга', 'Ягодичный мост', 'Махи гирей', 'Выпрыгивание с колен']"

        prompt = (
            f"Роль: Тренер. Атлет: {height}см, {weight}кг, Опыт: {bg}.\n"
            f"ЭТАП: Неделя {week}, День {day}. Цель: {goal}.\n"
            f"ОБЪЕМ: ~{target_volume} повторений всего.\n"
            f"{day_focus}\n"
            f"Составь план (4-6 упр) ТОЛЬКО из списка: {full_list}.\n"
            f"Ответь JSON массивом: [{{'name': 'Имя', 'sets': N, 'reps': N}}]"
        )

        response = chat.chat(prompt)
        content = response.choices[0].message.content

        start, end = content.find('['), content.rfind(']') + 1
        if start != -1 and end != -1:
            clean_json = content[start:end].replace("'", '"')
            return json.dumps(json.loads(clean_json), ensure_ascii=False)
        else:
            raise ValueError("No JSON")

    except Exception as e:
        print(f"AI Error: {e}")
        return json.dumps(
            [{"name": "Выпрыгивания", "sets": 3, "reps": 20}, {"name": "Бёрнауты", "sets": 1, "reps": 50}])


# --- БАЗА ДАННЫХ (SQLITE) ---
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
                jump REAL DEFAULT 0,
                reach INTEGER DEFAULT 0,
                sport_bg TEXT DEFAULT 'Beginner',
                goal TEXT DEFAULT 'Vertical Jump',
                streak INTEGER DEFAULT 0,
                last_active TEXT DEFAULT '',
                last_gain REAL DEFAULT 0,
                current_plan TEXT DEFAULT '',
                plan_date TEXT DEFAULT ''
            )
        ''')
        await db.commit()
        print(f"✅ База данных подключена: {DB_NAME}")


# --- СОЗДАНИЕ ССЫЛКИ ---
async def create_app_link(user_id, force_new=False):
    async with aiosqlite.connect(DB_NAME) as db:
        async with db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)) as cursor:
            row = await cursor.fetchone()

        if not row: return None

        # Распаковка кортежа SQLite (по индексам)
        # 0:id, 1:name, 2:week, 3:day, 4:xp, 5:h, 6:w, 7:jump, 8:reach, 9:bg, 10:goal, 11:streak, 12:last, 13:gain, 14:plan, 15:date
        week, day = row[2], row[3]
        current_plan, plan_date = row[14], row[15]
        today_str = datetime.now().strftime("%Y-%m-%d")

        # Логика генерации (если плана нет или новый день)
        if (not current_plan) or (plan_date != today_str) or force_new:
            print(f"LOG: Генерирую план для {user_id}")
            h = row[5] if row[5] > 0 else 180
            w = row[6] if row[6] > 0 else 75

            ai_plan_json = await generate_ai_workout(h, w, row[9], row[10], week, day)

            await db.execute("UPDATE users SET current_plan=?, plan_date=? WHERE user_id=?",
                             (ai_plan_json, today_str, user_id))
            await db.commit()
        else:
            print("LOG: План из кэша")
            ai_plan_json = current_plan

        safe_plan = base64.b64encode(ai_plan_json.encode('utf-8')).decode('utf-8')

        params = {
            'week': week, 'day': day, 'xp': row[4],
            'name': row[1] or "Атлет",
            'h': row[5], 'w': row[6], 'j': row[7], 'r': row[8],
            'bg': row[9], 'goal': row[10], 'streak': row[11],
            'gain': row[13], 'plan': safe_plan
        }
        return f"{WEBAPP_URL}?{urllib.parse.urlencode(params)}"


# --- ХЕНДЛЕРЫ ---
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    username = message.from_user.username or "Атлет"

    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute("INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)", (user_id, username))
        await db.execute("UPDATE users SET username=? WHERE user_id=?", (username, user_id))
        await db.commit()

        async with db.execute("SELECT streak FROM users WHERE user_id=?", (user_id,)) as c:
            res = await c.fetchone()
            streak = res[0] if res else 0

    link = await create_app_link(user_id)
    kb = ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text="🔥 Открыть Spirit App", web_app=WebAppInfo(url=link))]],
                             resize_keyboard=True)
    await message.answer(f"🌪 **Spirit of Power**\nАтлет: {username}\nСерия: {streak} 🔥\nТренер: AI 🧠", reply_markup=kb,
                         parse_mode="Markdown")


@dp.message(Command("users"))
async def cmd_users(message: types.Message):
    if message.from_user.id not in ADMIN_IDS: return

    async with aiosqlite.connect(DB_NAME) as db:
        async with db.execute("SELECT COUNT(*) FROM users") as c:
            count = (await c.fetchone())[0]
        async with db.execute("SELECT username, xp, goal FROM users ORDER BY xp DESC LIMIT 10") as c:
            rows = await c.fetchall()

    text = f"👥 **Всего:** {count}\n\n🏆 **Топ-10:**\n"
    for r in rows: text += f"👤 {r[0]} | {r[1]} XP | {r[2]}\n"
    await message.answer(text)


@dp.message(F.content_type == types.ContentType.WEB_APP_DATA)
async def process_data(message: types.Message):
    data = json.loads(message.web_app_data.data)
    user_id = message.from_user.id

    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute("INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)", (user_id, "User"))
        await db.commit()

        if data.get("action") == "refresh":
            pass  # Просто обновим ссылку ниже

        elif data.get("action") == "generate_ai":
            # Принудительно генерируем новый план
            link = await create_app_link(user_id, force_new=True)
            kb = ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text="🔥 Тренироваться", web_app=WebAppInfo(url=link))]],
                                     resize_keyboard=True)
            await message.answer("🧠 План перестроен!", reply_markup=kb)
            return

        elif data.get("action") == "save_profile":
            await db.execute("UPDATE users SET height=?, weight=?, jump=?, reach=?, sport_bg=?, goal=? WHERE user_id=?",
                             (int(data['h']), int(data['w']), float(data['j']), int(data['r']), data['bg'],
                              data['goal'], user_id))
            await db.commit()

            link = await create_app_link(user_id, force_new=True)
            kb = ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text="🔥 Тренироваться", web_app=WebAppInfo(url=link))]],
                                     resize_keyboard=True)
            await message.answer("✅ Профиль сохранен!", reply_markup=kb)
            return

        elif data.get("status") == "success":
            async with db.execute(
                    "SELECT week, day, xp, streak, last_active, sport_bg, jump FROM users WHERE user_id=?",
                    (user_id,)) as c:
                row = await c.fetchone()

            # Расчет
            week, day, xp, streak, last_active_str, bg, jump = row
            min_g, max_g = (0.01, 0.15) if bg == "Advanced" else (0.05, 0.35)
            gain = round(random.uniform(min_g, max_g), 2)
            new_jump = round(jump + gain, 2)

            today = datetime.now().date()
            last = datetime.strptime(last_active_str, "%Y-%m-%d").date() if last_active_str else None

            new_streak = streak + 1 if last and (today - last).days == 1 else (
                1 if not last or (today - last).days > 1 else streak)

            new_day, new_week = day + 1, week
            msg = f"✅ Тренировка завершена!\n📈 +{gain} см\n🔥 Серия: {new_streak}"

            if new_day > 3:
                new_day, new_week = 1, week + 1
                msg = f"🏆 НЕДЕЛЯ {week} ЗАКРЫТА!\n📈 +{gain} см"

            # СБРОС ПЛАНА (current_plan='')
            await db.execute(
                "UPDATE users SET week=?, day=?, xp=xp+50, streak=?, last_active=?, jump=?, last_gain=?, current_plan='' WHERE user_id=?",
                (new_week, new_day, new_streak, str(today), new_jump, gain, user_id))
            await db.commit()

            link = await create_app_link(user_id)
            kb = ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text="🔥 Следующая", web_app=WebAppInfo(url=link))]],
                                     resize_keyboard=True)
            await message.answer(msg, reply_markup=kb)
            return

    # Дефолтный ответ для refresh
    link = await create_app_link(user_id)
    kb = ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text="🔥 Тренироваться", web_app=WebAppInfo(url=link))]],
                             resize_keyboard=True)
    await message.answer("Данные обновлены", reply_markup=kb)


async def main():
    await init_db()
    bot = Bot(token=TOKEN)
    logging.basicConfig(level=logging.INFO)
    print("Бот запущен на SQLite...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())