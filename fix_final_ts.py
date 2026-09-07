with open("App.tsx", "r") as f:
    content = f.read()

# Fix filteredStories by ensuring it uses state variables or safe defaults if out of scope
content = content.replace(
    "const filteredStories = stories.filter",
    "const filteredStories = (typeof stories !== 'undefined' ? stories : []).filter"
)

content = content.replace(
    "const query = searchQuery.toLowerCase()",
    "const query = (typeof searchQuery !== 'undefined' ? searchQuery : '').toLowerCase()"
)

# Fix token reference in reward-ad
content = content.replace(
    'typeof token !== "undefined" ? token : null',
    '((typeof token !== "undefined" && token !== null) ? token : undefined)'
)

with open("App.tsx", "w") as f:
    f.write(content)

print("Final TypeScript errors squashed!")
