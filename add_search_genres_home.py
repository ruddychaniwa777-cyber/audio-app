with open("App.tsx", "r") as f:
    content = f.read()

# Target the HomeScreen render return
target = "function HomeScreen("
# Let us find where HomeScreen returns its SafeAreaView
replacement = """function HomeScreen({
  stories,
  openStory,
  go,
  coins,
  searchQuery,
  setSearchQuery,
}: {
  stories: Story[];
  openStory: (story: Story) => void;
  go: (s: Screen) => void;
  coins: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Search & Genre Filter Bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 5 }}>
        <TextInput
          style={{
            backgroundColor: "#1c1c1c",
            color: "#fff",
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 14,
            borderWidth: 1,
            borderColor: "#333",
            marginBottom: 10
          }}
          placeholder="Search stories, creators, genres..."
          placeholderTextColor="#777"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          blurOnSubmit={true}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {["All", "Scary", "Drama", "Romance", "Comedy", "Thriller"].map((g) => (
            <Pressable
              key={g}
              style={{
                backgroundColor: "#222",
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#444"
              }}
              onPress={() => setSearchQuery(g === "All" ? "" : g)}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{g}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>"""

if "function HomeScreen(" in content and "Search stories" not in content:
    # Find the start of HomeScreen return block and replace
    import re
    # Let us replace function HomeScreen definition header
    content = re.sub(r"function HomeScreen\s*\([^)]*\)\s*\{\s*return\s*\(?\s*<SafeAreaView[^>]*>", replacement, content, count=1)
    with open("App.tsx", "w") as f:
        f.write(content)
    print("Successfully added search and genres to HomeScreen!")
else:
    print("HomeScreen already updated or signature differs.")
