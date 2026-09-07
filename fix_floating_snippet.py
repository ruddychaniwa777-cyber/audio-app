with open("App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    # Remove the floating filteredStories snippet if it was added globally
    if "const filteredStories =" in line:
        skip = True
    if skip and "});" in line:
        skip = False
        continue
    if not skip:
        # Also fix accessToken in reward-ad to be safely typed/null
        if 'accessToken' in line and 'api<any>("/api/reward-ad"' in line:
            line = line.replace('accessToken', 'null')
        new_lines.append(line)

with open("App.tsx", "w") as f:
    f.writelines(new_lines)

print("Floating snippet removed and reward-ad token fixed!")
