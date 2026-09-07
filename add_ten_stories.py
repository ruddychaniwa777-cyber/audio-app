with open("App.tsx", "r") as f:
    content = f.read()

target = 'genre: "Drama",'
batch_stories = """  {
    id: "scary-interactive-1",
    title: "The Midnight Cabin: Choose Your Fate",
    genre: "Scary",
    author: "Pocket Rivals",
    creator: "Admin",
    description: "You hear a knock on the cabin door at 3 AM. Do you open it or hide under the bed? Your choices dictate who survives.",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=500&auto=format&fit=crop",
    plays: 120,
    likes: 45,
    rating: 4.9,
    episodes: 3
  },
  {
    id: "scary-interactive-2",
    title: "Whispers in the Static: Radio Horror",
    genre: "Scary",
    author: "GhostLine",
    creator: "Admin",
    description: "An old emergency broadcast system starts calling your name directly. Do you smash the radio or answer back?",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=500&auto=format&fit=crop",
    plays: 310,
    likes: 89,
    rating: 4.8,
    episodes: 4
  },
  {
    id: "scary-interactive-3",
    title: "The Last Elevator Ride Down",
    genre: "Scary",
    author: "Nightshade",
    creator: "Admin",
    description: "The elevator stops on an unlisted floor where pitch darkness awaits. Do you step out or force the doors closed?",
    image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=500&auto=format&fit=crop",
    plays: 540,
    likes: 156,
    rating: 4.7,
    episodes: 3
  },
  {
    id: "scary-interactive-4",
    title: "Don't Look in the Mirror",
    genre: "Scary",
    author: "VampireVibes",
    creator: "Admin",
    description: "Your reflection blinks a split second after you do. Do you run from the bathroom or stare closer?",
    image: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=500&auto=format&fit=crop",
    plays: 430,
    likes: 112,
    rating: 4.9,
    episodes: 5
  },
  {
    id: "scary-interactive-5",
    title: "The Orphanage Ward 9",
    genre: "Scary",
    author: "CreepAudio",
    creator: "Admin",
    description: "Footsteps echo down the abandoned hallway outside your room. Do you lock the door or hide in the closet?",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=500&auto=format&fit=crop",
    plays: 680,
    likes: 210,
    rating: 4.6,
    episodes: 4
  },
  {
    id: "scary-interactive-6",
    title: "Deep Sea Echoes",
    genre: "Scary",
    author: "AbyssalTales",
    creator: "Admin",
    description: "Your submarine radar detects a human heartbeat outside the glass hull 4,000 feet underwater. Do you log it or ignore it?",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=500&auto=format&fit=crop",
    plays: 290,
    likes: 77,
    rating: 4.8,
    episodes: 3
  },
  {
    id: "scary-interactive-7",
    title: "The Smart Home Trap",
    genre: "Scary",
    author: "CyberGhoul",
    creator: "Admin",
    description: "Your automated smart lights begin turning off one by one, and the front door unlocks itself. Do you grab a weapon or flee?",
    image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=500&auto=format&fit=crop",
    plays: 890,
    likes: 340,
    rating: 4.9,
    episodes: 4
  },
  {
    id: "scary-interactive-8",
    title: "The Woods Behind the House",
    genre: "Scary",
    author: "DarkForest",
    creator: "Admin",
    description: "You spot a glowing campfire deep in forbidden woods at midnight. Do you investigate or lock your windows?",
    image: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=500&auto=format&fit=crop",
    plays: 350,
    likes: 95,
    rating: 4.7,
    episodes: 3
  },
  {
    id: "scary-interactive-9",
    title: "The Night Shift Security Log",
    genre: "Scary",
    author: "GraveyardShift",
    creator: "Admin",
    description: "Camera 4 shows someone standing directly behind your office chair, but nobody is there when you turn around. Do you check the live feed or run?",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=500&auto=format&fit=crop",
    plays: 720,
    likes: 245,
    rating: 4.9,
    episodes: 5
  },
  {
    id: "scary-interactive-10",
    title: "Subway Stop 13",
    genre: "Scary",
    author: "MetroHorror",
    creator: "Admin",
    description: "The train halts in a dark tunnel between stations and all passengers vanish except one pale figure staring at you. Do you switch cars or confront them?",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=500&auto=format&fit=crop",
    plays: 510,
    likes: 180,
    rating: 4.8,
    episodes: 4
  },
  genre: "Drama","""

if target in content and "scary-interactive-10" not in content:
    content = content.replace(target, batch_stories, 1)
    with open("App.tsx", "w") as f:
        f.write(content)
    print("Successfully added 10 new interactive scary stories!")
else:
    print("Target already updated or format differs.")
