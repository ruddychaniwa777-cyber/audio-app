with open("App.tsx", "r") as f:
    content = f.read()

# Target right below the Header / top of HomeScreen
target = "<SafeAreaView style={styles.safe}>"
search_and_genres = """<SafeAreaView style={styles.safe}>
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
        <ScrollView horizontal showsHorizontalIndicator={false} contentContainerStyle={{ gap: 8 }}>
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

if target in content and "Search stories" not in content:
    content = content.replace(target, search_and_genres, 1)
    with open("App.tsx", "w") as f:
        f.write(content)
    print("Successfully added search bar and genre filters!")
else:
    print("Target already updated or format differs.")
