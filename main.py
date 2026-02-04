import asyncio
import json
import logging
import aiosqlite
import urllib.parse
import base64
import random
import re
from datetime import datetime, timedelta
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo

# --- НАСТРОЙКИ ---
TOKEN = "7590291969:AAGbIrhcgWLkcj0k3sRK_XiBsZPpmHrQin4"
WEBAPP_URL = "https://be1ua4.github.io/prilozheniye/"
DB_NAME = "spirit.db"

GIGACHAT_KEY = "MDE5YzBhOTQtZDYwMi03ODQzLTk5OTAtYTNmNGQ0MWEzODc1OjAyMjVkZDM5LTEzN2QtNDQzMS04NDE0LWM2MmQyNjA0MzEwNw=="

dp = Dispatcher()

try:
    from gigachat import GigaChat

    HAS_GIGACHAT = True
except ImportError:
    HAS_GIGACHAT = False
    print("⚠️ Библиотека 'gigachat' не найдена.")


# --- ГЕНЕРАЦИЯ ТРЕНИРОВКИ (С ПРОГРЕССИЕЙ НАГРУЗКИ) ---
async def generate_ai_workout(height, weight, bg, goal, week, day):
    print(f"DEBUG: Генерация. Неделя {week}, День {day}. Цель: {goal}")

    if not HAS_GIGACHAT:
        return json.dumps([{"name": "Выпрыгивания", "sets": 3, "reps": 20}])

    try:
        chat = GigaChat(credentials=GIGACHAT_KEY, verify_ssl_certs=False)

        # 1. БАЗОВЫЙ ОБЪЕМ (ОТ УРОВНЯ)
        base_reps = 100
        progression_rate = 15  # +15 повторений каждую неделю

        if bg == "Intermediate":
            base_reps = 250
            progression_rate = 25
        elif bg == "Advanced":
            base_reps = 500
            progression_rate = 40

        # 2. МАТЕМАТИКА ПРОГРЕССИИ (Progressive Overload)
        # Чем дальше неделя, тем больше повторений требует бот
        target_volume = base_reps + ((week - 1) * progression_rate)

        overload_instruction = ""
        if week > 4:
            overload_instruction = "Увеличивай сложность упражнений (например, больше плиометрики)."
        if week > 8:
            overload_instruction = "МАКСИМАЛЬНАЯ ИНТЕНСИВНОСТЬ. Добавляй супер-сеты или увеличивай подходы."

        # 3. ФОКУС ДНЯ (МИКРОЦИКЛ)
        day_focus = ""
        day_cycle = day % 3
        if day_cycle == 1:
            day_focus = "ФОКУС: Взрывная сила (Плиометрика). Тумба, глубинные прыжки."
        elif day_cycle == 2:
            day_focus = "ФОКУС: Сила ног. Приседы, выпады, статика."
        else:
            day_focus = "ФОКУС: Скорость и эластичность. Пого, бёрнауты, частота."

        # 4. СПЕЦИФИКА ЦЕЛИ
        goal_prompt = f"Глобальная цель: {goal}."
        if goal == "Vertical Jump":
            goal_prompt += " Акцент на высоту вылета."

        full_list = "['Выпрыгивания', 'Зашагивания', 'Прыжки на икрах', 'Бёрнауты', 'Прыжки из приседа', 'Запрыгивания на тумбу', 'Глубинные прыжки', 'Пого прыжки', 'Прыжок в длину', 'Болгарские выпады', 'Прыжки в выпаде', 'Пистолетик', 'Спринты', 'Становая тяга', 'Ягодичный мост', 'Махи гирей', 'Выпрыгивание с колен']"

        prompt = (
            f"Роль: Тренер по прыжкам. Атлет: {height}см, {weight}кг, Опыт: {bg}.\n"
            f"ЭТАП: Неделя {week} (Прогрессия нагрузки).\n"
            f"ТРЕБУЕМЫЙ ОБЪЕМ: минимум {target_volume} повторений за тренировку (сумма по всем упражнениям).\n"
            f"{overload_instruction}\n"
            f"{goal_prompt}\n"
            f"{day_focus}\n\n"
            f"Задача: Составь план на 1 тренировку (3-6 упражнений) из списка: {full_list}.\n"
            f"Подбирай подходы/повторения так, чтобы в сумме вышло {target_volume}+.\n"
            f"Ответь СТРОГО JSON массивом: [{{\"name\": \"...\", \"sets\": N, \"reps\": N}}]"
        )

        response = chat.chat(prompt)
        content = response.choices[0].message.content

        # Чистка JSON
        start = content.find('[')
        end = content.rfind(']') + 1

        if start != -1 and end != -1:
            json_str = content[start:end]
            try:
                data = json.loads(json_str)
            except json.JSONDecodeError:
                fixed_str = json_str.replace("'", '"')
                try:
                    data = json.loads(fixed_str)
                except:
                    raise ValueError("Bad JSON")
            return json.dumps(data, ensure_ascii=False)
        else:
            raise ValueError("No JSON found")

    except Exception as e:
        print(f"AI Error: {e}")
        # Fallback с учетом прогрессии
        base = 20 + (week * 2)
        return json.dumps(
            [{"name": "Выпрыгивания", "sets": 4, "reps": base}, {"name": "Бёрнауты", "sets": 2, "reps": base * 2}])


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


