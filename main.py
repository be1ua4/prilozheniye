import asyncio
import json
import logging
import aiosqlite
import urllib.parse
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo

TOKEN = "7590291969:AAGbIrhcgWLkcj0k3sRK_XiBsZPpmHrQin4"  # Твой токен
WEBAPP_URL = "https://be1ua4.github.io/prilozheniye/"  # Твоя ссылка
DB_NAME = "spirit.db"

dp = Dispatcher()


async def init_db():
    async with aiosqlite.connect(DB_NAME) as db:
        # Добавляем новые поля: height, weight, jump, goal
        await db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                week INTEGER DEFAULT 1,
                day INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                height INTEGER DEFAULT 0,
                weight INTEGER DEFAULT 0,
                jump INTEGER DEFAULT 0,
                goal TEXT DEFAULT 'Стать выше'
            )
        ''')
        await db.commit()


@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    username = message.from_user.first_name or "Атлет"

    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute("INSERT OR IGNORE INTO users (user_id) VALUES (?)", (user_id,))
        await db.commit()

        # Запрашиваем ВСЕ данные
        async with db.execute("SELECT week, day, xp, height, weight, jump, goal FROM users WHERE user_id = ?",
                              (user_id,)) as cursor:
            row = await cursor.fetchone()
            # Распаковываем данные. Если данных нет, ставим 0
            week, day, xp, height, weight, jump, goal = row if row else (1, 1, 0, 0, 0, 0, "Стать выше")

    # Кодируем строки для URL
    safe_name = urllib.parse.quote(username)
    safe_goal = urllib.parse.quote(goal)

    # Формируем длинную ссылку со всеми параметрами
    app_link = f"{WEBAPP_URL}?week={week}&day={day}&xp={xp}&name={safe_name}&h={height}&w={weight}&j={jump}&goal={safe_goal}"

    kb = ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="🔥 Открыть Spirit App", web_app=WebAppInfo(url=app_link))]
    ], resize_keyboard=True)

    await message.answer(
        f"🌪 **Spirit of Power**\n"
        f"Атлет: {username}\n"
        f"Уровень: {xp} XP\n"
        "Заходи в приложение 👇",
        reply_markup=kb,
        parse_mode="Markdown"
    )


@dp.message(F.content_type == types.ContentType.WEB_APP_DATA)
async def process_data(message: types.Message):
    data = json.loads(message.web_app_data.data)
    user_id = message.from_user.id

    async with aiosqlite.connect(DB_NAME) as db:

        # СЦЕНАРИЙ 1: Сохранение профиля (Анкета)
        if data.get("action") == "save_profile":
            await db.execute("UPDATE users SET height=?, weight=?, jump=?, goal=? WHERE user_id=?",
                             (data['h'], data['w'], data['j'], data['goal'], user_id))
            await db.commit()

            # После сохранения профиля нужно дать новую кнопку с обновленными данными
            # Для простоты просто пишем сообщение, пользователь перезайдет по /start или старой кнопке
            await message.answer(f"✅ Профиль обновлен!\nЦель: {data['goal']}\nРост: {data['h']} см")

        # СЦЕНАРИЙ 2: Завершение тренировки
        elif data.get("status") == "success":
            async with db.execute("SELECT week, day, xp FROM users WHERE user_id = ?", (user_id,)) as cursor:
                week, day, xp = await cursor.fetchone()

            new_day = day + 1
            new_week = week
            bonus_xp = 50
            msg = f"✅ День {day} выполнен! +{bonus_xp} XP"

            if new_day > 3:
                new_day = 1
                new_week += 1
                bonus_xp = 150
                msg = f"🏆 **НЕДЕЛЯ {week} ЗАКРЫТА!**\nПереход на уровень {new_week}."

            await db.execute("UPDATE users SET week=?, day=?, xp=xp+? WHERE user_id=?",
                             (new_week, new_day, bonus_xp, user_id))
            await db.commit()

            # Для обновления кнопки после тренировки нам снова нужны данные профиля,
            # чтобы не потерять их в URL. В идеале лучше делать отдельный API запрос,
            # но пока оставим простую логику обновления через сообщение.
            await message.answer(msg, parse_mode="Markdown")


async def main():
    await init_db()
    bot = Bot(token=TOKEN)
    logging.basicConfig(level=logging.INFO)
    print("Бот запущен...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())