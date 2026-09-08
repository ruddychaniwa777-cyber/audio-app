import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { GAME_DEFINITIONS, PocketGameScreen, type GameKey } from "./games/PocketGames";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || "http://16.170.245.45:3000";

// Unity LevelPlay Ad Configuration Constants
const LEVELPLAY_APP_KEY = "27fee41cd";
const LEVELPLAY_REWARDED_AD_UNIT_ID = "196aqh28jioz1wpu";
const LEVELPLAY_INTERSTITIAL_AD_UNIT_ID = "beihvx45qnq67si7";

type Screen =
  | "home" | "discover" | "player" | "profile" | "comments" | "messages"
  | "notifications" | "games" | "wallet" | "creator" | "ai" | "settings"
  | "search" | "auth";

type User = {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  followers?: number;
  following?: number;
  verified?: boolean;
  creator?: boolean;
};

type Story = {
  id: string;
  title: string;
  description?: string;
  genre?: string;
  author?: string;
  creator?: User;
  coverUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  likes?: number;
  comments?: number;
  views?: number;
  episodes?: number;
  lockedFrom?: number;
  tags?: string[];
};

type CommentItem = {
  id: string;
  username: string;
  avatar?: string;
  text: string;
  likes: number;
  liked?: boolean;
};

const FALLBACK: Story[] = [
  {
    id: "demo-1",
    title: "After Midnight",
    description: "A mystery begins when the city loses power.",
    genre: "Thriller",
    author: "Pocket Studios",
    coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900",
    videoUrl: "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4",
    likes: 18420, comments: 642, views: 124000, episodes: 12,
    creator: { id: "creator-1", username: "pocketstudios", displayName: "Pocket Studios", followers: 42100, following: 88, verified: true, creator: true },
  },
  {
    id: "demo-2",
    title: "The Last Signal",
    description: "One signal. Five strangers. Zero explanations.",
    genre: "Sci-Fi",
    author: "Nova Films",
    coverUrl: "https://images.unsplash.com/photo-1534791547706-3f5f5e0c8b7c?w=900",
    videoUrl: "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4",
    likes: 9270, comments: 318, views: 88000, episodes: 8,
    creator: { id: "creator-2", username: "novafilms", displayName: "Nova Films", followers: 18900, following: 34, verified: true, creator: true },
  },
  {
    id: "demo-3",
    title: "Choose Your Door",
    description: "Every door changes the story.",
    genre: "Interactive",
    author: "Ruddy Games",
    coverUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900",
    likes: 31200, comments: 1102, views: 210000, episodes: 20,
    creator: { id: "creator-3", username: "ruddygames", displayName: "Ruddy Games", followers: 53200, following: 12, verified: true, creator: true },
  },
];

const CATEGORIES = ["For You", "Trending", "New", "Drama", "Thriller", "Sci-Fi", "Comedy", "Games"];

async function api(path: string, options: RequestInit = {}) {
  try {
    const token = await AsyncStorage.getItem("pocket_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const text = await res.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data;
  } catch (e) {
    throw e;
  }
}

function Icon({ name, size = 22, active = false }: { name: string; size?: number; active?: boolean }) {
  const glyph: Record<string, string> = {
    home: "⌂", discover: "⌕", games: "◈", profile: "◉", heart: active ? "♥" : "♡",
    comment: "◌", share: "↗", play: "▶", pause: "Ⅱ", back: "‹", bell: "♧",
    message: "▱", search: "⌕", plus: "+", settings: "⚙", coin: "◆", upload: "↑",
    bookmark: active ? "▮" : "▯", spark: "✦", send: "➤", check: "✓", close: "×",
    more: "•••", follow: "+", lock: "◆", download: "↓",
  };
  return <Text style={[styles.icon, { fontSize: size }, active && styles.iconActive]}>{glyph[name] || "•"}</Text>;
}

function Avatar({ user, size = 42 }: { user?: User; size?: number }) {
  if (user?.avatar) {
    return <Image source={{ uri: user.avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarLetter, { fontSize: size * 0.38 }]}>{(user?.displayName || user?.username || "P")[0].toUpperCase()}</Text>
    </View>
  );
}

function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && <Pressable onPress={onPress}><Text style={styles.sectionAction}>{action}</Text></Pressable>}
    </View>
  );
}

function PosterCard({ story, onPress, compact = false }: { story: Story; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.posterCard, compact && styles.posterCompact]}>
      <Image source={{ uri: story.coverUrl || FALLBACK[0].coverUrl }} style={styles.posterImage} />
      <View style={styles.posterShade} />
      <View style={styles.posterMeta}>
        <Text numberOfLines={1} style={styles.posterTitle}>{story.title}</Text>
        <Text numberOfLines={1} style={styles.posterSub}>{story.genre || "Original"} · {story.episodes || 1} eps</Text>
      </View>
    </Pressable>
  );
}

function StoryRow({ story, onPress }: { story: Story; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.storyRow}>
      <Image source={{ uri: story.coverUrl || FALLBACK[0].coverUrl }} style={styles.rowImage} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{story.title}</Text>
        <Text style={styles.rowSub}>{story.genre || "Original"} · {formatNumber(story.views || 0)} views</Text>
        <Text style={styles.rowDesc} numberOfLines={2}>{story.description || "Tap to watch on Pocket Rivals."}</Text>
      </View>
      <Icon name="play" size={16} />
    </Pressable>
  );
}

