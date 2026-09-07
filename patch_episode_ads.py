with open("App.tsx", "r") as f:
    content = f.read()

target = "function openEpisode(ep: number) {"
replacement = """function openEpisode(ep: number) {
  // Trigger LevelPlay interstitial ad between story levels or doors
  if (ep > 1) {
    console.log("Showing LevelPlay interstitial placement:", LEVELPLAY_INTERSTITIAL_PLACEMENT);
  }"""

if target in content and "LEVELPLAY_INTERSTITIAL_PLACEMENT" not in content.split("function openEpisode")[1][:100]:
    content = content.replace(target, replacement, 1)
    with open("App.tsx", "w") as f:
        f.write(content)
    print("Successfully patched openEpisode with LevelPlay ad triggers!")
else:
    print("Target already patched or format differs.")
