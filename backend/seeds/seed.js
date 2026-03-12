require("dotenv").config();
const mongoose = require("mongoose");
const Quote = require("../models/Quote");
const { DefaultTask } = require("../models/Task");
const { DefaultComfort } = require("../models/Comfort");
const dns = require("dns")
dns.setServers(["1.1.1.1"])
const MONGO_URI = process.env.MONGO_URI

const quotes = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", category: "motivation" },
  { text: "You don't have to control your thoughts. You just have to stop letting them control you.", author: "Dan Millman", category: "mindfulness" },
  { text: "Your mind is a powerful thing. When you fill it with positive thoughts, your life will start to change.", author: "Unknown", category: "motivation" },
  { text: "The present moment is the only moment available to us, and it is the door to all moments.", author: "Thich Nhat Hanh", category: "mindfulness" },
  { text: "Where focus goes, energy flows.", author: "Tony Robbins", category: "focus" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln", category: "productivity" },
  { text: "A wandering mind is an unhappy mind. Focus on the now.", author: "Harvard Study", category: "focus" },
  { text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.", author: "Buddha", category: "mindfulness" },
  { text: "You are not your thoughts. You are the one who observes them.", author: "Unknown", category: "mindfulness" },
  { text: "Every moment is a fresh beginning.", author: "T.S. Eliot", category: "motivation" },
  { text: "What you resist, persists. What you accept, dissolves.", author: "Carl Jung", category: "mindfulness" },
  { text: "Small steps every day lead to big changes over time.", author: "Unknown", category: "productivity" },
  { text: "The mind is everything. What you think, you become.", author: "Buddha", category: "motivation" },
  { text: "Real change, enduring change, happens one step at a time.", author: "Ruth Bader Ginsburg", category: "motivation" },
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius", category: "focus" },
];

const defaultTasks = [
  { title: "Wake up early morning", description: "Try to wake up early morning and let some fresh air on your face. ", icon: "🌞", order: 1 },
  { title: "Meditate", description: "Medidate for at least 5 mins . Try to meditate more than yesterday", icon: "🧘‍♂️", order: 2 },
  { title: "Morning Grounding Exercise", description: "Inhale for 4 counts, hold for 4 counts, exhale for 4 counts. Repeat 4 times to calm your nervous system.", icon: "🧘", order: 3 },
  { title: "Move Your Body", description: "Take atleast 10-minute walk or stretch ", icon: "🚶", order: 4 },
  { title: "Limit Screen Time", description: "Take at least one 30-minute break from all screens today.", icon: "📵", order: 5 },
  { title: "Connect With Someone", description: "Have a genuine conversation with a friend or family member.", icon: "🤝", order: 6 },
  { title: "Hydrate", description: "Drink a full glass of water to stay present and energized.", icon: "💧", order: 7 },
  { title: "5-Minute Mindfulness", description: "Sit quietly and focus on not interacting with your thoughts", icon: "🧘", order: 8 },
  { title: "Read", description: "Read few pages of a book .", icon: "📖", order: 9 },
  { title: "Evening Reflection", description: "Spend 5 minutes reviewing your day and acknowledging your progress.", icon: "🌙", order: 10 },
  { title: "Write Your Intention", description: "Write one clear intention or goal for tomorrow before sleeping ", icon: "✍️", order: 11 },
];

const defaultComforts = [
  { title: "Breathing Excercise", description: "Inhale for 4 counts, hold for 4 counts, exhale for 4 counts. Repeat 4 times to calm your nervous system.", icon: "🧘", category: "breathing", order: 1 },
  { title: "5-4-3-2-1 Grounding", description: "Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.", icon: "🌍", category: "grounding", order: 2 },
  { title: "Cold Water Splash", description: "Splash cold water on your face . Activates the dive reflex and calms anxiety quickly.", icon: "🌊", category: "grounding", order: 3 },
  { title: "Take a Short Walk", description: "Step outside for 5-10 minutes. Walking naturally interrupts daydream cycles by engaging your senses.", icon: "🚶", category: "movement", order: 4 },
  { title: "Stretch & Release", description: "Do a simple 5-minute full-body stretch. Focus on how each muscle feels to stay present in your body.", icon: "🤸", category: "movement", order: 5 },
  { title: "Doodle or Draw", description: "Grab a pen and draw freely without judgment. Creative expression grounds wandering thoughts.", icon: "🎨", category: "creativity", order: 6 },
  { title: "Call a Friend", description: "A 5-minute real conversation with someone you trust can quickly pull you out of a daydream spiral.", icon: "📞", category: "social", order: 7 },
  { title: "Body Scan Meditation", description: "Close your eyes and slowly scan from head to toe. Notice any sensations without judgment.", icon: "🧘", category: "mindfulness", order: 8 },
  { title: "Listen to Your Surroundings", description: "Close your eyes and count all the distinct sounds you can hear around you. A powerful presence anchor.", icon: "👂", category: "grounding", order: 9 },
  { title: "Change Your Environment", description: "Move to a different room, step outside, clean or rearrange your workspace. New sensory input breaks mental loops.", icon: "🔄", category: "distraction", order: 10 },
  { title: "Listen to your favourite playlist (happy / uplifting music) ", description: "Open youtube listen to your favourite music", icon: "🎶", category: "distraction", order: 11 },
  { title: "Dance It Out", description: "Play your favorite song and dance freely for a few minutes. Let your body move without worrying about how it looks.", icon: "💃", category: "movement", order: 12 } ,
  { title: "Enjoy a Mindful Snack", description: "Take a small snack you enjoy and eat it slowly. Focus on the taste, smell, and texture to bring your attention back to the present.", icon: "🍎", category: "grounding", order: 13 }
];

const seedDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing seed data
    await Promise.all([
      Quote.deleteMany({}),
      DefaultTask.deleteMany({}),
      DefaultComfort.deleteMany({}),
    ]);
    console.log("🗑️  Cleared existing seed data");

    // Insert seed data
    await Quote.insertMany(quotes);
    console.log(`✅ Seeded ${quotes.length} quotes`);

    await DefaultTask.insertMany(defaultTasks);
    console.log(`✅ Seeded ${defaultTasks.length} default tasks`);

    await DefaultComfort.insertMany(defaultComforts);
    console.log(`✅ Seeded ${defaultComforts.length} default comforts`);

    console.log("\n🎉 Database seeded successfully!");
  } catch (error) {
    console.error("❌ Seeding error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
};

seedDB();
