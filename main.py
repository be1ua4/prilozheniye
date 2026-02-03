import asyncio
import json
import logging
import aiosqlite
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo

# ================= НАСТРОЙКИ =================
TOKEN = "7590291969:AAGjymk4V9acaRGOnAzYLlYwlb5jC0b2V3w"
# Твоя ссылка на GitHub Pages
WEBAPP_URL = "https://be1ua4.github.io/ogurc1/"
DB_NAME = "spirit.db"
# =============================================

dp = Dispatcher()


async def init_db():
    async with aiosqlite.connect(DB_NAME) as db:
        # Добавляем поле day (день внутри недели)
        await db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                week INTEGER DEFAULT 1,
                day INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0
            )
        ''')
        # Если база старая и поля day нет, этот код может упасть.
        # Лучше удалить файл spirit.db перед запуском новой версии!
        await db.commit()


@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    user_id = message.from_user.id

    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute("INSERT OR IGNORE INTO users (user_id) VALUES (?, 1, 1, 0)", (user_id,))
        await db.commit()

        async with db.execute("SELECT week, day FROM users WHERE user_id = ?", (user_id,)) as cursor:
            row = await cursor.fetchone()
            week, day = row if row else (1, 1)

    # Передаем и неделю, и день в URL
    app_link = f"{WEBAPP_URL}?week={week}&day={day}"

    kb = ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="🔥 Начать тренировку", web_app=WebAppInfo(url=app_link))]
    ], resize_keyboard=True)

    await message.answer(
        f"🌪 **Spirit of Power**\n"
        f"Неделя: {week} | День: {day}/3\n\n"
        "Готов стать выше? Жми кнопку 👇",
        reply_markup=kb,
        parse_mode="Markdown"
    )


@dp.message(F.content_type == types.ContentType.WEB_APP_DATA)
async def process_data(message: types.Message):
    data = json.loads(message.web_app_data.data)

    if data.get("status") == "success":
        user_id = message.from_user.id

        async with aiosqlite.connect(DB_NAME) as db:
            # Получаем текущий прогресс
            async with db.execute("SELECT week, day, xp FROM users WHERE user_id = ?", (user_id,)) as cursor:
                week, day, xp = await cursor.fetchone()

            # Логика Air Alert (3 тренировки в неделю)
            new_day = day + 1
            new_week = week
            msg_text = f"✅ День {day} выполнен! +50 XP"

            if new_day > 3:  # Если сделали 3 дня, переходим на след неделю
                new_day = 1
                new_week += 1
                msg_text = f"🏆 **НЕДЕЛЯ {week} ЗАКРЫТА!**\nПереход на уровень {new_week}."

            await db.execute("UPDATE users SET week = ?, day = ?, xp = xp + 50 WHERE user_id = ?",
                             (new_week, new_day, user_id))
            await db.commit()

        # Обновляем кнопку
        new_link = f"{WEBAPP_URL}?week={new_week}&day={new_day}"
        kb = ReplyKeyboardMarkup(keyboard=[
            [KeyboardButton(text="🔥 Следующая тренировка", web_app=WebAppInfo(url=new_link))]
        ], resize_keyboard=True)

        await message.answer(msg_text, reply_markup=kb, parse_mode="Markdown")


async def main():
    await init_db()
    bot = Bot(token=TOKEN)
    logging.basicConfig(level=logging.INFO)
    print("Бот запущен...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())