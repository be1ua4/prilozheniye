const exercisesDB = {
    "Leap Ups": {
        desc: "Выпрыгивания из полуприседа. Руки вверх при прыжке.",
        icon: "🚀"
    },
    "Step Ups": {
        desc: "Зашагивания на стул/скамью со сменой ног в воздухе.",
        icon: "🪜"
    },
    "Thrust Ups": {
        desc: "Прыжки на прямых ногах, работаем только икрами.",
        icon: "⚡️"
    },
    "Burnouts": {
        desc: "Прыжки на носках (2-3 см) максимально быстро.",
        icon: "🔥"
    }
};

const programs = {
    1: [
        { name: "Leap Ups", sets: 2, reps: 20 },
        { name: "Step Ups", sets: 2, reps: 10 },
        { name: "Thrust Ups", sets: 2, reps: 15 },
        { name: "Burnouts", sets: 1, reps: 100 }
    ],
    2: [
        { name: "Leap Ups", sets: 3, reps: 25 },
        { name: "Step Ups", sets: 2, reps: 15 },
        { name: "Thrust Ups", sets: 2, reps: 20 },
        { name: "Burnouts", sets: 1, reps: 150 }
    ],
    // ... заполни остальные недели
    15: [
        { name: "Leap Ups", sets: 4, reps: 100 }
    ]
};