import asyncio
import json
import logging
import aiosqlite
import urllib.parse
from datetime import datetime, timedelta
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo

TOKEN = "7590291969:AAGbIrhcgWLkcj0k3sRK_XiBsZPpmHrQin4"  # Твой токен
WEBAPP_URL = "https://be1ua4.github.io/prilozheniye/"  # Твоя ссылка
DB_NAME = "spirit.db"

dp = Dispatcher()


async def init_db():
    async with aiosqlite.connect(DB_NAME) as db:
        # ОБНОВЛЕННАЯ СТРУКТУРА: добавили username
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
    """Получает топ-10 пользователей по XP"""
    async with aiosqlite.connect(DB_NAME) as db:
        # ИЗМЕНЕНИЕ: LIMIT 3 -> LIMIT 10
        async with db.execute("SELECT username, xp FROM users ORDER BY xp DESC LIMIT 10") as cursor:
            rows = await cursor.fetchall()
            # Превращаем список в строку вида "Name1:100|Name2:50|Name3:10"
            top_list = []
            for row in rows:
                name = row[0] if row[0] else "Атлет"
                xp = row[1]
                top_list.append(f"{name}:{xp}")
            return "|".join(top_list)


@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    # Берем имя (username или first_name)
    raw_username = message.from_user.username or message.from_user.first_name or "Атлет"
    # Убираем двоеточия и палки, чтобы не ломать наш формат данных
    clean_username = raw_username.replace(":", "").replace("|", "")

    async with aiosqlite.connect(DB_NAME) as db:
        # Теперь сохраняем и ИМЯ (username)
        await db.execute("INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)", (user_id, clean_username))
        # Обновляем имя, если оно изменилось
        await db.execute("UPDATE users SET username=? WHERE user_id=?", (clean_username, user_id))
        await db.commit()

        async with db.execute(
                "SELECT week, day, xp, height, weight, jump, reach, sport_bg, goal, streak FROM users WHERE user_id = ?",
                (user_id,)) as cursor:
            row = await cursor.fetchone()
            week, day, xp, height, weight, jump, reach, sport_bg, goal, streak = row if row else (
                1, 1, 0, 0, 0, 0, 0, "Beginner", "Стать выше", 0)

    # Получаем ТОП игроков
    top_leaders = await get_top_users()
    safe_leaders = urllib.parse.quote(top_leaders)

    # Кодируем остальные данные
    safe_name = urllib.parse.quote(clean_username)
    safe_goal = urllib.parse.quote(goal)
    safe_bg = urllib.parse.quote(sport_bg)

    # Добавляем leaders в ссылку
    app_link = f"{WEBAPP_URL}?week={week}&day={day}&xp={xp}&name={safe_name}&h={height}&w={weight}&j={jump}&r={reach}&bg={safe_bg}&goal={safe_goal}&streak={streak}&top={safe_leaders}"

    kb = ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="🔥 Открыть Spirit App", web_app=WebAppInfo(url=app_link))]
    ], resize_keyboard=True)

    await message.answer(
        f"🌪 **Spirit of Power**\n"
        f"Атлет: {clean_username}\n"
        f"Серия дней: {streak} 🔥\n"
        "Заходи в приложение 👇",
        reply_markup=kb,
        parse_mode="Markdown"
    )


