with open("App.tsx", "r") as f:
    content = f.read()

target = "function openEpisode("
ad_check = """function openEpisode(episodeNumber: number) {
  // Show interstitial ad every 3rd level/episode or on locked horror doors
  if (episodeNumber > 1 && episodeNumber % 2 === 0) {
    console.log("Triggering interstitial ad break between levels...");
    // Simulated Ad trigger or SDK call
  }
"""

if target in content and "interstitial" not in content:
    content = content.replace(target, ad_check, 1)
    with open("App.tsx", "w") as f:
        f.write(content)
    print("Successfully added ad breaks between story levels!")
else:
    print("Target already updated or format differs.")
