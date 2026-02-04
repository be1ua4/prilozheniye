import asyncio
import json
import logging
import aiosqlite
import urllib.parse
from datetime import datetime, timedelta  # НУЖНО ДЛЯ РАБОТЫ С ДАТАМИ
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo

TOKEN = "7590291969:AAGbIrhcgWLkcj0k3sRK_XiBsZPpmHrQin4"  # Твой токен
WEBAPP_URL = "https://be1ua4.github.io/prilozheniye/"  # Твоя ссылка
DB_NAME = "spirit.db"

dp = Dispatcher()


async def init_db():
    async with aiosqlite.connect(DB_NAME) as db:
        # ОБНОВЛЕННАЯ СТРУКТУРА: добавили streak (серия) и last_active (дата последней тренировки)
        await db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
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


@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    username = message.from_user.first_name or "Атлет"

    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute("INSERT OR IGNORE INTO users (user_id) VALUES (?)", (user_id,))
        await db.commit()

        # Запрашиваем ВСЕ данные
        async with db.execute(
                "SELECT week, day, xp, height, weight, jump, reach, sport_bg, goal, streak FROM users WHERE user_id = ?",
                (user_id,)) as cursor:
            row = await cursor.fetchone()
            # Распаковка
            week, day, xp, height, weight, jump, reach, sport_bg, goal, streak = row if row else (
            1, 1, 0, 0, 0, 0, 0, "Beginner", "Стать выше", 0)

    # Кодируем строки
    safe_name = urllib.parse.quote(username)
    safe_goal = urllib.parse.quote(goal)
    safe_bg = urllib.parse.quote(sport_bg)

    # Передаем streak в ссылку
    app_link = f"{WEBAPP_URL}?week={week}&day={day}&xp={xp}&name={safe_name}&h={height}&w={weight}&j={jump}&r={reach}&bg={safe_bg}&goal={safe_goal}&streak={streak}"

    kb = ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="🔥 Открыть Spirit App", web_app=WebAppInfo(url=app_link))]
    ], resize_keyboard=True)

    await message.answer(
        f"🌪 **Spirit of Power**\n"
        f"Атлет: {username}\n"
        f"Серия дней: {streak} 🔥\n"
        "Заходи в приложение 👇",
        reply_markup=kb,
        parse_mode="Markdown"
    )


@dp.message(F.content_type == types.ContentType.WEB_APP_DATA)
async def process_data(message: types.Message):
    data = json.loads(message.web_app_data.data)
    user_id = message.from_user.id

    async with aiosqlite.connect(DB_NAME) as db:

        # СЦЕНАРИЙ 1: Сохранение профиля
        if data.get("action") == "save_profile":
            await db.execute("UPDATE users SET height=?, weight=?, jump=?, reach=?, sport_bg=?, goal=? WHERE user_id=?",
                             (data['h'], data['w'], data['j'], data['r'], data['bg'], data['goal'], user_id))
            await db.commit()

            async with db.execute("SELECT week, day, xp, streak FROM users WHERE user_id = ?", (user_id,)) as cursor:
                week, day, xp, streak = await cursor.fetchone()

            username = message.from_user.first_name or "Атлет"
            safe_name = urllib.parse.quote(username)
            safe_goal = urllib.parse.quote(data['goal'])
            safe_bg = urllib.parse.quote(data['bg'])

            new_link = f"{WEBAPP_URL}?week={week}&day={day}&xp={xp}&name={safe_name}&h={data['h']}&w={data['w']}&j={data['j']}&r={data['r']}&bg={safe_bg}&goal={safe_goal}&streak={streak}"

            kb = ReplyKeyboardMarkup(keyboard=[
                [KeyboardButton(text="🔥 Тренироваться", web_app=WebAppInfo(url=new_link))]
            ], resize_keyboard=True)

            await message.answer(
                f"✅ **Профиль сохранен!**\n"
                f"Цель: {data['goal']}\n"
                f"Теперь нажми на новую кнопку ниже 👇",
                reply_markup=kb,
                parse_mode="Markdown"
            )

        # СЦЕНАРИЙ 2: Завершение тренировки (С ЛОГИКОЙ ДАТ)
        elif data.get("status") == "success":
            # 1. Получаем текущие данные даты
            async with db.execute(
                    "SELECT week, day, xp, height, weight, jump, reach, sport_bg, goal, streak, last_active FROM users WHERE user_id = ?",
                    (user_id,)) as cursor:
                week, day, xp, height, weight, jump, reach, sport_bg, goal, streak, last_active = await cursor.fetchone()

            # 2. Логика Стриков (Серий)
            today_str = datetime.now().strftime("%Y-%m-%d")
            new_streak = streak

            if last_active:
                last_date = datetime.strptime(last_active, "%Y-%m-%d")
                delta = (datetime.now() - last_date).days

                if delta == 1:
                    new_streak += 1  # Тренировался вчера -> серия растет
                elif delta > 1:
                    new_streak = 1  # Пропустил день -> сброс на 1
                # Если delta == 0 (уже тренил сегодня), серию не меняем
            else:
                new_streak = 1  # Первая тренировка

            # 3. Логика Программы
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
                "UPDATE users SET week=?, day=?, xp=xp+?, streak=?, last_active=? WHERE user_id=?",
                (new_week, new_day, bonus_xp, new_streak, today_str, user_id))
            await db.commit()

            # 4. Обновляем ссылку
            username = message.from_user.first_name or "Атлет"
            safe_name = urllib.parse.quote(username)
            safe_goal = urllib.parse.quote(goal)
            safe_bg = urllib.parse.quote(sport_bg)
            new_xp = xp + bonus_xp

            new_link = f"{WEBAPP_URL}?week={new_week}&day={new_day}&xp={new_xp}&name={safe_name}&h={height}&w={weight}&j={jump}&r={reach}&bg={safe_bg}&goal={safe_goal}&streak={new_streak}"

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