@dp.message(F.content_type == types.ContentType.WEB_APP_DATA)
async def process_data(message: types.Message):
    data = json.loads(message.web_app_data.data)
    user_id = message.from_user.id

    # Имя тоже нужно для обновления ссылки
    raw_username = message.from_user.username or message.from_user.first_name or "Атлет"
    clean_username = raw_username.replace(":", "").replace("|", "")

    async with aiosqlite.connect(DB_NAME) as db:
        # СЦЕНАРИЙ: Обновление (Кнопка Refresh)
        if data.get("action") == "refresh":
            # Просто читаем данные и отправляем новую ссылку
            async with db.execute(
                    "SELECT week, day, xp, height, weight, jump, reach, sport_bg, goal, streak FROM users WHERE user_id = ?",
                    (user_id,)) as cursor:
                week, day, xp, height, weight, jump, reach, sport_bg, goal, streak = await cursor.fetchone()

            # Обновляем имя в базе на всякий случай
            await db.execute("UPDATE users SET username=? WHERE user_id=?", (clean_username, user_id))
            await db.commit()

            # Получаем СВЕЖИЙ топ
            top_leaders = await get_top_users()
            safe_leaders = urllib.parse.quote(top_leaders)

            safe_name = urllib.parse.quote(clean_username)
            safe_goal = urllib.parse.quote(goal)
            safe_bg = urllib.parse.quote(sport_bg)

            new_link = f"{WEBAPP_URL}?week={week}&day={day}&xp={xp}&name={safe_name}&h={height}&w={weight}&j={jump}&r={reach}&bg={safe_bg}&goal={safe_goal}&streak={streak}&top={safe_leaders}"

            kb = ReplyKeyboardMarkup(keyboard=[
                [KeyboardButton(text="🔥 Тренироваться", web_app=WebAppInfo(url=new_link))]
            ], resize_keyboard=True)

            await message.answer("🔄 Таблица лидеров обновлена!", reply_markup=kb)

        # СЦЕНАРИЙ 1: Сохранение профиля
        elif data.get("action") == "save_profile":
            await db.execute(
                "UPDATE users SET height=?, weight=?, jump=?, reach=?, sport_bg=?, goal=?, username=? WHERE user_id=?",
                (data['h'], data['w'], data['j'], data['r'], data['bg'], data['goal'], clean_username, user_id))
            await db.commit()

            async with db.execute("SELECT week, day, xp, streak FROM users WHERE user_id = ?", (user_id,)) as cursor:
                week, day, xp, streak = await cursor.fetchone()

            # Получаем свежий ТОП
            top_leaders = await get_top_users()
            safe_leaders = urllib.parse.quote(top_leaders)

            safe_name = urllib.parse.quote(clean_username)
            safe_goal = urllib.parse.quote(data['goal'])
            safe_bg = urllib.parse.quote(data['bg'])

            new_link = f"{WEBAPP_URL}?week={week}&day={day}&xp={xp}&name={safe_name}&h={data['h']}&w={data['w']}&j={data['j']}&r={data['r']}&bg={safe_bg}&goal={safe_goal}&streak={streak}&top={safe_leaders}"

            kb = ReplyKeyboardMarkup(keyboard=[
                [KeyboardButton(text="🔥 Тренироваться", web_app=WebAppInfo(url=new_link))]
            ], resize_keyboard=True)

            await message.answer(f"✅ Профиль сохранен!\nТеперь нажми кнопку ниже 👇", reply_markup=kb)

        # СЦЕНАРИЙ 2: Завершение тренировки
        elif data.get("status") == "success":
            async with db.execute(
                    "SELECT week, day, xp, height, weight, jump, reach, sport_bg, goal, streak, last_active FROM users WHERE user_id = ?",
                    (user_id,)) as cursor:
                week, day, xp, height, weight, jump, reach, sport_bg, goal, streak, last_active = await cursor.fetchone()

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

            # Обновляем данные
            await db.execute(
                "UPDATE users SET week=?, day=?, xp=xp+?, streak=?, last_active=?, username=? WHERE user_id=?",
                (new_week, new_day, bonus_xp, new_streak, today_str, clean_username, user_id))
            await db.commit()

            # Получаем свежий ТОП
            top_leaders = await get_top_users()
            safe_leaders = urllib.parse.quote(top_leaders)

            safe_name = urllib.parse.quote(clean_username)
            safe_goal = urllib.parse.quote(goal)
            safe_bg = urllib.parse.quote(sport_bg)
            new_xp = xp + bonus_xp

            new_link = f"{WEBAPP_URL}?week={new_week}&day={new_day}&xp={new_xp}&name={safe_name}&h={height}&w={weight}&j={jump}&r={reach}&bg={safe_bg}&goal={safe_goal}&streak={new_streak}&top={safe_leaders}"

            kb = ReplyKeyboardMarkup(keyboard=[
                [KeyboardButton(text="🔥 Следующая тренировка", web_app=WebAppInfo(url=new_link))]
            ], resize_keyboard=True)

            await message.answer(msg, reply_markup=kb, parse_mode="Markdown")


async def main():
    await init_db()
    bot = Bot(token=TOKEN)
    logging.basicConfig(level=logging.INFO)
    print("Бот запущен...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())