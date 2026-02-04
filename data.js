const exercisesDB = {
    "Leap Ups": {
        desc: "Выпрыгивания из полуприседа. Руки вверх при прыжке.",
        icon: "🚀",
        // Сюда потом вставишь ссылку на реальную GIF
        gif: "https://dummyimage.com/600x400/222/00f2ff&text=GIF:+Leap+Ups"
    },
    "Step Ups": {
        desc: "Зашагивания на стул/скамью со сменой ног в воздухе.",
        icon: "🪜",
        gif: "https://dummyimage.com/600x400/222/00f2ff&text=GIF:+Step+Ups"
    },
    "Thrust Ups": {
        desc: "Прыжки на прямых ногах, работаем только икрами.",
        icon: "⚡️",
        gif: "https://dummyimage.com/600x400/222/00f2ff&text=GIF:+Thrust+Ups"
    },
    "Burnouts": {
        desc: "Прыжки на носках (2-3 см) максимально быстро.",
        icon: "🔥",
        gif: "https://dummyimage.com/600x400/222/00f2ff&text=GIF:+Burnouts"
    },
    "Squat Hops": {
        desc: "Выпрыгивания из полного приседа (только для 15 недели).",
        icon: "🐸",
        gif: "https://dummyimage.com/600x400/222/00f2ff&text=GIF:+Squat+Hops"
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
        { name: "Leap Ups", sets: 3, reps: 20 },
        { name: "Step Ups", sets: 2, reps: 15 },
        { name: "Thrust Ups", sets: 2, reps: 20 },
        { name: "Burnouts", sets: 1, reps: 150 }
    ],
    3: [
        { name: "Leap Ups", sets: 3, reps: 25 },
        { name: "Step Ups", sets: 2, reps: 15 },
        { name: "Thrust Ups", sets: 2, reps: 25 },
        { name: "Burnouts", sets: 1, reps: 200 }
    ],
    4: [
        { name: "Leap Ups", sets: 3, reps: 30 },
        { name: "Step Ups", sets: 2, reps: 20 },
        { name: "Thrust Ups", sets: 2, reps: 30 },
        { name: "Burnouts", sets: 1, reps: 250 }
    ],
    5: [
        { name: "Leap Ups", sets: 4, reps: 25 },
        { name: "Step Ups", sets: 2, reps: 20 },
        { name: "Thrust Ups", sets: 2, reps: 35 },
        { name: "Burnouts", sets: 1, reps: 300 }
    ],
    6: [
        { name: "Leap Ups", sets: 4, reps: 30 },
        { name: "Step Ups", sets: 2, reps: 25 },
        { name: "Thrust Ups", sets: 2, reps: 40 },
        { name: "Burnouts", sets: 1, reps: 350 }
    ],
    7: [
        { name: "Leap Ups", sets: 4, reps: 35 },
        { name: "Step Ups", sets: 2, reps: 25 },
        { name: "Thrust Ups", sets: 2, reps: 45 },
        { name: "Burnouts", sets: 1, reps: 400 }
    ],
    8: [
        // В Air Alert III 8-я неделя часто идет как отдых или облегченная
        { name: "Leap Ups", sets: 2, reps: 15 },
        { name: "Step Ups", sets: 2, reps: 10 },
        { name: "Thrust Ups", sets: 2, reps: 15 },
        { name: "Burnouts", sets: 1, reps: 100 }
    ],
    9: [
        { name: "Leap Ups", sets: 4, reps: 40 },
        { name: "Step Ups", sets: 2, reps: 30 },
        { name: "Thrust Ups", sets: 2, reps: 50 },
        { name: "Burnouts", sets: 1, reps: 450 }
    ],
    10: [
        { name: "Leap Ups", sets: 4, reps: 45 },
        { name: "Step Ups", sets: 2, reps: 30 },
        { name: "Thrust Ups", sets: 2, reps: 55 },
        { name: "Burnouts", sets: 1, reps: 500 }
    ],
    11: [
        { name: "Leap Ups", sets: 4, reps: 50 },
        { name: "Step Ups", sets: 2, reps: 35 },
        { name: "Thrust Ups", sets: 2, reps: 60 },
        { name: "Burnouts", sets: 1, reps: 550 }
    ],
    12: [
        { name: "Leap Ups", sets: 5, reps: 40 },
        { name: "Step Ups", sets: 2, reps: 35 },
        { name: "Thrust Ups", sets: 2, reps: 70 },
        { name: "Burnouts", sets: 1, reps: 600 }
    ],
    13: [
        { name: "Leap Ups", sets: 5, reps: 45 },
        { name: "Step Ups", sets: 2, reps: 40 },
        { name: "Thrust Ups", sets: 2, reps: 80 },
        { name: "Burnouts", sets: 1, reps: 650 }
    ],
    14: [
        { name: "Leap Ups", sets: 5, reps: 50 },
        { name: "Step Ups", sets: 2, reps: 40 },
        { name: "Thrust Ups", sets: 2, reps: 90 },
        { name: "Burnouts", sets: 1, reps: 700 }
    ],
    15: [
        { name: "Leap Ups", sets: 5, reps: 50 },
        { name: "Step Ups", sets: 2, reps: 50 },
        { name: "Thrust Ups", sets: 2, reps: 100 },
        { name: "Burnouts", sets: 1, reps: 1000 }, // Финальный босс
        { name: "Squat Hops", sets: 4, reps: 15 }
    ]
};