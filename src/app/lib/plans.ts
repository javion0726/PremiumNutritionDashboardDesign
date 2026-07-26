// ─── Weekly Workout Plans ──────────────────────────────────────────────────────
// Each plan is split into blocks (phases) rather than one static schedule
// repeated for the plan's whole duration. Within a block, the same exercises
// repeat but suggested weight increases weekly (see engine.ts progressedWeight);
// between blocks, rep ranges and some exercises change to keep training varied
// and to periodize intensity — standard block periodization structure.

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  notes?: string;
}

export interface PlanDay {
  day: string;
  label: string;
  type: "strength" | "conditioning" | "rest" | "mobility" | "power";
  exercises?: Exercise[];
}

export interface Block {
  label: string;        // e.g. "Foundation", "Intensify"
  weeks: [number, number]; // inclusive week range within the plan, 1-indexed
  focus: string;         // short description shown in the UI
  schedule: PlanDay[];    // full 7-slot Mon–Sun week for this block
}

export interface WeeklyPlan {
  id: string;
  name: string;
  tagline: string;
  description: string;
  duration: string;
  daysPerWeek: number;
  totalWeeks: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  blocks: Block[];
}

// ActivePlan type now lives in lib/store.ts (persisted)

export const PLANS: WeeklyPlan[] = [
  {
    id: "fat-loss", name: "Fat Loss", tagline: "Higher volume + conditioning",
    description: "For those looking to drop body fat while maintaining muscle. Combines strength circuits with conditioning finishers to maximize caloric burn and metabolic stress.",
    duration: "4 days/week · 8 weeks", daysPerWeek: 4, totalWeeks: 8, difficulty: "Intermediate",
    blocks: [
      {
        label: "Foundation", weeks: [1, 4], focus: "Higher-rep circuits to build work capacity",
        schedule: [
          { day: "Mon", label: "Upper Circuit", type: "strength", exercises: [
            { name: "Dumbbell Bench Press", sets: 4, reps: "12", weight: "55 lbs" },
            { name: "Dumbbell Row", sets: 4, reps: "12 each", weight: "55 lbs" },
            { name: "Shoulder Press", sets: 3, reps: "12", weight: "40 lbs" },
            { name: "Lat Pulldown", sets: 3, reps: "12", weight: "100 lbs" },
            { name: "Tricep Pushdown", sets: 3, reps: "15", weight: "45 lbs" },
            { name: "Bicep Curl", sets: 3, reps: "15", weight: "30 lbs" },
          ]},
          { day: "Tue", label: "HIIT Conditioning", type: "conditioning", exercises: [
            { name: "Treadmill Sprint Intervals", sets: 8, reps: "30s on / 30s off", notes: "10.0 / 5.0 mph" },
            { name: "Jump Rope", sets: 4, reps: "60 sec" },
            { name: "Burpees", sets: 4, reps: "15 reps" },
            { name: "Mountain Climbers", sets: 4, reps: "30 sec" },
            { name: "Plank Hold", sets: 3, reps: "45 sec" },
          ]},
          { day: "Wed", label: "Rest", type: "rest" },
          { day: "Thu", label: "Lower Circuit", type: "strength", exercises: [
            { name: "Barbell Squat", sets: 4, reps: "12", weight: "135 lbs" },
            { name: "Romanian Deadlift", sets: 4, reps: "12", weight: "115 lbs" },
            { name: "Leg Press", sets: 3, reps: "15", weight: "180 lbs" },
            { name: "Walking Lunge", sets: 3, reps: "20 steps", weight: "25 lbs DBs" },
            { name: "Calf Raise", sets: 4, reps: "20", weight: "Bodyweight" },
            { name: "Cable Crunch", sets: 3, reps: "20", weight: "50 lbs" },
          ]},
          { day: "Fri", label: "Full Body + Core", type: "strength", exercises: [
            { name: "Deadlift", sets: 3, reps: "10", weight: "155 lbs" },
            { name: "Push-up", sets: 3, reps: "20 reps" },
            { name: "Kettlebell Swing", sets: 4, reps: "20", weight: "35 lbs" },
            { name: "Plank Hold", sets: 3, reps: "60 sec" },
            { name: "Russian Twist", sets: 3, reps: "20", weight: "25 lbs" },
            { name: "Reverse Crunch", sets: 3, reps: "15 reps" },
          ]},
          { day: "Sat", label: "Rest", type: "rest" },
          { day: "Sun", label: "Rest", type: "rest" },
        ],
      },
      {
        label: "Intensify", weeks: [5, 8], focus: "Fewer reps, heavier loads, new movements to keep burning",
        schedule: [
          { day: "Mon", label: "Upper Circuit", type: "strength", exercises: [
            { name: "Incline Dumbbell Press", sets: 4, reps: "10", weight: "60 lbs" },
            { name: "Chest-Supported Row", sets: 4, reps: "10 each", weight: "60 lbs" },
            { name: "Arnold Press", sets: 3, reps: "10", weight: "45 lbs" },
            { name: "Cable Row", sets: 3, reps: "10", weight: "110 lbs" },
            { name: "Rope Pushdown", sets: 3, reps: "12", weight: "50 lbs" },
            { name: "Hammer Curl", sets: 3, reps: "12", weight: "30 lbs" },
          ]},
          { day: "Tue", label: "HIIT Conditioning", type: "conditioning", exercises: [
            { name: "Treadmill Sprint Intervals", sets: 10, reps: "30s on / 30s off", notes: "10.5 / 5.0 mph" },
            { name: "Battle Ropes", sets: 5, reps: "30 sec" },
            { name: "Box Jump", sets: 4, reps: "10 reps" },
            { name: "Kettlebell Swing", sets: 4, reps: "20", weight: "35 lbs" },
            { name: "Plank Hold", sets: 3, reps: "60 sec" },
          ]},
          { day: "Wed", label: "Rest", type: "rest" },
          { day: "Thu", label: "Lower Circuit", type: "strength", exercises: [
            { name: "Front Squat", sets: 4, reps: "10", weight: "115 lbs" },
            { name: "Bulgarian Split Squat", sets: 3, reps: "10 each", weight: "30 lbs DBs" },
            { name: "Leg Press", sets: 4, reps: "12", weight: "210 lbs" },
            { name: "Leg Curl", sets: 3, reps: "12", weight: "85 lbs" },
            { name: "Calf Raise", sets: 4, reps: "20", weight: "25 lbs" },
            { name: "Hanging Knee Raise", sets: 3, reps: "15 reps" },
          ]},
          { day: "Fri", label: "Full Body + Core", type: "strength", exercises: [
            { name: "Deadlift", sets: 4, reps: "8", weight: "185 lbs" },
            { name: "Weighted Push-up", sets: 3, reps: "15 reps" },
            { name: "Kettlebell Swing", sets: 4, reps: "25", weight: "40 lbs" },
            { name: "Side Plank", sets: 3, reps: "45 sec each" },
            { name: "Cable Woodchopper", sets: 3, reps: "15 each", weight: "30 lbs" },
            { name: "Reverse Crunch", sets: 3, reps: "20 reps" },
          ]},
          { day: "Sat", label: "Rest", type: "rest" },
          { day: "Sun", label: "Rest", type: "rest" },
        ],
      },
    ],
  },
  {
    id: "muscle-building", name: "Muscle Building", tagline: "Push / Pull / Legs split",
    description: "Classic PPL split for maximizing hypertrophy. High volume, moderate loads, and progressive overload across 5 training days with deliberate rest placement.",
    duration: "5 days/week · 12 weeks", daysPerWeek: 5, totalWeeks: 12, difficulty: "Intermediate",
    blocks: [
      {
        label: "Hypertrophy Base", weeks: [1, 4], focus: "8–12 rep range to build muscular foundation",
        schedule: [
          { day: "Mon", label: "Push A", type: "strength", exercises: [
            { name: "Barbell Bench Press", sets: 4, reps: "8–10", weight: "185 lbs" },
            { name: "Incline DB Press", sets: 3, reps: "10–12", weight: "65 lbs" },
            { name: "Overhead Press", sets: 4, reps: "8", weight: "115 lbs" },
            { name: "Cable Lateral Raise", sets: 4, reps: "15", weight: "15 lbs" },
            { name: "Tricep Pushdown", sets: 3, reps: "12–15", weight: "55 lbs" },
            { name: "Overhead Tricep Extension", sets: 3, reps: "12", weight: "65 lbs" },
          ]},
          { day: "Tue", label: "Pull A", type: "strength", exercises: [
            { name: "Deadlift", sets: 4, reps: "6", weight: "275 lbs" },
            { name: "Barbell Row", sets: 4, reps: "8", weight: "155 lbs" },
            { name: "Lat Pulldown", sets: 3, reps: "10–12", weight: "130 lbs" },
            { name: "Face Pull", sets: 4, reps: "20", weight: "40 lbs" },
            { name: "Barbell Curl", sets: 3, reps: "10", weight: "75 lbs" },
            { name: "Hammer Curl", sets: 3, reps: "12", weight: "35 lbs" },
          ]},
          { day: "Wed", label: "Legs A", type: "strength", exercises: [
            { name: "Back Squat", sets: 4, reps: "8", weight: "225 lbs" },
            { name: "Leg Press", sets: 4, reps: "12", weight: "270 lbs" },
            { name: "Romanian Deadlift", sets: 3, reps: "10", weight: "155 lbs" },
            { name: "Leg Curl", sets: 3, reps: "12", weight: "85 lbs" },
            { name: "Calf Raise", sets: 5, reps: "15", weight: "Bodyweight" },
          ]},
          { day: "Thu", label: "Rest", type: "rest" },
          { day: "Fri", label: "Push B", type: "strength", exercises: [
            { name: "Incline Bench Press", sets: 4, reps: "8–10", weight: "165 lbs" },
            { name: "Cable Fly", sets: 3, reps: "12", weight: "35 lbs" },
            { name: "Arnold Press", sets: 4, reps: "10", weight: "50 lbs" },
            { name: "Rear Delt Fly", sets: 3, reps: "15", weight: "20 lbs" },
            { name: "Tricep Dip", sets: 3, reps: "12 reps" },
            { name: "Close-Grip Bench", sets: 3, reps: "10", weight: "145 lbs" },
          ]},
          { day: "Sat", label: "Pull B", type: "strength", exercises: [
            { name: "Weighted Pull-up", sets: 4, reps: "6–8", weight: "+25 lbs" },
            { name: "Cable Row", sets: 4, reps: "10", weight: "120 lbs" },
            { name: "Chest-Supported Row", sets: 3, reps: "12", weight: "95 lbs" },
            { name: "Straight-Arm Pulldown", sets: 3, reps: "15", weight: "50 lbs" },
            { name: "Incline Curl", sets: 3, reps: "12", weight: "30 lbs" },
          ]},
          { day: "Sun", label: "Rest", type: "rest" },
        ],
      },
      {
        label: "Volume Push", weeks: [5, 8], focus: "Added volume and fresh accessory movements",
        schedule: [
          { day: "Mon", label: "Push A", type: "strength", exercises: [
            { name: "Barbell Bench Press", sets: 5, reps: "8", weight: "195 lbs" },
            { name: "Flat DB Fly", sets: 3, reps: "12", weight: "35 lbs" },
            { name: "Seated DB Shoulder Press", sets: 4, reps: "10", weight: "50 lbs" },
            { name: "Machine Lateral Raise", sets: 4, reps: "15", weight: "30 lbs" },
            { name: "Rope Pushdown", sets: 4, reps: "12", weight: "60 lbs" },
            { name: "Skull Crusher", sets: 3, reps: "12", weight: "60 lbs" },
          ]},
          { day: "Tue", label: "Pull A", type: "strength", exercises: [
            { name: "Deadlift", sets: 5, reps: "5", weight: "295 lbs" },
            { name: "Pendlay Row", sets: 4, reps: "8", weight: "165 lbs" },
            { name: "Seated Cable Row", sets: 4, reps: "10", weight: "140 lbs" },
            { name: "Cable Face Pull", sets: 4, reps: "20", weight: "45 lbs" },
            { name: "Preacher Curl", sets: 3, reps: "10", weight: "60 lbs" },
            { name: "Cable Hammer Curl", sets: 3, reps: "12", weight: "40 lbs" },
          ]},
          { day: "Wed", label: "Legs A", type: "strength", exercises: [
            { name: "Front Squat", sets: 4, reps: "8", weight: "175 lbs" },
            { name: "Hack Squat", sets: 4, reps: "12", weight: "230 lbs" },
            { name: "Stiff-Leg Deadlift", sets: 4, reps: "10", weight: "165 lbs" },
            { name: "Seated Leg Curl", sets: 4, reps: "12", weight: "95 lbs" },
            { name: "Seated Calf Raise", sets: 5, reps: "15", weight: "70 lbs" },
          ]},
          { day: "Thu", label: "Rest", type: "rest" },
          { day: "Fri", label: "Push B", type: "strength", exercises: [
            { name: "Decline Bench Press", sets: 4, reps: "10", weight: "175 lbs" },
            { name: "Pec Deck", sets: 3, reps: "15", weight: "90 lbs" },
            { name: "Push Press", sets: 4, reps: "6", weight: "125 lbs" },
            { name: "Reverse Pec Deck", sets: 3, reps: "15", weight: "60 lbs" },
            { name: "Weighted Dip", sets: 3, reps: "10", weight: "+15 lbs" },
            { name: "JM Press", sets: 3, reps: "10", weight: "115 lbs" },
          ]},
          { day: "Sat", label: "Pull B", type: "strength", exercises: [
            { name: "Weighted Pull-up", sets: 5, reps: "5–6", weight: "+35 lbs" },
            { name: "T-Bar Row", sets: 4, reps: "10", weight: "90 lbs" },
            { name: "Single-Arm DB Row", sets: 3, reps: "10 each", weight: "70 lbs" },
            { name: "Rope Face Pull", sets: 3, reps: "18", weight: "45 lbs" },
            { name: "Spider Curl", sets: 3, reps: "12", weight: "40 lbs" },
          ]},
          { day: "Sun", label: "Rest", type: "rest" },
        ],
      },
      {
        label: "Peak Intensity", weeks: [9, 12], focus: "Lower reps, heavier top sets to peak strength and size",
        schedule: [
          { day: "Mon", label: "Push A", type: "strength", exercises: [
            { name: "Barbell Bench Press", sets: 5, reps: "5–6", weight: "215 lbs" },
            { name: "Weighted Dip", sets: 4, reps: "8", weight: "+25 lbs" },
            { name: "Standing Barbell Press", sets: 5, reps: "6", weight: "125 lbs" },
            { name: "Cable Lateral Raise", sets: 4, reps: "12", weight: "20 lbs" },
            { name: "Close-Grip Bench", sets: 4, reps: "8", weight: "155 lbs" },
            { name: "Overhead Tricep Extension", sets: 3, reps: "10", weight: "75 lbs" },
          ]},
          { day: "Tue", label: "Pull A", type: "strength", exercises: [
            { name: "Deadlift", sets: 5, reps: "3–4", weight: "315 lbs" },
            { name: "Barbell Row", sets: 5, reps: "6", weight: "175 lbs" },
            { name: "Weighted Pull-up", sets: 4, reps: "6", weight: "+40 lbs" },
            { name: "Face Pull", sets: 4, reps: "18", weight: "45 lbs" },
            { name: "Barbell Curl", sets: 4, reps: "8", weight: "85 lbs" },
          ]},
          { day: "Wed", label: "Legs A", type: "strength", exercises: [
            { name: "Back Squat", sets: 5, reps: "5", weight: "255 lbs" },
            { name: "Leg Press", sets: 4, reps: "10", weight: "310 lbs" },
            { name: "Romanian Deadlift", sets: 4, reps: "8", weight: "185 lbs" },
            { name: "Lying Leg Curl", sets: 4, reps: "10", weight: "95 lbs" },
            { name: "Standing Calf Raise", sets: 5, reps: "12", weight: "Bodyweight" },
          ]},
          { day: "Thu", label: "Rest", type: "rest" },
          { day: "Fri", label: "Push B", type: "strength", exercises: [
            { name: "Incline Bench Press", sets: 5, reps: "6", weight: "185 lbs" },
            { name: "Cable Fly", sets: 3, reps: "12", weight: "40 lbs" },
            { name: "Arnold Press", sets: 4, reps: "8", weight: "60 lbs" },
            { name: "Rear Delt Fly", sets: 3, reps: "15", weight: "25 lbs" },
            { name: "Weighted Tricep Dip", sets: 4, reps: "8", weight: "+20 lbs" },
          ]},
          { day: "Sat", label: "Pull B", type: "strength", exercises: [
            { name: "Weighted Pull-up", sets: 5, reps: "4–5", weight: "+45 lbs" },
            { name: "Pendlay Row", sets: 4, reps: "6", weight: "175 lbs" },
            { name: "Chest-Supported Row", sets: 3, reps: "10", weight: "105 lbs" },
            { name: "Straight-Arm Pulldown", sets: 3, reps: "12", weight: "55 lbs" },
            { name: "Incline Curl", sets: 3, reps: "10", weight: "35 lbs" },
          ]},
          { day: "Sun", label: "Rest", type: "rest" },
        ],
      },
    ],
  },
  {
    id: "strength", name: "Strength", tagline: "Low-rep compound focus",
    description: "Built around the big four lifts. Develops maximal strength through progressive overload with heavy compound movements and strategic accessory work.",
    duration: "4 days/week · 12 weeks", daysPerWeek: 4, totalWeeks: 12, difficulty: "Advanced",
    blocks: [
      {
        label: "Base Strength", weeks: [1, 4], focus: "5-rep sets to rebuild working weights",
        schedule: [
          { day: "Mon", label: "Squat Focus", type: "strength", exercises: [
            { name: "Back Squat", sets: 5, reps: "5", weight: "265 lbs", notes: "Work up to top set" },
            { name: "Front Squat", sets: 3, reps: "3", weight: "185 lbs" },
            { name: "Bulgarian Split Squat", sets: 3, reps: "6 each", weight: "45 lbs DBs" },
            { name: "Good Morning", sets: 3, reps: "8", weight: "95 lbs" },
            { name: "Ab Wheel", sets: 3, reps: "10 reps" },
          ]},
          { day: "Tue", label: "Rest", type: "rest" },
          { day: "Wed", label: "Bench Focus", type: "strength", exercises: [
            { name: "Barbell Bench Press", sets: 5, reps: "5", weight: "235 lbs" },
            { name: "Close-Grip Bench Press", sets: 3, reps: "5", weight: "185 lbs" },
            { name: "DB Floor Press", sets: 3, reps: "8", weight: "70 lbs" },
            { name: "Weighted Tricep Dip", sets: 3, reps: "8", weight: "+35 lbs" },
            { name: "Face Pull", sets: 4, reps: "20", weight: "40 lbs" },
          ]},
          { day: "Thu", label: "Rest", type: "rest" },
          { day: "Fri", label: "Deadlift Focus", type: "strength", exercises: [
            { name: "Conventional Deadlift", sets: 5, reps: "3", weight: "335 lbs" },
            { name: "Sumo Deadlift", sets: 3, reps: "3", weight: "295 lbs" },
            { name: "Rack Pull", sets: 3, reps: "3", weight: "365 lbs" },
            { name: "Romanian Deadlift", sets: 3, reps: "8", weight: "185 lbs" },
            { name: "Farmer Carry", sets: 3, reps: "40 meters", weight: "70 lbs DBs" },
          ]},
          { day: "Sat", label: "Overhead + Accessories", type: "strength", exercises: [
            { name: "Strict Overhead Press", sets: 5, reps: "5", weight: "145 lbs" },
            { name: "Push Press", sets: 3, reps: "3", weight: "165 lbs" },
            { name: "Lateral Raise", sets: 4, reps: "15", weight: "20 lbs" },
            { name: "Weighted Pull-up", sets: 4, reps: "5", weight: "+45 lbs" },
            { name: "Band Pull-Apart", sets: 4, reps: "20 reps" },
          ]},
          { day: "Sun", label: "Rest", type: "rest" },
        ],
      },
      {
        label: "Intensification", weeks: [5, 8], focus: "Triples — heavier loads, less volume",
        schedule: [
          { day: "Mon", label: "Squat Focus", type: "strength", exercises: [
            { name: "Back Squat", sets: 5, reps: "3", weight: "285 lbs", notes: "Work up to top set" },
            { name: "Paused Squat", sets: 3, reps: "3", weight: "225 lbs" },
            { name: "Walking Lunge", sets: 3, reps: "8 each", weight: "55 lbs DBs" },
            { name: "Romanian Deadlift", sets: 3, reps: "6", weight: "185 lbs" },
            { name: "Hanging Leg Raise", sets: 3, reps: "10 reps" },
          ]},
          { day: "Tue", label: "Rest", type: "rest" },
          { day: "Wed", label: "Bench Focus", type: "strength", exercises: [
            { name: "Barbell Bench Press", sets: 5, reps: "3", weight: "255 lbs" },
            { name: "Spoto Press", sets: 3, reps: "3", weight: "195 lbs" },
            { name: "DB Incline Press", sets: 3, reps: "6", weight: "80 lbs" },
            { name: "Weighted Tricep Dip", sets: 4, reps: "6", weight: "+45 lbs" },
            { name: "Chest-Supported Row", sets: 4, reps: "10", weight: "100 lbs" },
          ]},
          { day: "Thu", label: "Rest", type: "rest" },
          { day: "Fri", label: "Deadlift Focus", type: "strength", exercises: [
            { name: "Conventional Deadlift", sets: 5, reps: "2", weight: "365 lbs" },
            { name: "Deficit Deadlift", sets: 3, reps: "3", weight: "295 lbs" },
            { name: "Rack Pull", sets: 3, reps: "2", weight: "395 lbs" },
            { name: "Good Morning", sets: 3, reps: "6", weight: "125 lbs" },
            { name: "Farmer Carry", sets: 3, reps: "50 meters", weight: "85 lbs DBs" },
          ]},
          { day: "Sat", label: "Overhead + Accessories", type: "strength", exercises: [
            { name: "Strict Overhead Press", sets: 5, reps: "3", weight: "165 lbs" },
            { name: "Push Press", sets: 4, reps: "2", weight: "185 lbs" },
            { name: "Cuban Press", sets: 3, reps: "10", weight: "20 lbs" },
            { name: "Weighted Pull-up", sets: 4, reps: "4", weight: "+55 lbs" },
            { name: "Band Pull-Apart", sets: 4, reps: "20 reps" },
          ]},
          { day: "Sun", label: "Rest", type: "rest" },
        ],
      },
      {
        label: "Peak", weeks: [9, 12], focus: "Singles and near-max attempts before a planned deload",
        schedule: [
          { day: "Mon", label: "Squat Focus", type: "strength", exercises: [
            { name: "Back Squat", sets: 5, reps: "1–2", weight: "305 lbs", notes: "Build to a heavy top single" },
            { name: "Pause Front Squat", sets: 3, reps: "3", weight: "195 lbs" },
            { name: "Leg Press", sets: 3, reps: "8", weight: "310 lbs" },
            { name: "Ab Wheel", sets: 3, reps: "12 reps" },
          ]},
          { day: "Tue", label: "Rest", type: "rest" },
          { day: "Wed", label: "Bench Focus", type: "strength", exercises: [
            { name: "Barbell Bench Press", sets: 5, reps: "1–2", weight: "275 lbs", notes: "Build to a heavy top single" },
            { name: "Board Press", sets: 3, reps: "3", weight: "225 lbs" },
            { name: "DB Floor Press", sets: 3, reps: "6", weight: "85 lbs" },
            { name: "Face Pull", sets: 4, reps: "18", weight: "45 lbs" },
          ]},
          { day: "Thu", label: "Rest", type: "rest" },
          { day: "Fri", label: "Deadlift Focus", type: "strength", exercises: [
            { name: "Conventional Deadlift", sets: 5, reps: "1", weight: "395 lbs", notes: "Build to a heavy top single" },
            { name: "Block Pull", sets: 3, reps: "2", weight: "365 lbs" },
            { name: "Romanian Deadlift", sets: 3, reps: "6", weight: "195 lbs" },
            { name: "Farmer Carry", sets: 3, reps: "50 meters", weight: "95 lbs DBs" },
          ]},
          { day: "Sat", label: "Overhead + Accessories", type: "strength", exercises: [
            { name: "Strict Overhead Press", sets: 5, reps: "1–2", weight: "180 lbs", notes: "Build to a heavy top single" },
            { name: "Push Press", sets: 3, reps: "2", weight: "195 lbs" },
            { name: "Weighted Pull-up", sets: 4, reps: "3", weight: "+60 lbs" },
            { name: "Band Pull-Apart", sets: 3, reps: "20 reps" },
          ]},
          { day: "Sun", label: "Rest", type: "rest" },
        ],
      },
    ],
  },
  {
    id: "beginner", name: "Beginner Full Body", tagline: "3 days/week foundational movements",
    description: "Perfect starting point for new lifters. Builds a solid foundation of strength and movement patterns with full-body sessions and ample recovery time.",
    duration: "3 days/week · 8 weeks", daysPerWeek: 3, totalWeeks: 8, difficulty: "Beginner",
    blocks: [
      {
        label: "Learn the Basics", weeks: [1, 4], focus: "Master the core movement patterns with light, manageable loads",
        schedule: [
          { day: "Mon", label: "Full Body A", type: "strength", exercises: [
            { name: "Goblet Squat", sets: 3, reps: "10", weight: "25 lbs KB" },
            { name: "Push-up", sets: 3, reps: "8–10 reps" },
            { name: "Dumbbell Row", sets: 3, reps: "10 each", weight: "25 lbs" },
            { name: "Romanian Deadlift", sets: 3, reps: "10", weight: "65 lbs" },
            { name: "Plank Hold", sets: 3, reps: "30 sec" },
          ]},
          { day: "Tue", label: "Rest", type: "rest" },
          { day: "Wed", label: "Full Body B", type: "strength", exercises: [
            { name: "Leg Press", sets: 3, reps: "12", weight: "90 lbs" },
            { name: "Incline DB Press", sets: 3, reps: "10", weight: "30 lbs" },
            { name: "Lat Pulldown", sets: 3, reps: "10", weight: "65 lbs" },
            { name: "Dumbbell Curl", sets: 2, reps: "12", weight: "20 lbs" },
            { name: "Side Plank", sets: 2, reps: "20 sec each" },
          ]},
          { day: "Thu", label: "Rest", type: "rest" },
          { day: "Fri", label: "Full Body C", type: "strength", exercises: [
            { name: "Dumbbell Squat", sets: 3, reps: "12", weight: "25 lbs DBs" },
            { name: "DB Bench Press", sets: 3, reps: "10", weight: "35 lbs" },
            { name: "Seated Cable Row", sets: 3, reps: "10", weight: "70 lbs" },
            { name: "Hip Thrust", sets: 3, reps: "12", weight: "Bodyweight" },
            { name: "Dead Bug", sets: 2, reps: "10 each" },
          ]},
          { day: "Sat", label: "Rest", type: "rest" },
          { day: "Sun", label: "Rest", type: "rest" },
        ],
      },
      {
        label: "Build Confidence", weeks: [5, 8], focus: "Heavier loads and a few new movements now that form is solid",
        schedule: [
          { day: "Mon", label: "Full Body A", type: "strength", exercises: [
            { name: "Barbell Squat", sets: 3, reps: "10", weight: "65 lbs" },
            { name: "Incline Push-up", sets: 3, reps: "12 reps" },
            { name: "Barbell Row", sets: 3, reps: "10", weight: "55 lbs" },
            { name: "Romanian Deadlift", sets: 3, reps: "10", weight: "85 lbs" },
            { name: "Plank Hold", sets: 3, reps: "45 sec" },
          ]},
          { day: "Tue", label: "Rest", type: "rest" },
          { day: "Wed", label: "Full Body B", type: "strength", exercises: [
            { name: "Leg Press", sets: 3, reps: "12", weight: "120 lbs" },
            { name: "Flat DB Bench Press", sets: 3, reps: "10", weight: "40 lbs" },
            { name: "Lat Pulldown", sets: 3, reps: "10", weight: "80 lbs" },
            { name: "Hammer Curl", sets: 3, reps: "12", weight: "25 lbs" },
            { name: "Side Plank", sets: 3, reps: "30 sec each" },
          ]},
          { day: "Thu", label: "Rest", type: "rest" },
          { day: "Fri", label: "Full Body C", type: "strength", exercises: [
            { name: "Dumbbell Lunge", sets: 3, reps: "10 each", weight: "30 lbs DBs" },
            { name: "DB Shoulder Press", sets: 3, reps: "10", weight: "25 lbs" },
            { name: "Seated Cable Row", sets: 3, reps: "12", weight: "85 lbs" },
            { name: "Hip Thrust", sets: 3, reps: "15", weight: "45 lbs" },
            { name: "Bird Dog", sets: 3, reps: "10 each" },
          ]},
          { day: "Sat", label: "Rest", type: "rest" },
          { day: "Sun", label: "Rest", type: "rest" },
        ],
      },
    ],
  },
  {
    id: "athletic", name: "Athletic Performance", tagline: "Power + mobility 5 days/week",
    description: "Designed for athletes seeking explosive power, speed, and functional mobility. Combines Olympic lift derivatives with strength and conditioning work.",
    duration: "5 days/week · 10 weeks", daysPerWeek: 5, totalWeeks: 10, difficulty: "Advanced",
    blocks: [
      {
        label: "Power Foundation", weeks: [1, 5], focus: "Build explosive base strength and movement quality",
        schedule: [
          { day: "Mon", label: "Power Lower", type: "power", exercises: [
            { name: "Power Clean", sets: 5, reps: "3", weight: "185 lbs", notes: "Focus on bar speed" },
            { name: "Box Jump", sets: 5, reps: "5", notes: "30-inch box" },
            { name: "Back Squat", sets: 4, reps: "4", weight: "245 lbs" },
            { name: "Hang Pull", sets: 3, reps: "4", weight: "195 lbs" },
            { name: "Sprint", sets: 6, reps: "40 meters" },
          ]},
          { day: "Tue", label: "Upper Strength", type: "strength", exercises: [
            { name: "Barbell Bench Press", sets: 4, reps: "5", weight: "215 lbs" },
            { name: "Weighted Pull-up", sets: 4, reps: "5", weight: "+35 lbs" },
            { name: "Push Press", sets: 4, reps: "4", weight: "155 lbs" },
            { name: "Pendlay Row", sets: 3, reps: "6", weight: "155 lbs" },
            { name: "Face Pull", sets: 4, reps: "20", weight: "40 lbs" },
          ]},
          { day: "Wed", label: "Mobility + Recovery", type: "mobility", exercises: [
            { name: "Foam Rolling", sets: 1, reps: "10 min", notes: "Full body — prioritize hips and lats" },
            { name: "Hip 90/90 Stretch", sets: 3, reps: "60 sec each" },
            { name: "Thoracic Rotation", sets: 2, reps: "10 each" },
            { name: "Band Pull-Apart", sets: 3, reps: "20 reps" },
            { name: "Couch Stretch", sets: 2, reps: "90 sec each" },
          ]},
          { day: "Thu", label: "Power Upper", type: "power", exercises: [
            { name: "Push Jerk", sets: 4, reps: "3", weight: "175 lbs" },
            { name: "Med Ball Chest Throw", sets: 5, reps: "5", notes: "12 lb ball" },
            { name: "Incline DB Press", sets: 3, reps: "8", weight: "70 lbs" },
            { name: "Cable Face Pull", sets: 4, reps: "15", weight: "40 lbs" },
            { name: "Plyometric Push-up", sets: 4, reps: "6 reps" },
          ]},
          { day: "Fri", label: "Lower + Conditioning", type: "conditioning", exercises: [
            { name: "Romanian Deadlift", sets: 4, reps: "5", weight: "225 lbs" },
            { name: "Back Squat", sets: 3, reps: "5", weight: "235 lbs" },
            { name: "Lateral Bound", sets: 4, reps: "8 each" },
            { name: "Sled Push", sets: 4, reps: "20 meters", notes: "90 lbs load" },
            { name: "Jump Rope", sets: 3, reps: "90 sec" },
          ]},
          { day: "Sat", label: "Rest", type: "rest" },
          { day: "Sun", label: "Rest", type: "rest" },
        ],
      },
      {
        label: "Peak Power", weeks: [6, 10], focus: "Heavier loads, more advanced power variations",
        schedule: [
          { day: "Mon", label: "Power Lower", type: "power", exercises: [
            { name: "Power Snatch", sets: 5, reps: "2", weight: "135 lbs", notes: "Focus on bar speed" },
            { name: "Depth Jump", sets: 5, reps: "5", notes: "24-inch box" },
            { name: "Back Squat", sets: 4, reps: "3", weight: "275 lbs" },
            { name: "Clean Pull", sets: 3, reps: "3", weight: "225 lbs" },
            { name: "Sprint", sets: 6, reps: "60 meters" },
          ]},
          { day: "Tue", label: "Upper Strength", type: "strength", exercises: [
            { name: "Barbell Bench Press", sets: 5, reps: "3", weight: "245 lbs" },
            { name: "Weighted Pull-up", sets: 4, reps: "3", weight: "+50 lbs" },
            { name: "Push Press", sets: 4, reps: "2", weight: "185 lbs" },
            { name: "Chest-Supported Row", sets: 3, reps: "6", weight: "115 lbs" },
            { name: "Face Pull", sets: 4, reps: "18", weight: "45 lbs" },
          ]},
          { day: "Wed", label: "Mobility + Recovery", type: "mobility", exercises: [
            { name: "Foam Rolling", sets: 1, reps: "10 min", notes: "Full body — prioritize hips and lats" },
            { name: "90/90 Hip Switch", sets: 3, reps: "10 each" },
            { name: "Thoracic Rotation", sets: 2, reps: "10 each" },
            { name: "Band Pull-Apart", sets: 3, reps: "20 reps" },
            { name: "Pigeon Stretch", sets: 2, reps: "90 sec each" },
          ]},
          { day: "Thu", label: "Power Upper", type: "power", exercises: [
            { name: "Split Jerk", sets: 5, reps: "2", weight: "195 lbs" },
            { name: "Med Ball Rotational Throw", sets: 5, reps: "5 each", notes: "12 lb ball" },
            { name: "Incline DB Press", sets: 4, reps: "6", weight: "80 lbs" },
            { name: "Cable Face Pull", sets: 4, reps: "15", weight: "45 lbs" },
            { name: "Clap Push-up", sets: 4, reps: "5 reps" },
          ]},
          { day: "Fri", label: "Lower + Conditioning", type: "conditioning", exercises: [
            { name: "Romanian Deadlift", sets: 4, reps: "4", weight: "255 lbs" },
            { name: "Front Squat", sets: 3, reps: "4", weight: "195 lbs" },
            { name: "Broad Jump", sets: 5, reps: "5 reps" },
            { name: "Sled Push", sets: 4, reps: "25 meters", notes: "110 lbs load" },
            { name: "Jump Rope", sets: 3, reps: "2 min" },
          ]},
          { day: "Sat", label: "Rest", type: "rest" },
          { day: "Sun", label: "Rest", type: "rest" },
        ],
      },
    ],
  },
];
