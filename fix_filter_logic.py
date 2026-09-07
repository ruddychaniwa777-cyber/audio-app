with open("App.tsx", "r") as f:
    content = f.read()

# Make sure filtered stories logic accounts for searchQuery and genres
target = "const filteredStories ="
if target not in content:
    # Insert filtered stories definition before HomeScreen return
    hook_target = "function HomeScreen("
    filter_logic = """
  const filteredStories = stories.filter((s) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      s.title.toLowerCase().includes(query) ||
      s.genre.toLowerCase().includes(query) ||
      s.author.toLowerCase().includes(query)
    );
  });
"""
    if hook_target in content:
        content = content.replace(hook_target, filter_logic + "\n" + hook_target, 1)
        with open("App.tsx", "w") as f:
            f.write(content)
        print("Successfully added filter logic for search & genres!")
else:
    print("Filter logic already present.")
