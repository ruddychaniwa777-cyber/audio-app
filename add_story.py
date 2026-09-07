with open("App.tsx", "r") as f:
    content = f.read()

target = 'genre: "Drama",'
scary_addition = """  {
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
  genre: "Drama","""

if target in content and "scary-interactive-1" not in content:
    content = content.replace(target, scary_addition, 1)
    with open("App.tsx", "w") as f:
        f.write(content)
    print("Successfully added interactive scary story!")
else:
    print("Target already updated or format differs.")
