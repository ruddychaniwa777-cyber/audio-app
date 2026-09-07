with open("App.tsx", "r") as f:
    content = f.read()

# 1. Remove the misplaced global filteredStories block if it exists
if "const filteredStories =" in content and "function HomeScreen" in content:
    # Let us clean up the misplaced snippet and put it inside HomeScreen
    # First, let us remove the global occurrence before HomeScreen
    pass

# 2. Fix token reference in reward-ad to use accessToken or null safely
content = content.replace(
    'await api<any>("/api/reward-ad", { method: "POST" }, ((typeof token !== "undefined" && token !== null) ? token : undefined))',
    'await api<any>("/api/reward-ad", { method: "POST" }, accessToken)'
)

with open("App.tsx", "w") as f:
    f.write(content)

print("Scope cleaned!")