function formatNumber(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [stories, setStories] = useState<Story[]>(FALLBACK);
  const [selected, setSelected] = useState<Story | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("For You");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [messages, setMessages] = useState<{ id: string; name: string; text: string; time: string }[]>([]);
  const [messageText, setMessageText] = useState("");
  const [coins, setCoins] = useState(0);
  const [notifications, setNotifications] = useState<string[]>([
    "Welcome to the new Pocket Rivals experience.",
    "Your watch list is ready.",
  ]);
  const [gameKey, setGameKey] = useState<GameKey | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hey 👋 I’m Pocket AI. Ask me what to watch, what to play, or anything about Pocket Rivals." },
  ]);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [name, setName] = useState("");
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const [profileUser, setProfileUser] = useState<User | null>(null);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const storedUser = await AsyncStorage.getItem("pocket_user");
      const storedCoins = await AsyncStorage.getItem("pocket_coins");
      const storedLikes = await AsyncStorage.getItem("pocket_likes");
      const storedSaved = await AsyncStorage.getItem("pocket_saved");
      if (storedUser) setCurrentUser(JSON.parse(storedUser));
      if (storedCoins) setCoins(Number(storedCoins));
      if (storedLikes) setLiked(JSON.parse(storedLikes));
      if (storedSaved) setSaved(JSON.parse(storedSaved));
      try {
        const data = await api("/api/shows");
        const list = data?.shows || data?.data || data;
        if (Array.isArray(list) && list.length) setStories(list);
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  // Unity LevelPlay Ad Integration Handlers
  async function showRewardedAd(onRewardEarned: () => void) {
    try {
      // Integration hook point for Unity LevelPlay Rewarded Ad SDK using:
      // App Key: 27fee41cd
      // Rewarded Unit ID: 196aqh28jioz1wpu
      // Example:
      // if (await RewardedAd.isReady(LEVELPLAY_REWARDED_AD_UNIT_ID)) {
      //   RewardedAd.showAd(LEVELPLAY_REWARDED_AD_UNIT_ID);
      // }

      // Simulated success callback for runtime layout validation
      Alert.alert("Ad Finished", "Thank you for watching! Reward earned.");
      onRewardEarned();
    } catch (error) {
      Alert.alert("Ad Unavailable", "Could not load the rewarded ad right now. Please try again later.");
    }
  }

  async function showInterstitialAd() {
    try {
      // Integration hook point for Unity LevelPlay Interstitial Ad SDK using:
      // App Key: 27fee41cd
      // Interstitial Unit ID: beihvx45qnq67si7
      // Example:
      // if (await InterstitialAd.isReady(LEVELPLAY_INTERSTITIAL_AD_UNIT_ID)) {
      //   InterstitialAd.showAd(LEVELPLAY_INTERSTITIAL_AD_UNIT_ID);
      // }
    } catch (error) {
      // Fail silently for interstitials so user flow is unhindered
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stories.filter(s => {
      const categoryMatch =
        activeCategory === "For You" || activeCategory === "Trending" || activeCategory === "New" ||
        activeCategory === "Games" || (s.genre || "").toLowerCase() === activeCategory.toLowerCase();
      const text = `${s.title} ${s.genre} ${s.author} ${s.creator?.displayName} ${s.creator?.username} ${(s.tags || []).join(" ")}`.toLowerCase();
      return categoryMatch && (!q || text.includes(q));
    });
  }, [stories, search, activeCategory]);

  async function requireLogin(action: () => void) {
    if (!currentUser) {
      Alert.alert("Sign in required", "Create an account or sign in to continue.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign in", onPress: () => setScreen("auth") },
      ]);
      return;
    }
    action();
  }

  function openStory(story: Story) {
    setSelected(story);
    setScreen("player");
  }

  async function toggleLike(story: Story) {
    requireLogin(async () => {
      const next = !liked[story.id];
      setLiked(v => ({ ...v, [story.id]: next }));
      await AsyncStorage.setItem("pocket_likes", JSON.stringify({ ...liked, [story.id]: next }));
      try { await api(`/api/shows/${story.id}/like`, { method: "POST" }); } catch {}
    });
  }

  async function toggleSave(story: Story) {
    requireLogin(async () => {
      const next = !saved[story.id];
      const updated = { ...saved, [story.id]: next };
      setSaved(updated);
      await AsyncStorage.setItem("pocket_saved", JSON.stringify(updated));
    });
  }

  async function loadComments(story: Story) {
    setSelected(story);
    try {
      const data = await api(`/api/shows/${story.id}/comments`);
      if (Array.isArray(data?.comments)) setComments(data.comments);
    } catch {
      setComments([
        { id: "1", username: story.creator?.username || "creator", text: "This episode is crazy 🔥", likes: 128 },
        { id: "2", username: "rivalsfan", text: "Pocket Rivals is getting serious.", likes: 64 },
      ]);
    }
    setScreen("comments");
  }

  async function likeComment(id: string) {
    requireLogin(async () => {
      setComments(prev => prev.map(c => c.id === id ? { ...c, liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) } : c));
      try { await api(`/api/comments/${id}/like`, { method: "POST" }); } catch {}
    });
  }

  async function postComment() {
    if (!commentText.trim() || !selected) return;
    requireLogin(async () => {
      const c: CommentItem = {
        id: `local-${Date.now()}`,
        username: currentUser?.username || "you",
        avatar: currentUser?.avatar,
        text: commentText.trim(),
        likes: 0,
      };
      setComments(v => [c, ...v]);
      setCommentText("");
      try {
        await api(`/api/shows/${selected.id}/comments`, {
          method: "POST",
          body: JSON.stringify({ text: c.text }),
        });
      } catch {}
    });
  }

  async function login() {
    if (!loginEmail || !loginPassword) return Alert.alert("Missing details", "Enter your email and password.");
    setLoading(true);
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const user = data.user || data;
      const token = data.token || data.accessToken;
      if (token) await AsyncStorage.setItem("pocket_token", token);
      await AsyncStorage.setItem("pocket_user", JSON.stringify(user));
      setCurrentUser(user);
      setScreen("home");
    } catch {
      Alert.alert("Login unavailable", "The server did not accept the login. You can still explore Pocket Rivals.");
    } finally { setLoading(false); }
  }

  async function register() {
    if (!name || !loginEmail || !loginPassword) return Alert.alert("Missing details", "Complete all fields.");
    setLoading(true);
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, username: name.toLowerCase().replace(/\s+/g, ""), email: loginEmail, password: loginPassword }),
      });
      const user = data.user || data;
      if (data.token) await AsyncStorage.setItem("pocket_token", data.token);
      await AsyncStorage.setItem("pocket_user", JSON.stringify(user));
      setCurrentUser(user);
      setScreen("home");
    } catch {
      Alert.alert("Registration unavailable", "Could not create the account right now.");
    } finally { setLoading(false); }
  }

  async function shareStory() {
    if (!selected) return;
    await Share.share({
      message: `Watch "${selected.title}" on Pocket Rivals.`,
    });
  }

  async function pickUpload() {
    await requireLogin(async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert("Permission needed", "Allow media access to choose a video.");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 1,
      });
      if (result.canceled) return;
      setUploading(true);
      try {
        const asset = result.assets[0];
        const form = new FormData();
        form.append("video", { uri: asset.uri, name: asset.fileName || "pocket-video.mp4", type: asset.mimeType || "video/mp4" } as any);
        const token = await AsyncStorage.getItem("pocket_token");
        await fetch(`${API_URL}/api/shows`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        });
        Alert.alert("Uploaded", "Your creator upload has been sent for processing.");
      } catch {
        Alert.alert("Upload failed", "The upload server could not be reached.");
      } finally { setUploading(false); }
    });
  }

  async function claimReward() {
    requireLogin(async () => {
      await showRewardedAd(async () => {
        const next = coins + 25;
        setCoins(next);
        await AsyncStorage.setItem("pocket_coins", String(next));
        setNotifications(v => ["Reward claimed: +25 coins", ...v]);
        Alert.alert("Reward claimed", "+25 Pocket Coins added to your wallet.");
      });
    });
  }

  async function askAI() {
    const q = aiText.trim();
    if (!q) return;
    setAiText("");
    setAiMessages(v => [...v, { role: "user", text: q }]);
    try {
      const data = await api("/api/ai/chat", { method: "POST", body: JSON.stringify({ message: q }) });
      setAiMessages(v => [...v, { role: "ai", text: data?.reply || data?.message || "I’m still learning that one." }]);
    } catch {
      const answer = q.toLowerCase().includes("watch")
        ? "Try After Midnight for thriller vibes, or The Last Signal if you want sci-fi."
        : "I’m connected to Pocket Rivals, but the AI service is currently offline. You can still explore the app.";
      setAiMessages(v => [...v, { role: "ai", text: answer }]);
    }
  }

  function openProfile(user?: User) {
    setProfileUser(user || currentUser || { id: "me", username: "guest", displayName: "Pocket Rivals User" });
    setScreen("profile");
  }

  function logout() {
    Alert.alert("Sign out", "Sign out of Pocket Rivals?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => {
        await AsyncStorage.multiRemove(["pocket_token", "pocket_user"]);
        setCurrentUser(null);
        setScreen("home");
      }},
    ]);
  }

  if (loading && !stories.length) return <View style={styles.boot}><ActivityIndicator size="large" /><Text style={styles.bootText}>POCKET RIVALS</Text></View>;

  if (gameKey) {
    return (
      <SafeAreaView style={styles.safe}>
        <PocketGameScreen gameKey={gameKey} onBack={() => setGameKey(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      <View style={styles.app}>
        {screen === "home" && <HomeScreen />}
        {screen === "discover" && <DiscoverScreen />}
        {screen === "player" && selected && <PlayerScreen story={selected} />}
        {screen === "profile" && <ProfileScreen />}
        {screen === "comments" && selected && <CommentsScreen />}
        {screen === "messages" && <MessagesScreen />}
        {screen === "notifications" && <NotificationsScreen />}
        {screen === "games" && <GamesHub />}
        {screen === "wallet" && <WalletScreen />}
        {screen === "creator" && <CreatorScreen />}
        {screen === "ai" && <AIScreen />}
        {screen === "settings" && <SettingsScreen />}
        {screen === "search" && <SearchScreen />}
        {screen === "auth" && <AuthScreen />}
        {!["player", "comments", "auth"].includes(screen) && <BottomNav />}
      </View>
    </SafeAreaView>
  );

  function Header({ title = "POCKET RIVALS", showBack = false }: { title?: string; showBack?: boolean }) {
    return (
      <View style={styles.header}>
        <View style={styles.brandWrap}>
          {showBack && <Pressable onPress={() => setScreen("home")} style={styles.headerBack}><Icon name="back" size={32} /></Pressable>}
          <View>
            <Text style={styles.brand}>{title}</Text>
            {!showBack && <Text style={styles.brandTag}>ENTERTAINMENT • COMMUNITY • GAMES</Text>}
          </View>
        </View>
        {!showBack && (
          <View style={styles.headerActions}>
            <Pressable onPress={() => setScreen("search")} style={styles.headerBtn}><Icon name="search" /></Pressable>
            <Pressable onPress={() => setScreen("notifications")} style={styles.headerBtn}><Icon name="bell" /></Pressable>
            <Pressable onPress={() => openProfile()}><Avatar user={currentUser || undefined} size={34} /></Pressable>
          </View>
        )}
      </View>
    );
  }

  function HomeScreen() {
    const hero = stories[0];
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
        <Header />
        <View style={styles.searchBar} >
          <Icon name="search" size={19} />
          <Text style={styles.searchPlaceholder} onPress={() => setScreen("search")}>Search movies, creators, games...</Text>
          <View style={styles.livePill}><View style={styles.dot} /><Text style={styles.liveText}>LIVE</Text></View>
        </View>

        <Pressable onPress={() => openStory(hero)} style={styles.hero}>
          <Image source={{ uri: hero.coverUrl }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.badge}><Text style={styles.badgeText}>TRENDING NOW</Text></View>
            <Text style={styles.heroTitle}>{hero.title}</Text>
            <Text style={styles.heroDesc} numberOfLines={2}>{hero.description}</Text>
            <View style={styles.heroButtons}>
              <Pressable onPress={() => openStory(hero)} style={styles.primaryBtn}><Icon name="play" size={15} /><Text style={styles.primaryText}>Watch now</Text></Pressable>
              <Pressable onPress={() => toggleSave(hero)} style={styles.secondaryBtn}><Icon name="bookmark" size={17} active={!!saved[hero.id]} /></Pressable>
            </View>
          </View>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {CATEGORIES.map(c => (
            <Pressable key={c} onPress={() => c === "Games" ? setScreen("games") : setActiveCategory(c)} style={[styles.chip, activeCategory === c && styles.chipActive]}>
              <Text style={[styles.chipText, activeCategory === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionTitle title="Continue watching" action="See all" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
          {stories.slice(0, 4).map(s => <PosterCard key={s.id} story={s} onPress={() => openStory(s)} />)}
        </ScrollView>

        <SectionTitle title="Trending on Pocket Rivals" action="View all" />
        {filtered.slice(0, 4).map(s => <StoryRow key={s.id} story={s} onPress={() => openStory(s)} />)}

        <SectionTitle title="Games" action="Open Games" onPress={() => setScreen("games")} />
        <View style={styles.gamePreview}>
          {GAME_DEFINITIONS.slice(0, 3).map((g: any) => (
            <Pressable key={g.key} style={styles.gameMini} onPress={() => setGameKey(g.key)}>
              <Text style={styles.gameEmoji}>{g.icon || "🎮"}</Text>
              <Text style={styles.gameMiniTitle} numberOfLines={1}>{g.title}</Text>
              <Text style={styles.gameMiniSub}>2000+ levels</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  }

  function DiscoverScreen() {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
        <Header title="DISCOVER" />
        <Text style={styles.bigHeading}>Find your next obsession.</Text>
        <Text style={styles.muted}>Stories, creators, audio and games — all in one place.</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.filter(x => x !== "For You").map(c => (
            <Pressable key={c} style={styles.categoryCard} onPress={() => c === "Games" ? setScreen("games") : (setActiveCategory(c), setScreen("home"))}>
              <Text style={styles.categoryIcon}>{c === "Games" ? "🎮" : c === "Drama" ? "🎬" : c === "Thriller" ? "🕯️" : c === "Sci-Fi" ? "◈" : "✦"}</Text>
              <Text style={styles.categoryTitle}>{c}</Text>
              <Text style={styles.mutedSmall}>Explore</Text>
            </Pressable>
          ))}
        </View>
        <SectionTitle title="Recommended" />
        {stories.map(s => <StoryRow key={s.id} story={s} onPress={() => openStory(s)} />)}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  }

  function SearchScreen() {
    return (
      <View style={styles.flex}>
        <Header title="SEARCH" showBack />
        <View style={styles.searchInputWrap}>
          <Icon name="search" />
          <TextInput autoFocus value={search} onChangeText={setSearch} placeholder="Search title, creator, genre..." placeholderTextColor="#666" style={styles.searchInput} />
          {!!search && <Pressable onPress={() => setSearch("")}><Icon name="close" /></Pressable>}
        </View>
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.muted}>{search ? `${filtered.length} results` : "Popular searches"}</Text>
          {!search && ["After Midnight", "Thriller", "Pocket Studios", "Games"].map(x => (
            <Pressable key={x} onPress={() => setSearch(x)} style={styles.searchSuggestion}><Icon name="search" size={18}/><Text style={styles.suggestionText}>{x}</Text></Pressable>
          ))}
          {search && filtered.map(s => <StoryRow key={s.id} story={s} onPress={() => openStory(s)} />)}
        </ScrollView>
      </View>
    );
  }

  function PlayerScreen({ story }: { story: Story }) {
    return <Player story={story} />;
  }

  function Player({ story }: { story: Story }) {
    const player = useVideoPlayer(story.videoUrl || "", p => { p.loop = false; });
    const [playing, setPlaying] = useState(false);
    const [episode, setEpisode] = useState(1);
    const total = story.episodes || 1;

    useEffect(() => {
      return () => { try { player.pause(); } catch {} };
    }, [player]);

    function togglePlayback() {
      if (playing) player.pause(); else player.play();
      setPlaying(!playing);
    }

    function chooseEpisode(ep: number) {
      if (story.lockedFrom && ep >= story.lockedFrom && !unlocked[`${story.id}:${ep}`]) {
        requireLogin(() => {
          Alert.alert("Episode locked", "Unlock this episode with 50 coins or watch a rewarded ad.", [
            { text: "Cancel", style: "cancel" },
            { text: `Use 50 coins`, onPress: () => {
              if (coins < 50) return Alert.alert("Not enough coins", "Earn more coins from Rewards.");
              const next = coins - 50;
              setCoins(next);
              AsyncStorage.setItem("pocket_coins", String(next));
              setUnlocked(v => ({ ...v, [`${story.id}:${ep}`]: true }));
              setEpisode(ep);
            }},
            { text: "Watch reward", onPress: () => {
              showRewardedAd(() => {
                setUnlocked(v => ({ ...v, [`${story.id}:${ep}`]: true }));
                setEpisode(ep);
              });
            }},
          ]);
        });
      } else setEpisode(ep);
    }

    return (
      <View style={styles.playerRoot}>
        <View style={styles.playerVideo}>
          {story.videoUrl ? (
            <VideoView player={player} style={styles.video} nativeControls={false} contentFit="cover" />
          ) : <Image source={{ uri: story.coverUrl }} style={styles.video} />}
          <View style={styles.playerTop}>
            <Pressable onPress={() => setScreen("home")} style={styles.circleBtn}><Icon name="back" size={30}/></Pressable>
            <Text style={styles.playerBrand}>POCKET RIVALS</Text>
            <Pressable onPress={() => setScreen("settings")} style={styles.circleBtn}><Icon name="more" size={16}/></Pressable>
          </View>
          <Pressable style={styles.bigPlay} onPress={togglePlayback}><Icon name={playing ? "pause" : "play"} size={28}/></Pressable>
        </View>
        <ScrollView style={styles.playerInfo} showsVerticalScrollIndicator={false}>
          <View style={styles.playerTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.playerTitle}>{story.title}</Text>
              <Text style={styles.muted}>{story.genre || "Original"} · {formatNumber(story.views || 0)} views</Text>
            </View>
            <Pressable onPress={() => toggleLike(story)} style={styles.action}><Icon name="heart" active={!!liked[story.id]} /><Text style={styles.actionText}>{formatNumber(story.likes || 0)}</Text></Pressable>
          </View>
          <Text style={styles.playerDescription}>{story.description}</Text>
          <View style={styles.creatorBar}>
            <Pressable onPress={() => openProfile(story.creator)} style={styles.creatorIdentity}><Avatar user={story.creator} size={44}/><View><Text style={styles.creatorName}>{story.creator?.displayName || story.author || "Creator"}</Text><Text style={styles.mutedSmall}>{formatNumber(story.creator?.followers || 0)} followers</Text></View></Pressable>
            <Pressable onPress={() => requireLogin(() => setFollowed(v => ({ ...v, [story.creator?.id || story.id]: !v[story.creator?.id || story.id] })))} style={styles.followBtn}><Text style={styles.followText}>{followed[story.creator?.id || story.id] ? "Following" : "Follow"}</Text></Pressable>
          </View>
          <View style={styles.actionRow}>
            <Pressable onPress={() => loadComments(story)} style={styles.largeAction}><Icon name="comment"/><Text style={styles.actionText}>{formatNumber(story.comments || 0)}</Text></Pressable>
            <Pressable onPress={shareStory} style={styles.largeAction}><Icon name="share"/><Text style={styles.actionText}>Share</Text></Pressable>
            <Pressable onPress={() => toggleSave(story)} style={styles.largeAction}><Icon name="bookmark" active={!!saved[story.id]}/><Text style={styles.actionText}>{saved[story.id] ? "Saved" : "Save"}</Text></Pressable>
          </View>
          <SectionTitle title={`Episodes · ${total}`} />
          <View style={styles.episodeGrid}>
            {Array.from({ length: total }, (_, i) => i + 1).map(ep => {
              const locked = !!story.lockedFrom && ep >= story.lockedFrom && !unlocked[`${story.id}:${ep}`];
              return <Pressable key={ep} onPress={() => chooseEpisode(ep)} style={[styles.episode, episode === ep && styles.episodeActive]}>
                <Text style={[styles.episodeText, episode === ep && styles.episodeTextActive]}>{ep}</Text>
                {locked && <Icon name="lock" size={11}/>}
              </Pressable>;
            })}
          </View>
          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    );
  }

  function CommentsScreen() {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Header title="COMMENTS" showBack />
        <FlatList data={comments} keyExtractor={x => x.id} contentContainerStyle={styles.commentList} renderItem={({ item }) => (
          <View style={styles.comment}>
            <Avatar user={{ id: item.id, username: item.username, displayName: item.username, avatar: item.avatar }} size={40}/>
            <View style={{ flex: 1 }}>
              <Text style={styles.commentName}>{item.username}</Text>
              <Text style={styles.commentText}>{item.text}</Text>
              <Pressable onPress={() => likeComment(item.id)} style={styles.commentLike}><Icon name="heart" size={16} active={!!item.liked}/><Text style={styles.mutedSmall}>{formatNumber(item.likes)}</Text></Pressable>
            </View>
          </View>
        )}/>
        <View style={styles.composer}>
          <Avatar user={currentUser || undefined} size={38}/>
          <TextInput value={commentText} onChangeText={setCommentText} placeholder="Add a comment..." placeholderTextColor="#666" style={styles.composerInput}/>
          <Pressable onPress={postComment} style={styles.sendBtn}><Icon name="send" size={17}/></Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  function ProfileScreen() {
    const u = profileUser || currentUser || { id: "guest", username: "guest", displayName: "Pocket Rivals" };
    const own = currentUser?.id === u.id || u.id === "guest";
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Header title="PROFILE" showBack />
        <View style={styles.profileHero}>
          <Avatar user={u} size={92}/>
          <View style={styles.verifiedLine}><Text style={styles.profileName}>{u.displayName}</Text>{u.verified && <Text style={styles.verified}>✓</Text>}</View>
          <Text style={styles.profileHandle}>@{u.username}</Text>
          <View style={styles.stats}>
            <View><Text style={styles.statValue}>{formatNumber(u.followers || 0)}</Text><Text style={styles.statLabel}>Followers</Text></View>
            <View><Text style={styles.statValue}>{formatNumber(u.following || 0)}</Text><Text style={styles.statLabel}>Following</Text></View>
            <View><Text style={styles.statValue}>{stories.filter(s => s.creator?.id === u.id).length}</Text><Text style={styles.statLabel}>Posts</Text></View>
          </View>
          <View style={styles.profileActions}>
            {!own && <Pressable onPress={() => requireLogin(() => setFollowed(v => ({ ...v, [u.id]: !v[u.id] })))} style={styles.followBtnLarge}><Text style={styles.followText}>{followed[u.id] ? "Following" : "Follow"}</Text></Pressable>}
            {!own && <Pressable onPress={() => setScreen("messages")} style={styles.outlineBtn}><Icon name="message" size={17}/><Text style={styles.outlineText}>Message</Text></Pressable>}
            {own && <Pressable onPress={() => setScreen("settings")} style={styles.outlineBtn}><Icon name="settings" size={17}/><Text style={styles.outlineText}>Edit profile</Text></Pressable>}
          </View>
        </View>
        <SectionTitle title="Library" />
        <View style={styles.profileTabs}><Text style={styles.profileTabActive}>Videos</Text><Text style={styles.profileTab}>Liked</Text><Text style={styles.profileTab}>Saved</Text></View>
        <View style={styles.profileGrid}>{stories.filter(s => own || s.creator?.id === u.id).map(s => <PosterCard key={s.id} story={s} compact onPress={() => openStory(s)}/>)}</View>
        {own && !currentUser && <Pressable onPress={() => setScreen("auth")} style={styles.primaryFull}><Text style={styles.primaryText}>Sign in to unlock your profile</Text></Pressable>}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  }

  function MessagesScreen() {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Header title="MESSAGES" showBack />
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.messageHeader}><Avatar user={profileUser || currentUser || undefined} size={50}/><View><Text style={styles.rowTitle}>Pocket Rivals Chat</Text><Text style={styles.mutedSmall}>Private messages</Text></View></View>
          {messages.length === 0 && <View style={styles.empty}><Text style={styles.emptyIcon}>✦</Text><Text style={styles.emptyTitle}>Start a conversation</Text><Text style={styles.muted}>Message creators and people you follow.</Text></View>}
          {messages.map(m => <View key={m.id} style={styles.messageBubble}><Text style={styles.messageText}>{m.text}</Text><Text style={styles.mutedTiny}>{m.time}</Text></View>)}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput value={messageText} onChangeText={setMessageText} placeholder="Write a message..." placeholderTextColor="#666" style={styles.composerInput}/>
          <Pressable onPress={() => { if (!messageText.trim()) return; setMessages(v => [...v, { id: String(Date.now()), name: "You", text: messageText.trim(), time: "now" }]); setMessageText(""); }} style={styles.sendBtn}><Icon name="send" size={17}/></Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  function NotificationsScreen() {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Header title="NOTIFICATIONS" showBack />
        {notifications.map((n, i) => <View key={`${n}-${i}`} style={styles.notification}><View style={styles.notificationIcon}><Icon name="bell" size={18}/></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{n}</Text><Text style={styles.mutedSmall}>Just now</Text></View></View>)}
      </ScrollView>
    );
  }

  function GamesHub() {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Header title="GAMES" />
        <View style={styles.gamesHero}><Text style={styles.gamesEyebrow}>POCKET RIVALS ARCADE</Text><Text style={styles.gamesTitle}>Play. Choose. Survive.</Text><Text style={styles.muted}>20 games. Thousands of levels. Every run is different.</Text></View>
        <View style={styles.gameGrid}>
          {GAME_DEFINITIONS.map((g: any) => (
            <Pressable key={g.key} onPress={() => setGameKey(g.key)} style={styles.gameCard}>
              <View style={styles.gameIconBox}><Text style={styles.gameEmoji}>{g.icon || "🎮"}</Text></View>
              <Text style={styles.gameTitle} numberOfLines={1}>{g.title}</Text>
              <Text style={styles.mutedSmall}>2,000+ levels</Text>
              <View style={styles.levelPill}><Text style={styles.levelText}>PLAY →</Text></View>
            </Pressable>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  }

  function WalletScreen() {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Header title="WALLET" showBack />
        <View style={styles.walletCard}>
          <Text style={styles.walletLabel}>POCKET COINS</Text>
          <Text style={styles.walletCoins}>{coins.toLocaleString()}</Text>
          <Text style={styles.walletHint}>Use coins to unlock premium episodes and rewards.</Text>
        </View>
        <SectionTitle title="Rewards" />
        <Pressable onPress={claimReward} style={styles.rewardCard}><View style={styles.rewardIcon}><Icon name="coin" size={20}/></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>Daily reward</Text><Text style={styles.mutedSmall}>Claim 25 coins</Text></View><Text style={styles.claim}>CLAIM</Text></Pressable>
        <SectionTitle title="How to earn" />
        {["Watch rewarded ads", "Complete game levels", "Daily check-in", "Creator activity"].map((x, i) => <View key={x} style={styles.earnRow}><Text style={styles.earnNum}>0{i + 1}</Text><Text style={styles.rowTitle}>{x}</Text></View>)}
      </ScrollView>
    );
  }

  function CreatorScreen() {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Header title="CREATOR STUDIO" />
        <View style={styles.creatorDashboard}><Text style={styles.eyebrow}>CREATOR MODE</Text><Text style={styles.dashboardTitle}>Build your audience.</Text><Text style={styles.muted}>Publish stories, manage episodes and grow your community.</Text></View>
        <Pressable onPress={pickUpload} style={styles.uploadCard}><View style={styles.uploadIcon}><Icon name="upload" size={25}/></View><Text style={styles.rowTitle}>{uploading ? "Uploading..." : "Upload a video"}</Text><Text style={styles.mutedSmall}>MP4, MOV • creator content</Text>{uploading && <ActivityIndicator style={{ marginTop: 10 }}/>}</Pressable>
        <View style={styles.creatorStats}><View><Text style={styles.statValue}>0</Text><Text style={styles.statLabel}>Views</Text></View><View><Text style={styles.statValue}>0</Text><Text style={styles.statLabel}>Followers</Text></View><View><Text style={styles.statValue}>0</Text><Text style={styles.statLabel}>Revenue</Text></View></View>
        <SectionTitle title="Creator tools" />
        {["Content manager", "Episode editor", "Analytics", "Comments", "Payouts"].map(x => <Pressable key={x} style={styles.toolRow}><Text style={styles.rowTitle}>{x}</Text><Icon name="back" size={26}/></Pressable>)}
      </ScrollView>
    );
  }

  function AIScreen() {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Header title="POCKET AI" showBack />
        <FlatList data={aiMessages} keyExtractor={(_, i) => String(i)} contentContainerStyle={styles.aiList} renderItem={({ item }) => (
          <View style={[styles.aiBubble, item.role === "user" && styles.aiUser]}><Text style={styles.aiText}>{item.text}</Text></View>
        )}/>
        <View style={styles.aiComposer}><TextInput value={aiText} onChangeText={setAiText} onSubmitEditing={askAI} placeholder="Ask Pocket AI..." placeholderTextColor="#666" style={styles.composerInput}/><Pressable onPress={askAI} style={styles.sendBtn}><Icon name="send" size={17}/></Pressable></View>
      </KeyboardAvoidingView>
    );
  }

  function SettingsScreen() {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Header title="SETTINGS" showBack />
        <View style={styles.settingsProfile}><Avatar user={currentUser || undefined} size={58}/><View><Text style={styles.rowTitle}>{currentUser?.displayName || "Guest"}</Text><Text style={styles.mutedSmall}>{currentUser ? `@${currentUser.username}` : "Not signed in"}</Text></View></View>
        {["Account", "Notifications", "Playback & downloads", "Privacy", "Help & support", "About Pocket Rivals"].map(x => <Pressable key={x} style={styles.toolRow}><Text style={styles.rowTitle}>{x}</Text><Icon name="back" size={26}/></Pressable>)}
        {currentUser ? <Pressable onPress={logout} style={styles.dangerBtn}><Text style={styles.dangerText}>Sign out</Text></Pressable> : <Pressable onPress={() => setScreen("auth")} style={styles.primaryFull}><Text style={styles.primaryText}>Sign in / Register</Text></Pressable>}
      </ScrollView>
    );
  }

  function AuthScreen() {
    return (
      <KeyboardAvoidingView style={styles.authRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.authContent}>
          <Pressable onPress={() => setScreen("home")} style={styles.authClose}><Icon name="close" size={28}/></Pressable>
          <Text style={styles.authLogo}>PR</Text>
          <Text style={styles.authTitle}>{authMode === "login" ? "Welcome back." : "Join the Rivals."}</Text>
          <Text style={styles.muted}>{authMode === "login" ? "Sign in to continue your Pocket Rivals journey." : "Create your account and start exploring."}</Text>
          {authMode === "register" && <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor="#666" style={styles.authInput}/>}
          <TextInput value={loginEmail} onChangeText={setLoginEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor="#666" style={styles.authInput}/>
          <TextInput value={loginPassword} onChangeText={setLoginPassword} secureTextEntry placeholder="Password" placeholderTextColor="#666" style={styles.authInput}/>
          <Pressable onPress={authMode === "login" ? login : register} style={styles.authButton}><Text style={styles.primaryText}>{authMode === "login" ? "Sign in" : "Create account"}</Text></Pressable>
          <Pressable onPress={() => setAuthMode(authMode === "login" ? "register" : "login")} style={styles.authSwitch}><Text style={styles.muted}>{authMode === "login" ? "New here? " : "Already have an account? "}<Text style={styles.sectionAction}>{authMode === "login" ? "Create account" : "Sign in"}</Text></Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  function BottomNav() {
    const items: { key: Screen; label: string; icon: string }[] = [
      { key: "home", label: "Home", icon: "home" },
      { key: "discover", label: "Discover", icon: "discover" },
      { key: "games", label: "Games", icon: "games" },
      { key: "messages", label: "Messages", icon: "message" },
      { key: "profile", label: "Profile", icon: "profile" },
    ];
    return <View style={styles.nav}>{items.map(item => <Pressable key={item.key} onPress={() => item.key === "profile" ? openProfile() : setScreen(item.key)} style={styles.navItem}><Icon name={item.icon} size={22} active={screen === item.key}/><Text style={[styles.navText, screen === item.key && styles.navTextActive]}>{item.label}</Text></Pressable>)}</View>;
  }
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#050505" },
  app: { flex: 1, backgroundColor: "#050505" },
  flex: { flex: 1, backgroundColor: "#050505" },
  page: { padding: 18, paddingTop: 10 },
  boot: { flex: 1, backgroundColor: "#050505", alignItems: "center", justifyContent: "center" },
  bootText: { color: "#fff", fontSize: 13, fontWeight: "900", letterSpacing: 4, marginTop: 18 },
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  brandWrap: { flexDirection: "row", alignItems: "center", flex: 1 },
  headerBack: { marginRight: 8 },
  brand: { color: "#fff", fontSize: 19, fontWeight: "900", letterSpacing: 1.8 },
  brandTag: { color: "#555", fontSize: 7.5, fontWeight: "800", letterSpacing: 1.3, marginTop: 3 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#101010", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1c1c1c" },
  icon: { color: "#aaa", fontWeight: "700", textAlign: "center" },
  iconActive: { color: "#fff" },
  avatarFallback: { backgroundColor: "#181818", borderWidth: 1, borderColor: "#333", alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#fff", fontWeight: "900" },
  searchBar: { height: 52, borderRadius: 17, backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#1d1d1d", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 18 },
  searchPlaceholder: { flex: 1, color: "#777", marginLeft: 9, fontSize: 13 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#171717", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#aaa", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  hero: { height: 430, borderRadius: 28, overflow: "hidden", backgroundColor: "#111", marginBottom: 20 },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,.42)" },
  heroContent: { flex: 1, justifyContent: "flex-end", padding: 22 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(255,255,255,.12)", borderRadius: 8, marginBottom: 10 },
  badgeText: { color: "#fff", fontSize: 8, fontWeight: "900", letterSpacing: 1.3 },
  heroTitle: { color: "#fff", fontSize: 34, fontWeight: "900", letterSpacing: -.8 },
  heroDesc: { color: "#bbb", fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: "92%" },
  heroButtons: { flexDirection: "row", gap: 10, marginTop: 17 },
  primaryBtn: { backgroundColor: "#fff", minHeight: 44, paddingHorizontal: 17, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 7 },
  primaryText: { color: "#050505", fontWeight: "900", fontSize: 12 },
  secondaryBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,.12)", alignItems: "center", justifyContent: "center" },
  chips: { marginBottom: 24 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#1b1b1b", marginRight: 7 },
  chipActive: { backgroundColor: "#fff", borderColor: "#fff" },
  chipText: { color: "#888", fontSize: 11, fontWeight: "800" },
  chipTextActive: { color: "#050505" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7, marginBottom: 12 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: -.2 },
  sectionAction: { color: "#aaa", fontSize: 11, fontWeight: "800" },
  horizontal: { paddingBottom: 25, paddingRight: 4 },
  posterCard: { width: 148, height: 212, borderRadius: 18, overflow: "hidden", marginRight: 11, backgroundColor: "#111" },
  posterCompact: { width: (width - 53) / 2, height: 230, marginBottom: 12 },
  posterImage: { width: "100%", height: "100%" },
  posterShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,.28)" },
  posterMeta: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: "rgba(0,0,0,.48)" },
  posterTitle: { color: "#fff", fontWeight: "900", fontSize: 13 },
  posterSub: { color: "#aaa", fontSize: 9, marginTop: 4 },
  storyRow: { minHeight: 104, borderRadius: 18, backgroundColor: "#0c0c0c", borderWidth: 1, borderColor: "#181818", padding: 10, flexDirection: "row", alignItems: "center", marginBottom: 9 },
  rowImage: { width: 78, height: 84, borderRadius: 13, backgroundColor: "#151515" },
  rowBody: { flex: 1, paddingHorizontal: 12 },
  rowTitle: { color: "#fff", fontSize: 13, fontWeight: "800" },
  rowSub: { color: "#777", fontSize: 9, marginTop: 4 },
  rowDesc: { color: "#999", fontSize: 10, lineHeight: 15, marginTop: 6 },
  muted: { color: "#777", fontSize: 12, lineHeight: 18 },
  mutedSmall: { color: "#777", fontSize: 10 },
  mutedTiny: { color: "#555", fontSize: 8, marginTop: 4 },
  gamePreview: { flexDirection: "row", gap: 9, marginBottom: 20 },
  gameMini: { flex: 1, backgroundColor: "#0d0d0d", borderRadius: 17, padding: 12, borderWidth: 1, borderColor: "#1b1b1b" },
  gameEmoji: { fontSize: 25, marginBottom: 10 },
  gameMiniTitle: { color: "#fff", fontWeight: "900", fontSize: 11 },
  gameMiniSub: { color: "#666", fontSize: 8, marginTop: 4 },
  bigHeading: { color: "#fff", fontSize: 29, fontWeight: "900", letterSpacing: -.6, marginTop: 14 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 22 },
  categoryCard: { width: (width - 46) / 2, height: 128, backgroundColor: "#0d0d0d", borderRadius: 21, padding: 17, borderWidth: 1, borderColor: "#1b1b1b" },
  categoryIcon: { fontSize: 28, color: "#fff" },
  categoryTitle: { color: "#fff", fontSize: 15, fontWeight: "900", marginTop: 10 },
  searchInputWrap: { marginHorizontal: 18, marginBottom: 6, height: 52, backgroundColor: "#0d0d0d", borderRadius: 16, borderWidth: 1, borderColor: "#222", flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  searchInput: { flex: 1, color: "#fff", marginHorizontal: 9, fontSize: 13 },
  searchSuggestion: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#141414" },
  suggestionText: { color: "#ccc", fontSize: 13 },
  playerRoot: { flex: 1, backgroundColor: "#050505" },
  playerVideo: { height: Math.min(width * 1.22, 500), backgroundColor: "#000", position: "relative" },
  video: { width: "100%", height: "100%" },
  playerTop: { position: "absolute", top: 15, left: 15, right: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,.55)", alignItems: "center", justifyContent: "center" },
  playerBrand: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  bigPlay: { position: "absolute", left: "50%", top: "50%", marginLeft: -29, marginTop: -29, width: 58, height: 58, borderRadius: 29, backgroundColor: "rgba(255,255,255,.92)", alignItems: "center", justifyContent: "center" },
  playerInfo: { flex: 1, padding: 18 },
  playerTitleRow: { flexDirection: "row", alignItems: "center" },
  playerTitle: { color: "#fff", fontSize: 23, fontWeight: "900" },
  playerDescription: { color: "#aaa", lineHeight: 19, fontSize: 12, marginTop: 9 },
  action: { alignItems: "center", minWidth: 48 },
  actionText: { color: "#999", fontSize: 9, marginTop: 3 },
  creatorBar: { marginTop: 20, paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#171717", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  creatorIdentity: { flexDirection: "row", alignItems: "center", gap: 10 },
  creatorName: { color: "#fff", fontSize: 12, fontWeight: "900" },
  followBtn: { backgroundColor: "#fff", borderRadius: 11, paddingHorizontal: 15, paddingVertical: 9 },
  followText: { color: "#050505", fontSize: 10, fontWeight: "900" },
  actionRow: { flexDirection: "row", gap: 9, marginVertical: 15 },
  largeAction: { flex: 1, height: 44, backgroundColor: "#0d0d0d", borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "#181818" },
  episodeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  episode: { width: 48, height: 42, borderRadius: 12, backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#1b1b1b", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 3 },
  episodeActive: { backgroundColor: "#fff", borderColor: "#fff" },
  episodeText: { color: "#999", fontWeight: "900", fontSize: 11 },
  episodeTextActive: { color: "#050505" },
  commentList: { padding: 18, paddingBottom: 100 },
  comment: { flexDirection: "row", gap: 11, marginBottom: 20 },
  commentName: { color: "#fff", fontWeight: "800", fontSize: 11 },
  commentText: { color: "#bbb", fontSize: 12, lineHeight: 18, marginTop: 4 },
  commentLike: { flexDirection: "row", gap: 5, alignItems: "center", marginTop: 7 },
  composer: { minHeight: 66, borderTopWidth: 1, borderTopColor: "#1b1b1b", backgroundColor: "#090909", paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 9 },
  composerInput: { flex: 1, minHeight: 42, color: "#fff", backgroundColor: "#111", borderRadius: 14, paddingHorizontal: 13, fontSize: 12 },
  sendBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  profileHero: { alignItems: "center", paddingTop: 10 },
  verifiedLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  profileName: { color: "#fff", fontSize: 24, fontWeight: "900" },
  verified: { backgroundColor: "#fff", color: "#050505", width: 18, height: 18, borderRadius: 9, textAlign: "center", fontWeight: "900", fontSize: 11 },
  profileHandle: { color: "#666", marginTop: 4, fontSize: 11 },
  stats: { width: "90%", flexDirection: "row", justifyContent: "space-around", marginVertical: 22 },
  statValue: { color: "#fff", fontSize: 17, fontWeight: "900", textAlign: "center" },
  statLabel: { color: "#666", fontSize: 9, textAlign: "center", marginTop: 4 },
  profileActions: { flexDirection: "row", gap: 8, width: "100%" },
  followBtnLarge: { flex: 1, height: 46, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  outlineBtn: { flex: 1, height: 46, borderRadius: 14, backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#222", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  outlineText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  profileTabs: { flexDirection: "row", gap: 25, borderBottomWidth: 1, borderBottomColor: "#171717", paddingBottom: 12, marginBottom: 13 },
  profileTab: { color: "#555", fontSize: 11, fontWeight: "800" },
  profileTabActive: { color: "#fff", fontSize: 11, fontWeight: "900" },
  profileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  primaryFull: { height: 48, borderRadius: 15, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginTop: 20 },
  messageHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  empty: { alignItems: "center", paddingVertical: 90 },
  emptyIcon: { color: "#fff", fontSize: 36 },
  emptyTitle: { color: "#fff", fontWeight: "900", fontSize: 17, marginTop: 12 },
  messageBubble: { alignSelf: "flex-end", backgroundColor: "#fff", borderRadius: 17, borderBottomRightRadius: 5, padding: 12, maxWidth: "80%", marginBottom: 10 },
  messageText: { color: "#050505", fontSize: 12 },
  notification: { flexDirection: "row", gap: 12, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#151515" },
  notificationIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  gamesHero: { padding: 20, borderRadius: 24, backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#1c1c1c", marginBottom: 20 },
  gamesEyebrow: { color: "#777", fontSize: 8, fontWeight: "900", letterSpacing: 2 },
  gamesTitle: { color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 9, marginBottom: 7 },
  gameGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gameCard: { width: (width - 46) / 2, backgroundColor: "#0d0d0d", borderRadius: 21, padding: 14, borderWidth: 1, borderColor: "#1b1b1b" },
  gameIconBox: { height: 105, borderRadius: 16, backgroundColor: "#141414", alignItems: "center", justifyContent: "center", marginBottom: 11 },
  gameTitle: { color: "#fff", fontSize: 13, fontWeight: "900" },
  levelPill: { alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, backgroundColor: "#fff" },
  levelText: { color: "#050505", fontSize: 8, fontWeight: "900" },
  walletCard: { padding: 24, borderRadius: 25, backgroundColor: "#111", borderWidth: 1, borderColor: "#242424", marginBottom: 25 },
  walletLabel: { color: "#777", fontSize: 9, fontWeight: "900", letterSpacing: 2 },
  walletCoins: { color: "#fff", fontSize: 48, fontWeight: "900", marginTop: 8 },
  walletHint: { color: "#777", fontSize: 11, lineHeight: 17, marginTop: 5 },
  rewardCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, backgroundColor: "#0d0d0d", borderRadius: 17, borderWidth: 1, borderColor: "#1b1b1b" },
  rewardIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: "#171717", alignItems: "center", justifyContent: "center" },
  claim: { color: "#fff", fontWeight: "900", fontSize: 9 },
  earnRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#151515" },
  earnNum: { color: "#555", fontWeight: "900", fontSize: 11 },
  creatorDashboard: { padding: 23, borderRadius: 25, backgroundColor: "#101010", borderWidth: 1, borderColor: "#202020", marginBottom: 16 },
  eyebrow: { color: "#777", fontSize: 8, fontWeight: "900", letterSpacing: 2 },
  dashboardTitle: { color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 7, marginBottom: 6 },
  uploadCard: { padding: 20, borderRadius: 20, backgroundColor: "#0d0d0d", borderWidth: 1, borderStyle: "dashed", borderColor: "#333", alignItems: "center", marginBottom: 18 },
  uploadIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#171717", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  creatorStats: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 18, backgroundColor: "#0c0c0c", borderRadius: 18, marginBottom: 18 },
  toolRow: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#151515" },
  aiList: { padding: 18, paddingBottom: 20 },
  aiBubble: { maxWidth: "86%", alignSelf: "flex-start", backgroundColor: "#111", borderWidth: 1, borderColor: "#1d1d1d", borderRadius: 17, borderTopLeftRadius: 5, padding: 13, marginBottom: 10 },
  aiUser: { alignSelf: "flex-end", backgroundColor: "#fff", borderColor: "#fff", borderTopLeftRadius: 17, borderTopRightRadius: 5 },
  aiText: { color: "#ddd", fontSize: 12, lineHeight: 18 },
  aiComposer: { minHeight: 66, borderTopWidth: 1, borderTopColor: "#1b1b1b", backgroundColor: "#090909", padding: 10, flexDirection: "row", gap: 9, alignItems: "center" },
  settingsProfile: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#151515", marginBottom: 8 },
  dangerBtn: { height: 48, borderRadius: 14, backgroundColor: "#160c0c", alignItems: "center", justifyContent: "center", marginTop: 25, borderWidth: 1, borderColor: "#2c1515" },
  dangerText: { color: "#ffb1b1", fontWeight: "900", fontSize: 11 },
  authRoot: { flex: 1, backgroundColor: "#050505" },
  authContent: { padding: 24, paddingTop: 35, minHeight: "100%", justifyContent: "center" },
  authClose: { position: "absolute", right: 20, top: 20, zIndex: 2 },
  authLogo: { color: "#050505", backgroundColor: "#fff", width: 62, height: 62, borderRadius: 20, textAlign: "center", textAlignVertical: "center", fontSize: 23, fontWeight: "900", marginBottom: 25 },
  authTitle: { color: "#fff", fontSize: 36, fontWeight: "900", letterSpacing: -1, marginBottom: 8 },
  authInput: { height: 54, backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#202020", borderRadius: 15, paddingHorizontal: 15, color: "#fff", marginTop: 12, fontSize: 13 },
  authButton: { height: 54, borderRadius: 15, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginTop: 18 },
  authSwitch: { alignItems: "center", paddingVertical: 18 },
  nav: { height: 64, backgroundColor: "#090909", borderTopWidth: 1, borderTopColor: "#1b1b1b", flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  navText: { color: "#666", fontSize: 9, fontWeight: "800", marginTop: 3 },
  navTextActive: { color: "#fff" },
});

