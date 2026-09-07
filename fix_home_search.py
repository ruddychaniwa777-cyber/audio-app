with open("App.tsx", "r") as f:
    content = f.read()

# Let us find where HomeScreen begins and insert the search bar right after the first SafeAreaView
target = "function HomeScreen("
if target in content:
    # Find the index of function HomeScreen
    idx = content.index(target)
    # Find the opening SafeAreaView inside HomeScreen
    sa_idx = content.find("<SafeAreaView", idx)
    end_sa_idx = content.find(">", sa_idx) + 1
    
    search_snippet = """
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
    
    if "Search stories" not in content:
        content = content[:end_sa_idx] + search_snippet + content[end_sa_idx:]
        with open("App.tsx", "w") as f:
            f.write(content)
        print("Successfully injected search bar and genres into HomeScreen!")
    else:
        print("Search bar already present.")
else:
    print("HomeScreen function not found.")
