import asyncio
import json
import logging
import aiosqlite
import urllib.parse  # НУЖНО ДЛЯ КОДИРОВАНИЯ ИМЕНИ
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo

TOKEN = "7590291969:AAGbIrhcgWLkcj0k3sRK_XiBsZPpmHrQin4"
WEBAPP_URL = "https://be1ua4.github.io/prilozheniye/"
DB_NAME = "spirit.db"

dp = Dispatcher()


async def init_db():
    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                week INTEGER DEFAULT 1,
                day INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0
            )
        ''')
        await db.commit()


@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    username = message.from_user.first_name or "Атлет"  # Если имени нет

    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute("INSERT OR IGNORE INTO users (user_id, week, day, xp) VALUES (?, 1, 1, 0)", (user_id,))
        await db.commit()
        async with db.execute("SELECT week, day, xp FROM users WHERE user_id = ?", (user_id,)) as cursor:
            row = await cursor.fetchone()
            week, day, xp = row if row else (1, 1, 0)

    # КОДИРУЕМ ИМЯ И ДОБАВЛЯЕМ XP В ССЫЛКУ
    safe_name = urllib.parse.quote(username)
    app_link = f"{WEBAPP_URL}?week={week}&day={day}&xp={xp}&name={safe_name}"

    kb = ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="🔥 Начать тренировку", web_app=WebAppInfo(url=app_link))]
    ], resize_keyboard=True)

    await message.answer(
        f"🌪 **Spirit of Power**\n"
        f"Неделя: {week} | День: {day}/3 | XP: {xp}\n"
        "Жми кнопку 👇",
        reply_markup=kb,
        parse_mode="Markdown"
    )


@dp.message(F.content_type == types.ContentType.WEB_APP_DATA)
async def process_data(message: types.Message):
    data = json.loads(message.web_app_data.data)
    if data.get("status") == "success":
        user_id = message.from_user.id
        async with aiosqlite.connect(DB_NAME) as db:
            async with db.execute("SELECT week, day, xp FROM users WHERE user_id = ?", (user_id,)) as cursor:
                week, day, xp = await cursor.fetchone()

            new_day = day + 1
            new_week = week
            bonus_xp = 50
            msg = f"✅ День {day} выполнен! +{bonus_xp} XP"

            if new_day > 3:
                new_day = 1
                new_week += 1
                bonus_xp = 150  # Бонус за неделю
                msg = f"🏆 **НЕДЕЛЯ {week} ЗАКРЫТА!**\nПереход на уровень {new_week}.\nБонус +{bonus_xp} XP"

            await db.execute("UPDATE users SET week=?, day=?, xp=xp+? WHERE user_id=?",
                             (new_week, new_day, bonus_xp, user_id))
            await db.commit()

            # Обновляем ссылку в кнопке (важно!)
            username = message.from_user.first_name or "Атлет"
            safe_name = urllib.parse.quote(username)
            new_xp = xp + bonus_xp
            new_link = f"{WEBAPP_URL}?week={new_week}&day={new_day}&xp={new_xp}&name={safe_name}"

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