# --- УМНАЯ ГЕНЕРАЦИЯ ССЫЛКИ ---
async def create_app_link(user_id, db, force_new=False):
    async with db.execute(
            "SELECT week, day, xp, height, weight, jump, reach, sport_bg, goal, streak, username, last_gain, current_plan, plan_date FROM users WHERE user_id = ?",
            (user_id,)) as cursor:
        row = await cursor.fetchone()
        if not row: return None
        week, day, xp, height, weight, jump, reach, sport_bg, goal, streak, username, last_gain, current_plan, plan_date = row

    today_str = datetime.now().strftime("%Y-%m-%d")

    # Логика кэша
    if current_plan and plan_date == today_str and not force_new:
        print("LOG: Использую сохраненный план из БД")
        ai_plan_json = current_plan
    else:
        print(f"LOG: Генерирую новый план (Неделя {week})")
        h_val = height if height > 0 else 180
        w_val = weight if weight > 0 else 75

        # Передаем week и day для расчета нагрузки
        ai_plan_json = await generate_ai_workout(h_val, w_val, sport_bg, goal, week, day)

        await db.execute("UPDATE users SET current_plan=?, plan_date=? WHERE user_id=?",
                         (ai_plan_json, today_str, user_id))
        await db.commit()

    safe_plan = base64.b64encode(ai_plan_json.encode('utf-8')).decode('utf-8')
    safe_name = urllib.parse.quote(username or "Атлет")
    safe_goal = urllib.parse.quote(goal)
    safe_bg = urllib.parse.quote(sport_bg)
    top_leaders = await get_top_users()
    safe_leaders = urllib.parse.quote(top_leaders)

    return f"{WEBAPP_URL}?week={week}&day={day}&xp={xp}&name={safe_name}&h={height}&w={weight}&j={jump}&r={reach}&bg={safe_bg}&goal={safe_goal}&streak={streak}&top={safe_leaders}&plan={safe_plan}&gain={last_gain}"


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

        app_link = await create_app_link(user_id, db)

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
        await db.execute("INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)", (user_id, clean_username))

        if data.get("action") == "refresh":
            await db.execute("UPDATE users SET username=? WHERE user_id=?", (clean_username, user_id))
            await db.commit()
            new_link = await create_app_link(user_id, db, force_new=False)
            kb = ReplyKeyboardMarkup(
                keyboard=[[KeyboardButton(text="🔥 Тренироваться", web_app=WebAppInfo(url=new_link))]],
                resize_keyboard=True)
            await message.answer("🔄 Данные обновлены!", reply_markup=kb)

        elif data.get("action") == "generate_ai":
            new_link = await create_app_link(user_id, db, force_new=True)
            kb = ReplyKeyboardMarkup(
                keyboard=[[KeyboardButton(text="🔥 Тренироваться", web_app=WebAppInfo(url=new_link))]],
                resize_keyboard=True)
            await message.answer("🤖 Тренировка пересчитана! Нагрузка адаптирована под твой прогресс.", reply_markup=kb)

        elif data.get("action") == "save_profile":
            await db.execute(
                "UPDATE users SET height=?, weight=?, jump=?, reach=?, sport_bg=?, goal=?, username=? WHERE user_id=?",
                (data['h'], data['w'], data['j'], data['r'], data['bg'], data['goal'], clean_username, user_id))
            await db.commit()
            new_link = await create_app_link(user_id, db, force_new=True)
            kb = ReplyKeyboardMarkup(
                keyboard=[[KeyboardButton(text="🔥 Тренироваться", web_app=WebAppInfo(url=new_link))]],
                resize_keyboard=True)
            await message.answer(f"✅ Профиль сохранен!\nПлан адаптирован под цель: {data['goal']} 🎯", reply_markup=kb)

        elif data.get("status") == "success":
            async with db.execute(
                    "SELECT week, day, xp, streak, last_active, sport_bg, jump FROM users WHERE user_id = ?",
                    (user_id,)) as cursor:
                week, day, xp, streak, last_active, sport_bg, current_jump = await cursor.fetchone()

            min_gain, max_gain = (0.01, 0.15) if sport_bg == "Advanced" else (0.05, 0.30)
            jump_increase = round(random.uniform(min_gain, max_gain), 2)
            new_jump = round(current_jump + jump_increase, 2)

            today_str = datetime.now().strftime("%Y-%m-%d")
            new_streak = streak
            if last_active:
                delta = (datetime.now() - datetime.strptime(last_active, "%Y-%m-%d")).days
                new_streak = new_streak + 1 if delta == 1 else (1 if delta > 1 else new_streak)
            else:
                new_streak = 1

            new_day = day + 1
            new_week = week
            bonus_xp = 50
            msg = f"✅ Тренировка завершена! +{bonus_xp} XP\n📈 **Прыжок: +{jump_increase} см**\n🔥 Серия: {new_streak} дн."

            if new_day > 3:
                new_day = 1
                new_week += 1
                bonus_xp = 150
                msg = f"🏆 **НЕДЕЛЯ {week} ЗАКРЫТА!**\n📈 **Прыжок: +{jump_increase} см**\nБонус +{bonus_xp} XP\n🔥 Серия: {new_streak} дн."

            await db.execute(
                "UPDATE users SET week=?, day=?, xp=xp+?, streak=?, last_active=?, username=?, jump=?, last_gain=?, current_plan='' WHERE user_id=?",
                (new_week, new_day, bonus_xp, new_streak, today_str, clean_username, new_jump, jump_increase, user_id))
            await db.commit()

            new_link = await create_app_link(user_id, db)
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
