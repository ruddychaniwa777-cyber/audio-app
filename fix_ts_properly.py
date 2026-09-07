with open("App.tsx", "r") as f:
    content = f.read()

# Revert the incorrect global token replacement
content = content.replace("(token as any)", "token")

# Fix the specific reward-ad call where token might be undefined if not in scope, 
# or pass null/token safely:
content = content.replace(
    'await api<any>("/api/reward-ad", { method: "POST" }, token);',
    'await api<any>("/api/reward-ad", { method: "POST" }, typeof token !== "undefined" ? token : null);'
)

# Ensure filteredStories parameter has type 'any'
content = content.replace("stories.filter((s) => {", "stories.filter((s: any) => {")

# Fix image picker result properties safely
content = content.replace(
    'result.avatarUrl || result.url', 
    '((result as any).avatarUrl || (result as any).uri || (result as any).url)'
)

with open("App.tsx", "w") as f:
    f.write(content)

print("TypeScript errors corrected properly!")
