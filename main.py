import asyncio
import json
import logging
import aiosqlite
import urllib.parse
import base64
import random
import os
from datetime import datetime
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo

# --- НАСТРОЙКИ ---
TOKEN = "8205165241:AAFXJw02QBG7m1232iold9TTcn9y9x14Aoc"
WEBAPP_URL = "https://be1ua4.github.io/prilozheniye/"

# --- УМНАЯ НАСТРОЙКА БАЗЫ ДАННЫХ (SQLite) ---
if os.path.exists("/app/data"):
    DB_NAME = "/app/data/spirit.db"
    print("📂 LOG: Работаю с базой на сервере (Volume)")
else:
    DB_NAME = "spirit.db"
    print("💻 LOG: Работаю с локальной базой")

GIGACHAT_KEY = "MDE5YzBhOTQtZDYwMi03ODQzLTk5OTAtYTNmNGQ0MWEzODc1OjAyMjVkZDM5LTEzN2QtNDQzMS04NDE0LWM2MmQyNjA0MzEwNw=="
ADMIN_IDS = [941369221]  # Ваш ID

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


# --- СОЗДАНИЕ ССЫЛКИ (ГЛАВНАЯ ФУНКЦИЯ) ---
async def create_app_link(user_id, db, force_new=False):
    # Получаем ВСЕ данные пользователя, чтобы не было IndexError
    async with db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)) as cursor:
        row = await cursor.fetchone()

    if not row: return None

    # 🔥 1. СБОР ЛИДЕРБОРДА (ВОЗВРАЩЕНО!)
    leaders_str = ""
    try:
        async with db.execute("SELECT username, xp FROM users ORDER BY xp DESC LIMIT 10") as cursor:
            leaders_data = await cursor.fetchall()

        leaders_list = []
        for r in leaders_data:
            # r[0] - имя, r[1] - опыт
            name = r[0] if r[0] else "Атлет"
            leaders_list.append(f"{name}:{r[1]}")
        leaders_str = "|".join(leaders_list)
    except Exception as e:
        print(f"Leaderboard error: {e}")

    # 2. РАСПАКОВКА ДАННЫХ ЮЗЕРА
    # Порядок колонок в SQLite важен:
    # 0:id, 1:name, 2:week, 3:day, 4:xp, 5:h, 6:w, 7:jump, 8:reach, 9:bg, 10:goal, 11:streak, 12:last, 13:gain, 14:plan, 15:date
    week, day = row[2], row[3]
    current_plan, plan_date = row[14], row[15]
    today_str = datetime.now().strftime("%Y-%m-%d")

    # 3. ЛОГИКА ПЛАНА (Кэш или Генерация)
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

    # 4. СБОРКА ССЫЛКИ С ПАРАМЕТРАМИ
    params = {
        'week': week, 'day': day, 'xp': row[4],
        'name': row[1] or "Атлет",
        'h': row[5], 'w': row[6], 'j': row[7], 'r': row[8],
        'bg': row[9], 'goal': row[10], 'streak': row[11],
        'gain': row[13], 'plan': safe_plan,
        'top': leaders_str  # <-- Передаем топ игроков!
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

        # Передаем db, чтобы не открывать соединение дважды
        link = await create_app_link(user_id, db)

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
        # Обновляем имя при каждом входе
        await db.execute("INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)", (user_id, "User"))
        await db.commit()

        if data.get("action") == "refresh":
            pass

        elif data.get("action") == "generate_ai":
            link = await create_app_link(user_id, db, force_new=True)
            kb = ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text="🔥 Тренироваться", web_app=WebAppInfo(url=link))]],
                                     resize_keyboard=True)
            await message.answer("🧠 План перестроен!", reply_markup=kb)
            return

        elif data.get("action") == "save_profile":
            await db.execute("UPDATE users SET height=?, weight=?, jump=?, reach=?, sport_bg=?, goal=? WHERE user_id=?",
                             (int(data['h']), int(data['w']), float(data['j']), int(data['r']), data['bg'],
                              data['goal'], user_id))
            await db.commit()

            link = await create_app_link(user_id, db, force_new=True)
            kb = ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text="🔥 Тренироваться", web_app=WebAppInfo(url=link))]],
                                     resize_keyboard=True)
            await message.answer("✅ Профиль сохранен!", reply_markup=kb)
            return

        elif data.get("status") == "success":
            # Используем SELECT * чтобы не путать индексы
            async with db.execute("SELECT * FROM users WHERE user_id=?", (user_id,)) as c:
                row = await c.fetchone()

            if not row: return

            # --- ФИКСАЦИЯ РЕЗУЛЬТАТА ---
            real_gain = float(data.get("gain", 0.1))
            current_jump = row[7]  # jump
            new_jump = round(current_jump + real_gain, 2)

            # Логика календаря
            today = datetime.now().date()
            last_active_str = row[12]
            current_streak_val = row[11]

            new_streak = current_streak_val
            if last_active_str:
                try:
                    last_date = datetime.strptime(last_active_str, "%Y-%m-%d").date()
                    days_diff = (today - last_date).days
                    if days_diff == 1:
                        new_streak += 1
                    elif days_diff > 1:
                        new_streak = 1
                except:
                    pass
            else:
                new_streak = 1

            new_day, new_week = row[3] + 1, row[2]
            bonus_xp = 50

            msg = (f"✅ Тренировка завершена! +50 XP\n"
                   f"📈 **Прыжок: +{real_gain} см** (Всего: {new_jump})")

            if new_day > 3:
                new_day, new_week = 1, row[2] + 1
                msg += f"\n🏆 **НЕДЕЛЯ {row[2]} ЗАКРЫТА!**"

            await db.execute(
                "UPDATE users SET week=?, day=?, xp=xp+50, streak=?, last_active=?, jump=?, last_gain=?, current_plan='' WHERE user_id=?",
                (new_week, new_day, new_streak, str(today), new_jump, real_gain, user_id))
            await db.commit()

            link = await create_app_link(user_id, db)
            kb = ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text="🔥 Следующая", web_app=WebAppInfo(url=link))]],
                                     resize_keyboard=True)
            await message.answer(msg, reply_markup=kb, parse_mode="Markdown")
            return

        # 🔥 ИСПРАВЛЕННЫЙ ОТСТУП: Этот блок теперь ВНУТРИ async with
        link = await create_app_link(user_id, db)
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