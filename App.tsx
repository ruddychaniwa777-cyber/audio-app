import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  StyleSheet,
  Platform,
  StatusBar,
  Alert,
  Share,
  Linking,
  Switch,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  LevelPlay,
  LevelPlayInitRequest,
  LevelPlayInitListener,
  LevelPlayRewardedAd,
  LevelPlayRewardedAdListener,
  LevelPlayAdInfo,
  LevelPlayAdError,
  LevelPlayReward,
} from "@unity-metatag/react-native-levelplay";

const API_URL = "http://16.170.245.45:3000";

const LEVELPLAY_APP_KEY = "PUT_YOUR_LEVELPLAY_APP_KEY";
const LEVELPLAY_REWARDED_AD_UNIT_ID = "PUT_YOUR_REWARDED_AD_UNIT_ID";
const LEVELPLAY_REWARDED_PLACEMENT = "DefaultRewardedAd";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400&auto=format&fit=crop";
const VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

type Screen =
  | "home"
  | "trending"
  | "library"
  | "profile"
  | "search"
  | "detail"
  | "video"
  | "audio"
  | "comments"
  | "coins"
  | "rewards"
  | "ai"
  | "register"
  | "creator"
  | "create"
  | "settings"
  | "premium"
  | "community"
  | "downloads"
  | "notifications";

interface Story {
  id: string;
  title: string;
  genre: string;
  category: string;
  views: number;
  likes: number;
  image: string;
  description: string;
  storyCaption: string;
  creator: string;
  episodes: number;
  lockedFrom: number;
  duration: number;
  status: string;
  videoUrl?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
}

interface CommentItem {
  id: string;
  user: string;
  text: string;
  likes: number;
}

interface CoinPackage {
  coins: number;
  amount: string;
  url: string;
}

interface AIMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const INITIAL_STORIES: Story[] = [
  {
    id: "story-1",
    title: "The Billionaire's Secret",
    genre: "Drama",
    category: "Popular",
    views: 142000,
    likes: 18500,
    image: FALLBACK_IMAGE,
    description: "A mysterious billionaire, a hidden past and one decision that changes everything.",
    storyCaption: "The Billionaire's Secret — Streaming!",
    creator: "Pocket Rivals Original",
    episodes: 10,
    lockedFrom: 3,
    duration: 2,
    status: "approved",
    videoUrl: VIDEO_URL,
  },
  {
    id: "story-2",
    title: "Midnight Symphony",
    genre: "Romance",
    category: "Trending",
    views: 98000,
    likes: 12400,
    image: FALLBACK_IMAGE,
    description: "Two musicians meet in a rain-soaked city and discover harmony in unexpected places.",
    storyCaption: "Midnight Symphony — Streaming!",
    creator: "Studio Audio",
    episodes: 8,
    lockedFrom: 2,
    duration: 2,
    status: "approved",
    videoUrl: VIDEO_URL,
  },
];

const DEFAULT_PACKAGES: CoinPackage[] = [
  { coins: 100, amount: "1.00", url: "https://www.paynow.co.zw/" },
  { coins: 550, amount: "5.00", url: "https://www.paynow.co.zw/" },
  { coins: 1200, amount: "10.00", url: "https://www.paynow.co.zw/" },
];

const INITIAL_COMMENTS: CommentItem[] = [
  { id: "c1", user: "AudioFan99", text: "This story is amazing! Can't wait for the next episode.", likes: 42 },
  { id: "c2", user: "SeriesBinge", text: "That plot twist completely caught me off guard 🔥", likes: 19 },
];

async function api<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }

  return data as T;
}

function normalizeShow(raw: any): Story {
  return {
    id: String(raw.id ?? raw._id ?? Math.random()),
    title: String(raw.title ?? "Untitled"),
    genre: String(raw.genre ?? "Drama"),
    category: String(raw.category ?? "Popular"),
    views: Number(raw.views ?? 0),
    likes: Number(raw.likes ?? 0),
    image: String(raw.image ?? FALLBACK_IMAGE),
    description: String(raw.description ?? ""),
    storyCaption: String(raw.storyCaption ?? ""),
    creator: String(raw.creator ?? raw.author ?? "Pocket Rivals"),
    episodes: Number(raw.episodes ?? raw.seasons?.[0]?.episodes?.length ?? 1),
    lockedFrom: Number(raw.lockedFrom ?? 3),
    duration: Number(raw.duration ?? 2),
    status: String(raw.status ?? "approved"),
    videoUrl: String(raw.videoUrl ?? raw.seasons?.[0]?.episodes?.[0]?.videoUrl ?? VIDEO_URL),
  };
}

function money(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function Header({ title, onBack, coins, goCoins }: { title: string; onBack?: () => void; coins: number; goCoins?: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.iconButton}>
            <Text style={styles.iconText}>‹</Text>
          </Pressable>
        ) : null}
        <Text style={styles.brand}>{title}</Text>
      </View>
      <View style={styles.headerRight}>
        {goCoins ? (
          <Pressable onPress={goCoins} style={styles.coinPill}>
            <Text style={{ fontSize: 13 }}>💎</Text>
            <Text style={styles.coinText}>{coins}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📂</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.mutedCenter}>{text}</Text>
    </View>
  );
}

function BottomNav({ active, go }: { active: Screen; go: (s: Screen) => void }) {
  const tabs: { key: Screen; label: string; icon: string }[] = [
    { key: "home", label: "Home", icon: "⌂" },
    { key: "trending", label: "Trending", icon: "⚡" },
    { key: "library", label: "Library", icon: "☰" },
    { key: "profile", label: "Profile", icon: "⊙" },
  ];

  return (
    <View style={styles.bottomNav}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <Pressable key={t.key} onPress={() => go(t.key)} style={styles.navItem}>
            <Text style={[styles.navIcon, isActive && styles.navActive]}>{t.icon}</Text>
            <Text style={[styles.navLabel, isActive && styles.navActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function HomeScreen({
  stories,
  openStory,
  go,
  coins,
  serverOnline,
}: {
  stories: Story[];
  openStory: (s: Story) => void;
  go: (s: Screen) => void;
  coins: number;
  serverOnline: boolean;
}) {
  const hero = stories[0] || INITIAL_STORIES[0];

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="PR Pocket Rivals" coins={coins} goCoins={() => go("coins")} />
      
      {!serverOnline ? (
        <View style={styles.connectionBar}>
          <View style={[styles.connectionDot, styles.connectionOffline]} />
          <Text style={styles.connectionText}>Server unavailable — using offline data</Text>
        </View>
      ) : (
        <View style={styles.connectionBar}>
          <View style={[styles.connectionDot, styles.connectionOnline]} />
          <Text style={styles.connectionText}>Connected to live server</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.hero} onPress={() => openStory(hero)}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>FEATURED ORIGINAL</Text>
            <Text style={styles.heroTitle}>{hero.title}</Text>
            <Text style={styles.heroDescription} numberOfLines={2}>{hero.description}</Text>
            <Pressable style={styles.primaryButton} onPress={() => openStory(hero)}>
              <Text style={styles.primaryButtonText}>▶ Watch now</Text>
            </Pressable>
          </View>
        </Pressable>

        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>For You</Text>
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={stories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.storyCard} onPress={() => openStory(item)}>
              <View style={styles.storyGradient} />
              <View style={styles.storyCardText}>
                <Text style={styles.storyGenre}>{item.genre}</Text>
                <Text style={styles.storyTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.storyMeta}>{money(item.plays)} plays · {money(item.likes)} likes</Text>
              </View>
            </Pressable>
          )}
        />

        <View style={styles.communityBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.communityTitle}>Pocket AI Assistant</Text>
            <Text style={styles.muted}>Chat with AI about shows or recommendations.</Text>
          </View>
          <Pressable style={styles.primaryButton} onPress={() => go("ai")}>
            <Text style={styles.primaryButtonText}>Ask AI</Text>
          </Pressable>
        </View>
      </ScrollView>
      <BottomNav active="home" go={go} />
    </SafeAreaView>
  );
}

function TrendingScreen({ stories, openStory, go, coins }: { stories: Story[]; openStory: (s: Story) => void; go: (s: Screen) => void; coins: number }) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Trending" coins={coins} goCoins={() => go("coins")} />
      <FlatList
        data={stories}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable style={styles.storyRow} onPress={() => openStory(item)}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.muted}>{item.genre} · {money(item.views)} views</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
      <BottomNav active="trending" go={go} />
    </SafeAreaView>
  );
}

function LibraryScreen({ stories, saved, downloaded, openStory, go, coins }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Library" coins={coins} goCoins={() => go("coins")} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.settingsLink} onPress={() => go("downloads")}>
          <Text style={styles.settingTitle}>Downloads</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable style={styles.settingsLink} onPress={() => go("community")}>
          <Text style={styles.settingTitle}>Creator Community</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </ScrollView>
      <BottomNav active="library" go={go} />
    </SafeAreaView>
  );
}

function ProfileScreen({ user, go, coins, logout }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Profile" coins={coins} goCoins={() => go("coins")} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user ? user.username.slice(0, 1).toUpperCase() : "G"}</Text>
          </View>
          <Text style={styles.profileName}>{user ? user.username : "Guest User"}</Text>
          <Text style={styles.muted}>{user ? user.email : "Sign in to access creator features"}</Text>
        </View>

        <View style={styles.profileGrid}>
          <Pressable style={styles.profileTile} onPress={() => go("coins")}>
            <Text style={styles.tileIcon}>💎</Text>
            <Text style={styles.tileText}>Wallet & Coins</Text>
          </Pressable>
          <Pressable style={styles.profileTile} onPress={() => go("rewards")}>
            <Text style={styles.tileIcon}>🎁</Text>
            <Text style={styles.tileText}>Earn Free Coins</Text>
          </Pressable>
          <Pressable style={styles.profileTile} onPress={() => go("create")}>
            <Text style={styles.tileIcon}>＋</Text>
            <Text style={styles.tileText}>Upload Show</Text>
          </Pressable>
          <Pressable style={styles.profileTile} onPress={() => go("settings")}>
            <Text style={styles.tileIcon}>⚙</Text>
            <Text style={styles.tileText}>Settings</Text>
          </Pressable>
        </View>

        {user ? (
          <Pressable style={[styles.secondaryButton, { marginTop: 25 }]} onPress={logout}>
            <Text style={styles.secondaryButtonText}>Log out</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.primaryButton, { alignSelf: "stretch", marginTop: 25, alignItems: "center" }]} onPress={() => go("register")}>
            <Text style={styles.primaryButtonText}>Sign In / Register</Text>
          </Pressable>
        )}
      </ScrollView>
      <BottomNav active="profile" go={go} />
    </SafeAreaView>
  );
}

function DetailScreen({ story, liked, saved, followed, onLike, onSave, onFollow, openComments, openPlayer, openCreator, go, coins }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title={story.title} onBack={() => go("home")} coins={coins} goCoins={() => go("coins")} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.detailGenre}>{story.genre.toUpperCase()}</Text>
        <Text style={styles.detailTitle}>{story.title}</Text>
        <Text style={styles.detailDescription}>{story.description}</Text>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionButton} onPress={onLike}>
            <Text style={styles.actionIcon}>{liked ? "♥" : "♡"}</Text>
            <Text style={styles.actionLabel}>{money(story.likes)}</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={openComments}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionLabel}>Comments</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={onSave}>
            <Text style={styles.actionIcon}>{saved ? "📁" : "📂"}</Text>
            <Text style={styles.actionLabel}>Save</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={onFollow}>
            <Text style={styles.actionIcon}>{followed ? "✓" : "+"}</Text>
            <Text style={styles.actionLabel}>Follow</Text>
          </Pressable>
        </View>

        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Episodes ({story.episodes})</Text>
        </View>
        {Array.from({ length: story.episodes }).map((_, i) => {
          const epNum = i + 1;
          const isLocked = epNum >= story.lockedFrom;
          return (
            <Pressable key={i} style={styles.episodeRow} onPress={() => openPlayer(epNum)}>
              <View style={styles.episodeNumber}>
                <Text style={styles.episodeNumberText}>{epNum}</Text>
              </View>
              <View style={styles.episodeInfo}>
                <Text style={styles.episodeTitle}>Episode {epNum}</Text>
                <Text style={styles.muted}>{isLocked ? "Locked (50 coins)" : "Free to watch"}</Text>
              </View>
              <Text style={styles.chevron}>{isLocked ? "🔒" : "▶"}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function VideoScreen({ story, episode, onBack, onNext, onCoins, coins }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.videoHeader}>
        <Pressable onPress={onBack} style={styles.iconButton}>
          <Text style={styles.iconText}>‹</Text>
        </Pressable>
        <Text style={styles.videoHeaderTitle}>{story.title} - Ep {episode}</Text>
      </View>
      <View style={styles.videoContainer}>
        <Text style={{ color: "#fff", marginBottom: 20 }}>Video Streaming Simulator Active</Text>
        <Pressable style={styles.primaryButton} onPress={onNext}>
          <Text style={styles.primaryButtonText}>Next Episode</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CommentsScreen({ comments, text, setText, onSend, liked, onLike, onBack, user }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Comments" onBack={onBack} coins={0} />
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.commentsList}
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <View style={styles.commentBody}>
              <Text style={styles.commentUser}>{item.user}</Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
            <Pressable onPress={() => onLike(item.id)} style={styles.commentLike}>
              <Text style={styles.commentHeart}>{liked[item.id] ? "♥" : "♡"}</Text>
              <Text style={styles.muted}>{item.likes}</Text>
            </Pressable>
          </View>
        )}
      />
      <View style={styles.commentComposer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor="#666"
          value={text}
          onChangeText={setText}
          multiline
        />
        <Pressable style={styles.sendButton} onPress={onSend}>
          <Text style={styles.sendButtonText}>Post</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CoinsScreen({ packages, coins, onBuy, onBack, loading, go }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Wallet & Coins" onBack={onBack} coins={coins} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.walletCard}>
          <Text style={styles.walletLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.walletCoins}>💎 {coins}</Text>
          <Text style={styles.muted}>Use coins to unlock exclusive episodes and premium stories.</Text>
        </View>

        <Pressable style={[styles.secondaryButton, { marginBottom: 15 }]} onPress={() => go("rewards")}>
          <Text style={styles.secondaryButtonText}>🎁 Watch Ads for Free Coins</Text>
        </Pressable>

        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Top up coins</Text>
        </View>
        {packages.map((pkg: CoinPackage, i: number) => (
          <View key={i} style={styles.coinPackage}>
            <View>
              <Text style={styles.packageCoins}>💎 {pkg.coins} Coins</Text>
              <Text style={styles.muted}>${pkg.amount} USD via Paynow</Text>
            </View>
            <Pressable style={styles.buyButton} onPress={() => onBuy(pkg)} disabled={loading}>
              <Text style={styles.buyButtonText}>Buy</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function RewardsScreen({ onBack, user, coins, onWatchAd, adReady, adStatus }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Earn Coins" onBack={onBack} coins={coins} />
      <View style={styles.rewards}>
        <Text style={styles.rewardIcon}>🎁</Text>
        <Text style={styles.pageTitle}>Rewarded Ads</Text>
        <Text style={styles.mutedCenter}>{adStatus}</Text>
        <Pressable style={[styles.primaryButton, { marginTop: 25 }]} onPress={onWatchAd} disabled={!adReady}>
          <Text style={styles.primaryButtonText}>Watch Ad & Earn Coins</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function AIScreen({ messages, input, setInput, onSend, loading, error, onBack }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Pocket AI" onBack={onBack} coins={0} />
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.aiList}
        renderItem={({ item }) => (
          <View style={[styles.aiBubble, item.role === "user" ? styles.aiUser : styles.aiAssistant]}>
            <Text style={styles.aiRole}>{item.role === "user" ? "You" : "Pocket AI"}</Text>
            <Text style={styles.aiText}>{item.text}</Text>
          </View>
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.aiComposer}>
        <TextInput
          style={styles.aiInput}
          placeholder="Ask Pocket AI..."
          placeholderTextColor="#666"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <Pressable style={styles.sendButton} onPress={onSend} disabled={loading}>
          {loading ? <ActivityIndicator color="#050505" /> : <Text style={styles.sendButtonText}>Send</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function RegisterScreen({ onBack, onSubmit, onLogin, mode, setMode, username, setUsername, email, setEmail, password, setPassword, loading }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title={mode === "register" ? "Create Account" : "Sign In"} onBack={onBack} coins={0} />
      <ScrollView contentContainerStyle={styles.form}>
        {mode === "register" ? (
          <>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput style={styles.formInput} placeholder="Your username" placeholderTextColor="#666" value={username} onChangeText={setUsername} />
          </>
        ) : null}

        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput style={styles.formInput} placeholder="name@example.com" placeholderTextColor="#666" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput style={styles.formInput} placeholder="At least 6 characters" placeholderTextColor="#666" value={password} onChangeText={setPassword} secureTextEntry />

        <Pressable style={[styles.primaryButton, { alignSelf: "stretch", marginTop: 25, alignItems: "center" }]} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#050505" /> : <Text style={styles.primaryButtonText}>{mode === "register" ? "Create Account" : "Sign In"}</Text>}
        </Pressable>

        <Pressable style={{ marginTop: 20, alignSelf: "center" }} onPress={() => setMode(mode === "register" ? "login" : "register")}>
          <Text style={styles.linkText}>{mode === "register" ? "Already have an account? Sign in" : "Need an account? Register"}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function CreatorScreen({ story, following, onToggleFollow, onBack, go }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Creator Studio" onBack={onBack} coins={0} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHero}>
          <View style={styles.creatorAvatar}>
            <Text style={styles.avatarText}>C</Text>
          </View>
          <Text style={styles.profileName}>Studio Creator</Text>
          <Text style={styles.muted}>Content Creator & Storyteller</Text>
          <Pressable style={[styles.primaryButton, { marginTop: 15 }]} onPress={onToggleFollow}>
            <Text style={styles.primaryButtonText}>{following ? "Following" : "+ Follow"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CreateScreen({ title, setTitle, description, setDescription, genre, setGenre, onPublish, onBack, loading, user }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Upload Show" onBack={onBack} coins={0} />
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.fieldLabel}>Title</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Story title..." placeholderTextColor="#666" style={styles.formInput} />

        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput value={description} onChangeText={setDescription} placeholder="Tell viewers what this story is about..." placeholderTextColor="#666" style={[styles.formInput, styles.largeInput]} multiline />

        <Pressable style={[styles.primaryButton, { alignSelf: "stretch", marginTop: 20, alignItems: "center" }]} onPress={onPublish} disabled={loading || !user}>
          {loading ? <ActivityIndicator color="#050505" /> : <Text style={styles.primaryButtonText}>Submit to server</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsScreen({ autoPlay, setAutoPlay, autoUnlock, setAutoUnlock, notifications, setNotifications, onBack, go }: any) {
  const row = (title: string, value: boolean, setValue: (v: boolean) => void) => (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <Switch value={value} onValueChange={setValue} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Settings" onBack={onBack} coins={0} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {row("Autoplay", autoPlay, setAutoPlay)}
        {row("Auto unlock", autoUnlock, setAutoUnlock)}
        {row("Notifications", notifications, setNotifications)}
      </ScrollView>
    </SafeAreaView>
  );
}

function PremiumScreen({ onBack }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Premium" onBack={onBack} coins={0} />
      <View style={styles.premium}>
        <Text style={styles.premiumIcon}>✦</Text>
        <Text style={styles.pageTitle}>Pocket Rivals Premium</Text>
        <Text style={styles.mutedCenter}>Premium memberships can be connected to your production billing provider later.</Text>
      </View>
    </SafeAreaView>
  );
}

function CommunityScreen({ go, stories }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Community" onBack={() => go("home")} coins={0} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Creator community</Text>
        {stories.map((s: Story) => (
          <View key={s.id} style={styles.communityCard}>
            <View style={styles.creatorAvatarSmall}>
              <Text style={{ color: "#fff" }}>{s.creator.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>{s.creator}</Text>
              <Text style={styles.muted}>{s.genre} · {money(s.plays)} plays</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function DownloadsScreen({ stories, downloaded, openStory, onBack }: any) {
  const items = stories.filter((s: Story) => downloaded[s.id]);
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Downloads" onBack={onBack} coins={0} />
      {items.length ? (
        <FlatList data={items} keyExtractor={(x: any) => x.id} contentContainerStyle={styles.listContent} renderItem={({ item }) => <StoryRow story={item} onPress={() => openStory(item)} />} />
      ) : (
        <EmptyState title="No downloads" text="Downloads are kept as local app state for this testing build." />
      )}
    </SafeAreaView>
  );
}

function NotificationsScreen({ onBack }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Notifications" onBack={onBack} coins={0} />
      <EmptyState title="You're all caught up" text="Creator and story notifications will appear here." />
    </SafeAreaView>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [previousScreen, setPreviousScreen] = useState<Screen>("home");
  const [stories, setStories] = useState<Story[]>(INITIAL_STORIES);
  const [selectedStory, setSelectedStory] = useState<Story>(INITIAL_STORIES[0]);

  const [coins, setCoins] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const likedRef = useRef<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const [commentLiked, setCommentLiked] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [comments, setComments] = useState<CommentItem[]>(INITIAL_COMMENTS);
  const [commentText, setCommentText] = useState("");
  const [currentEpisode, setCurrentEpisode] = useState(1);

  const [autoPlay, setAutoPlay] = useState(true);
  const [autoUnlock, setAutoUnlock] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryDescription, setNewStoryDescription] = useState("");
  const [newStoryGenre, setNewStoryGenre] = useState("Drama");
  const [createLoading, setCreateLoading] = useState(false);

  const [aiMessages, setAiMessages] = useState<AIMessage[]>([
    { id: "welcome", role: "assistant", text: "Hey 👋 I'm Pocket AI. Ask me about stories, creators or the Pocket Rivals experience." },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>(DEFAULT_PACKAGES);
  const [coinLoading, setCoinLoading] = useState(false);

  const [serverOnline, setServerOnline] = useState(false);
  const [levelPlayReady, setLevelPlayReady] = useState(false);
  const [rewardedAdReady, setRewardedAdReady] = useState(false);
  const [rewardedAdStatus, setRewardedAdStatus] = useState("Initializing…");
  const rewardedAdRef = useRef<LevelPlayRewardedAd | null>(null);

  const [creatorFollowing, setCreatorFollowing] = useState(false);

  // FIXED JSON HEALTH CHECK
  useEffect(() => {
    let mounted = true;

    const checkServer = async () => {
      try {
        const response = await fetch(`${API_URL}/api/health`);
        const data = await response.json();

        console.log("POCKET RIVALS API STATUS:", response.status);
        console.log("POCKET RIVALS API DATA:", data);

        if (!mounted) return;

        setServerOnline(response.ok && data.status === "online");
      } catch (error: any) {
        console.log("POCKET RIVALS API ERROR:", error?.message || String(error));
        if (mounted) {
          setServerOnline(false);
        }
      }
    };

    checkServer();
    const timer = setInterval(checkServer, 15000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeLevelPlay() {
      if (LEVELPLAY_APP_KEY.startsWith("PUT_YOUR_")) {
        if (mounted) setRewardedAdStatus("Add your LevelPlay App Key");
        return;
      }

      try {
        setRewardedAdStatus("Connecting to LevelPlay…");
        const initialAdUserId = String(user?.id || `guest${Date.now()}`).replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
        const initRequest = LevelPlayInitRequest.builder(LEVELPLAY_APP_KEY).withUserId(initialAdUserId).build();

        const listener: LevelPlayInitListener = {
          onInitFailed: () => {
            if (mounted) {
              setLevelPlayReady(false);
              setRewardedAdStatus("Ad service unavailable");
            }
          },
          onInitSuccess: () => {
            if (!mounted) return;
            setLevelPlayReady(true);
            setRewardedAdStatus("Ready — loading rewarded ad…");

            if (LEVELPLAY_REWARDED_AD_UNIT_ID.startsWith("PUT_YOUR_")) {
              setRewardedAdStatus("Add your Rewarded Ad Unit ID");
              return;
            }

            const ad = new LevelPlayRewardedAd(LEVELPLAY_REWARDED_AD_UNIT_ID);
            rewardedAdRef.current = ad;

            const adListener: LevelPlayRewardedAdListener = {
              onAdLoaded: () => {
                if (!mounted) return;
                setRewardedAdReady(true);
                setRewardedAdStatus("Ad ready");
              },
              onAdLoadFailed: () => {
                if (!mounted) return;
                setRewardedAdReady(false);
                setRewardedAdStatus("No ad available — retrying soon");
              },
              onAdInfoChanged: () => {},
              onAdDisplayed: () => {
                if (mounted) setRewardedAdStatus("Ad playing…");
              },
              onAdDisplayFailed: () => {
                if (!mounted) return;
                setRewardedAdReady(false);
                setRewardedAdStatus("Ad failed to display");
              },
              onAdClicked: () => {},
              onAdClosed: () => {
                if (!mounted) return;
                setRewardedAdReady(false);
                setRewardedAdStatus("Reward being verified by server…");
                setTimeout(() => {
                  if (mounted) rewardedAdRef.current?.loadAd().catch(() => {});
                }, 700);
              },
              onAdRewarded: () => {
                if (mounted) setRewardedAdStatus("Reward received — server is confirming it…");
                refreshServerBalance();
              },
            };

            ad.setListener(adListener);
            ad.loadAd().catch(() => {
              if (mounted) setRewardedAdStatus("Unable to load ad");
            });
          },
        };

        await LevelPlay.init(initRequest, listener);
      } catch {
        if (mounted) {
          setLevelPlayReady(false);
          setRewardedAdStatus("Ad service unavailable");
        }
      }
    }

    initializeLevelPlay();
    return () => {
      mounted = false;
    };
  }, []);

  async function refreshServerBalance() {
    if (!token) return;
    try {
      const data = await api<any>("/api/me", {}, token);
      const nextCoins = Number(data?.user?.coins ?? data?.coins);
      if (Number.isFinite(nextCoins)) {
        setCoins(nextCoins);
      }
    } catch {}
  }

  async function watchRewardedAd() {
    const ad = rewardedAdRef.current;
    if (!ad || !levelPlayReady) {
      Alert.alert("Ads unavailable", "The rewarded ad service is not ready yet.");
      return;
    }
    try {
      await ad.showAd(LEVELPLAY_REWARDED_PLACEMENT);
    } catch (error: any) {
      Alert.alert("Ad unavailable", error?.message || "Please try again.");
    }
  }

  const navigate = (next: Screen, story?: Story) => {
    setPreviousScreen(screen);
    if (story) setSelectedStory(story);
    setScreen(next);
  };

  const back = () => setScreen(previousScreen || "home");

  useEffect(() => {
    loadShows();
    loadCoinPackages();
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const raw = await AsyncStorage.getItem("pocket_rivals_session");
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved?.token || !saved?.user) return;
      setToken(String(saved.token));
      setUser(saved.user);
      setCoins(Number(saved.coins ?? 0));
    } catch {
      await AsyncStorage.removeItem("pocket_rivals_session").catch(() => undefined);
    }
  }

  async function persistSession(nextUser: User, nextToken: string | null, nextCoins: number) {
    if (!nextToken) return;
    await AsyncStorage.setItem("pocket_rivals_session", JSON.stringify({ user: nextUser, token: nextToken, coins: nextCoins }));
  }

  useEffect(() => {
    likedRef.current = liked;
  }, [liked]);

  async function loadShows() {
    try {
      const data = await api<any>("/api/shows");
      const raw = Array.isArray(data) ? data : data.shows;
      if (Array.isArray(raw) && raw.length) {
        setStories(raw.map(normalizeShow));
      }
    } catch {}
  }

  async function loadCoinPackages() {
    try {
      const data = await api<any>("/api/coins/packages");
      const raw = Array.isArray(data) ? data : data.packages;
      if (Array.isArray(raw) && raw.length) {
        setCoinPackages(raw.map((x: any) => ({ coins: Number(x.coins), amount: String(x.amount ?? x.price ?? ""), url: String(x.url ?? x.paymentUrl ?? "") })));
      }
    } catch {
      setCoinPackages(DEFAULT_PACKAGES);
    }
  }

  function requireLogin(action: string) {
    if (user && token) return true;
    Alert.alert("Login required", `Please register or log in before you ${action}.`, [
      { text: "Later", style: "cancel" },
      { text: "Log in / Register", onPress: () => { setAuthMode("login"); navigate("register"); } },
    ]);
    return false;
  }

  async function toggleLike(story: Story) {
    if (!requireLogin("like videos")) return;
    const wasLiked = !!likedRef.current[story.id];
    if (wasLiked) return;

    setLiked((prev) => ({ ...prev, [story.id]: true }));
    likedRef.current = { ...likedRef.current, [story.id]: true };
    setStories((prev) => prev.map((s) => (s.id === story.id ? { ...s, likes: s.likes + 1 } : s)));

    try {
      await api(`/api/shows/${story.id}/like`, { method: "POST" }, token);
    } catch (e: any) {
      setLiked((prev) => ({ ...prev, [story.id]: false }));
      likedRef.current = { ...likedRef.current, [story.id]: false };
      setStories((prev) => prev.map((s) => (s.id === story.id ? { ...s, likes: Math.max(0, s.likes - 1) } : s)));
      Alert.alert("Like failed", e.message);
    }
  }

  function toggleSave(id: string) {
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function toggleFollow(story: Story) {
    if (!requireLogin("follow creators")) return;
    setFollowed((prev) => ({ ...prev, [story.id]: !prev[story.id] }));
  }

  async function postComment() {
    if (!requireLogin("comment")) return;
    const text = commentText.trim();
    if (!text) return;

    const local: CommentItem = { id: `local-${Date.now()}`, user: user!.username, text, likes: 0 };
    setComments((prev) => [local, ...prev]);
    setCommentText("");

    try {
      await api(`/api/shows/${selectedStory.id}/comments`, { method: "POST", body: JSON.stringify({ text }) }, token);
    } catch (e: any) {
      setComments((prev) => prev.filter((x) => x.id !== local.id));
      Alert.alert("Comment failed", e.message);
    }
  }

  async function likeComment(id: string) {
    if (!requireLogin("like comments")) return;
    try {
      const result = await api<any>(`/api/comments/${id}/like`, { method: "POST" }, token);
      setCommentLiked((prev) => ({ ...prev, [id]: !!result.liked }));
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, likes: Number(result.likes ?? c.likes) } : c)));
    } catch (e: any) {
      Alert.alert("Comment like failed", e.message);
    }
  }

  async function register() {
    const username = regUsername.trim();
    const email = regEmail.trim().toLowerCase();
    const password = regPassword;

    if (username.length < 3) return Alert.alert("Invalid username", "Use at least 3 characters.");
    if (!email.includes("@")) return Alert.alert("Invalid email", "Enter a valid email.");
    if (password.length < 6) return Alert.alert("Weak password", "Use at least 6 characters.");

    setAuthLoading(true);
    try {
      await api("/api/signup", { method: "POST", body: JSON.stringify({ username, email, password }) });
      await loginAccount(email, password, true);
    } catch (e: any) {
      Alert.alert("Registration failed", e.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function loginAccount(emailOverride?: string, passwordOverride?: string, fromRegister = false) {
    const email = (emailOverride ?? regEmail).trim().toLowerCase();
    const password = passwordOverride ?? regPassword;

    if (!fromRegister) setAuthLoading(true);
    try {
      const login = await api<any>("/api/login", { method: "POST", body: JSON.stringify({ email, password }) });
      const newToken = login.token ?? login.accessToken ?? null;
      if (!newToken) throw new Error("The server did not return a login token.");

      const account = login.user ?? login.account ?? { username: regUsername || email.split("@")[0], email };
      const nextUser: User = { id: account.id ?? account._id, username: account.username, email: account.email ?? email };
      const nextCoins = Number(login.coins ?? account.coins ?? 0);

      setToken(newToken);
      setUser(nextUser);
      setCoins(nextCoins);
      await persistSession(nextUser, newToken, nextCoins);
      navigate("profile");
    } catch (e: any) {
      Alert.alert("Login failed", e.message || "Unable to sign in.");
    } finally {
      if (!fromRegister) setAuthLoading(false);
    }
  }

  async function logout() {
    await AsyncStorage.removeItem("pocket_rivals_session").catch(() => undefined);
    setUser(null);
    setToken(null);
    setCoins(0);
    navigate("home");
  }

  async function sendAI() {
    const message = aiInput.trim();
    if (!message || aiLoading) return;

    setAiError("");
    const userMessage: AIMessage = { id: `u-${Date.now()}`, role: "user", text: message };
    const nextMessages = [...aiMessages, userMessage];
    setAiMessages(nextMessages);
    setAiInput("");
    setAiLoading(true);

    try {
      const result = await api<any>("/api/ai/chat", { method: "POST", body: JSON.stringify({ message, messages: nextMessages }) }, token);
      setAiMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", text: String(result.reply || "Pocket AI returned no text.") }]);
    } catch (e: any) {
      setAiError(e.message || "Pocket AI is unavailable.");
    } finally {
      setAiLoading(false);
    }
  }

  async function publishStory() {
    if (!requireLogin("publish")) return;
    if (!newStoryTitle.trim()) return Alert.alert("Missing title", "Add a title.");
    if (!newStoryDescription.trim()) return Alert.alert("Missing description", "Add a description.");

    setCreateLoading(true);
    try {
      const payload = {
        title: newStoryTitle.trim(),
        description: newStoryDescription.trim(),
        genre: newStoryGenre.trim() || "Drama",
        author: user!.username,
        creator: user!.username,
        image: FALLBACK_IMAGE,
        plays: 0,
        likes: 0,
        episodes: 1,
        lockedFrom: 2,
        duration: 1,
        status: "pending",
        videoUrl: VIDEO_URL,
      };

      const result = await api<any>("/api/shows", { method: "POST", body: JSON.stringify(payload) }, token);
      if (result?.show) {
        setStories((prev) => [normalizeShow(result.show), ...prev]);
      } else {
        await loadShows();
      }

      setNewStoryTitle("");
      setNewStoryDescription("");
      Alert.alert("Submitted", "Your story was sent to the server for review.");
      navigate("creator");
    } catch (e: any) {
      Alert.alert("Publish failed", e.message);
    } finally {
      setCreateLoading(false);
    }
  }

  async function buyCoins(pkg: CoinPackage) {
    if (!requireLogin("buy coins")) return;
    if (pkg.url) {
      await Linking.openURL(pkg.url);
    }
  }

  function openEpisode(ep: number) {
    const locked = ep >= selectedStory.lockedFrom;
    if (!locked || unlocked[`${selectedStory.id}:${ep}`]) {
      setCurrentEpisode(ep);
      navigate("video");
      return;
    }
    if (!requireLogin("unlock episodes")) return;
    if (coins < 50) {
      Alert.alert("Not enough coins", "You need 50 coins to unlock this episode.");
      return;
    }
    setUnlocked((prev) => ({ ...prev, [`${selectedStory.id}:${ep}`]: true }));
    setCurrentEpisode(ep);
    navigate("video");
  }

  function openStory(story: Story) {
    setSelectedStory(story);
    navigate("detail");
  }

  const screenContent = (() => {
    if (screen === "home") return <HomeScreen stories={stories} openStory={openStory} go={navigate} coins={coins} serverOnline={serverOnline} />;
    if (screen === "trending") return <TrendingScreen stories={stories} openStory={openStory} go={navigate} coins={coins} />;
    if (screen === "library") return <LibraryScreen stories={stories} saved={saved} downloaded={downloaded} openStory={openStory} go={navigate} coins={coins} />;
    if (screen === "profile") return <ProfileScreen user={user} go={navigate} coins={coins} logout={logout} />;
    if (screen === "search") return <SearchScreen stories={stories} query={searchQuery} setQuery={setSearchQuery} openStory={openStory} go={navigate} coins={coins} />;
    if (screen === "detail") return <DetailScreen story={selectedStory} liked={!!liked[selectedStory.id]} saved={!!saved[selectedStory.id]} followed={!!followed[selectedStory.id]} onLike={() => toggleLike(selectedStory)} onSave={() => toggleSave(selectedStory.id)} onFollow={() => toggleFollow(selectedStory)} openComments={() => navigate("comments")} openPlayer={openEpisode} go={navigate} coins={coins} />;
    if (screen === "video") return <VideoScreen story={selectedStory} episode={currentEpisode} onBack={() => navigate("detail")} onNext={() => { if (currentEpisode < selectedStory.episodes) openEpisode(currentEpisode + 1); }} coins={coins} />;
    if (screen === "comments") return <CommentsScreen comments={comments} text={commentText} setText={setCommentText} onSend={postComment} liked={commentLiked} onLike={likeComment} onBack={back} user={user} />;
    if (screen === "coins") return <CoinsScreen packages={coinPackages} coins={coins} onBuy={buyCoins} onBack={back} loading={coinLoading} go={navigate} />;
    if (screen === "rewards") return <RewardsScreen onBack={back} user={user} coins={coins} onWatchAd={watchRewardedAd} adReady={rewardedAdReady} adStatus={rewardedAdStatus} />;
    if (screen === "ai") return <AIScreen messages={aiMessages} input={aiInput} setInput={setAiInput} onSend={sendAI} loading={aiLoading} error={aiError} onBack={back} />;
    if (screen === "register") return <RegisterScreen onBack={back} onSubmit={register} onLogin={() => loginAccount()} mode={authMode} setMode={setAuthMode} username={regUsername} setUsername={setRegUsername} email={regEmail} setEmail={setRegEmail} password={regPassword} setPassword={setRegPassword} loading={authLoading} />;
    if (screen === "creator") return <CreatorScreen story={selectedStory} following={creatorFollowing} onToggleFollow={() => setCreatorFollowing((v) => !v)} onBack={back} go={navigate} />;
    if (screen === "create") return <CreateScreen title={newStoryTitle} setTitle={setNewStoryTitle} description={newStoryDescription} setDescription={setNewStoryDescription} genre={newStoryGenre} setGenre={setNewStoryGenre} onPublish={publishStory} onBack={back} loading={createLoading} user={user} />;
    if (screen === "settings") return <SettingsScreen autoPlay={autoPlay} setAutoPlay={setAutoPlay} autoUnlock={autoUnlock} setAutoUnlock={setAutoUnlock} notifications={notificationsEnabled} setNotifications={setNotificationsEnabled} onBack={back} go={navigate} />;
    if (screen === "premium") return <PremiumScreen onBack={back} />;
    if (screen === "community") return <CommunityScreen go={navigate} stories={stories} />;
    if (screen === "downloads") return <DownloadsScreen stories={stories} downloaded={downloaded} openStory={openStory} onBack={back} />;
    if (screen === "notifications") return <NotificationsScreen onBack={back} />;
    return <HomeScreen stories={stories} openStory={openStory} go={navigate} coins={coins} serverOnline={serverOnline} />;
  })();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      {screenContent}
    </>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#050505" },
  scrollContent: { padding: 16, paddingBottom: 100 },
  listContent: { padding: 16, paddingBottom: 100 },
  header: { minHeight: 60, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#050505", borderBottomWidth: 1, borderBottomColor: "#171717" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { color: "#fff", fontSize: 19, fontWeight: "900", letterSpacing: 1 },
  coinPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 18, backgroundColor: "#191919" },
  coinText: { color: "#fff", fontWeight: "800" },
  iconButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#171717" },
  iconText: { color: "#fff", fontSize: 42, lineHeight: 44, fontWeight: "800", marginTop: -3 },
  connectionBar: { minHeight: 30, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", backgroundColor: "#0b0b0b", borderBottomWidth: 1, borderBottomColor: "#151515" },
  connectionDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  connectionOnline: { backgroundColor: "#35d07f" },
  connectionOffline: { backgroundColor: "#777" },
  connectionText: { color: "#888", fontSize: 10, fontWeight: "700" },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, height: 70, backgroundColor: "#090909", borderTopWidth: 1, borderTopColor: "#1d1d1d", flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingBottom: Platform.OS === "ios" ? 10 : 2 },
  navItem: { alignItems: "center", justifyContent: "center", minWidth: 70 },
  navIcon: { color: "#777", fontSize: 22, fontWeight: "800" },
  navLabel: { color: "#777", fontSize: 10, marginTop: 3 },
  navActive: { color: "#fff" },
  hero: { height: 430, borderRadius: 22, overflow: "hidden", backgroundColor: "#121212", marginBottom: 24 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.54)" },
  heroContent: { flex: 1, justifyContent: "flex-end", padding: 22 },
  heroEyebrow: { color: "#bbb", fontSize: 11, fontWeight: "900", letterSpacing: 1.2, marginBottom: 8 },
  heroTitle: { color: "#fff", fontSize: 34, fontWeight: "900", lineHeight: 39 },
  heroDescription: { color: "#ddd", lineHeight: 21, marginTop: 10, marginBottom: 16 },
  primaryButton: { minHeight: 46, paddingHorizontal: 20, borderRadius: 23, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", alignSelf: "flex-start", marginTop: 14 },
  primaryButtonText: { color: "#050505", fontWeight: "900" },
  secondaryButton: { minHeight: 46, paddingHorizontal: 20, borderRadius: 23, borderWidth: 1, borderColor: "#333", alignItems: "center", justifyContent: "center", alignSelf: "stretch", marginTop: 12 },
  secondaryButtonText: { color: "#fff", fontWeight: "800" },
  sectionTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 12 },
  sectionTitleText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  storyCard: { width: Math.min(190, width * 0.46), height: 260, borderRadius: 18, overflow: "hidden", backgroundColor: "#151515", marginRight: 12 },
  storyGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.42)" },
  storyCardText: { position: "absolute", left: 14, right: 14, bottom: 14 },
  storyGenre: { color: "#bbb", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  storyTitle: { color: "#fff", fontSize: 18, fontWeight: "900", marginTop: 4 },
  storyMeta: { color: "#ccc", fontSize: 11, marginTop: 5 },
  storyRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#101010", borderRadius: 16, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "#181818" },
  rowInfo: { flex: 1, paddingHorizontal: 12 },
  rowTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 5 },
  muted: { color: "#8c8c8c", fontSize: 12, lineHeight: 18 },
  mutedCenter: { color: "#8c8c8c", fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 340 },
  chevron: { color: "#777", fontSize: 26, paddingHorizontal: 5 },
  communityBanner: { backgroundColor: "#111", borderWidth: 1, borderColor: "#222", borderRadius: 17, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  communityTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginBottom: 4 },
  pageTitle: { color: "#fff", fontSize: 28, fontWeight: "900", marginBottom: 7 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  emptyIcon: { fontSize: 50, marginBottom: 10 },
  emptyTitle: { color: "#fff", fontSize: 20, fontWeight: "900", marginBottom: 7 },
  profileHero: { alignItems: "center", paddingVertical: 22 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#1d1d1d", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#333", marginBottom: 10 },
  creatorAvatar: { width: 94, height: 94, borderRadius: 47, backgroundColor: "#1d1d1d", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#333", marginBottom: 10 },
  avatarText: { color: "#fff", fontSize: 34, fontWeight: "900" },
  profileName: { color: "#fff", fontSize: 21, fontWeight: "900", marginBottom: 4 },
  profileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 15 },
  profileTile: { width: "48%", backgroundColor: "#111", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#222" },
  tileIcon: { fontSize: 24, marginBottom: 8 },
  tileText: { color: "#fff", fontWeight: "800" },
  detailGenre: { color: "#999", fontWeight: "900", fontSize: 11, letterSpacing: 1, marginTop: 18 },
  detailTitle: { color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 4 },
  detailDescription: { color: "#ccc", lineHeight: 22, marginTop: 15 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 15 },
  actionButton: { alignItems: "center", width: "23%", paddingVertical: 9, backgroundColor: "#111", borderRadius: 13 },
  actionIcon: { color: "#fff", fontSize: 21 },
  actionLabel: { color: "#aaa", fontSize: 10, marginTop: 4 },
  episodeRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#171717" },
  episodeNumber: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#181818", alignItems: "center", justifyContent: "center" },
  episodeNumberText: { color: "#fff", fontWeight: "900" },
  episodeInfo: { flex: 1, paddingHorizontal: 12 },
  episodeTitle: { color: "#fff", fontWeight: "800", marginBottom: 2 },
  videoHeader: { minHeight: 62, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#050505" },
  videoHeaderTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },
  videoContainer: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  commentsList: { padding: 16, paddingBottom: 12 },
  commentRow: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#171717", alignItems: "flex-start" },
  commentBody: { flex: 1, paddingHorizontal: 10 },
  commentUser: { color: "#fff", fontWeight: "800", marginBottom: 4 },
  commentText: { color: "#ddd", lineHeight: 19 },
  commentLike: { alignItems: "center", minWidth: 35 },
  commentHeart: { color: "#fff", fontSize: 20 },
  commentComposer: { flexDirection: "row", gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: "#222", backgroundColor: "#090909" },
  commentInput: { flex: 1, minHeight: 44, maxHeight: 110, backgroundColor: "#171717", borderRadius: 22, paddingHorizontal: 15, paddingVertical: 11, color: "#fff" },
  sendButton: { minWidth: 52, minHeight: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 15 },
  sendButtonText: { color: "#050505", fontWeight: "900" },
  walletCard: { backgroundColor: "#121212", borderWidth: 1, borderColor: "#252525", borderRadius: 22, padding: 22, marginBottom: 15 },
  walletLabel: { color: "#888", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  walletCoins: { color: "#fff", fontSize: 38, fontWeight: "900", marginVertical: 7 },
  coinPackage: { backgroundColor: "#111", borderWidth: 1, borderColor: "#222", borderRadius: 18, padding: 15, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  packageCoins: { color: "#fff", fontSize: 17, fontWeight: "900", marginBottom: 3 },
  buyButton: { minWidth: 72, minHeight: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  buyButtonText: { color: "#050505", fontWeight: "900" },
  rewards: { flex: 1, alignItems: "center", justifyContent: "center", padding: 25 },
  rewardIcon: { fontSize: 70, marginBottom: 18 },
  aiList: { padding: 15, paddingBottom: 10 },
  aiBubble: { maxWidth: "88%", borderRadius: 18, padding: 13, marginBottom: 10 },
  aiUser: { alignSelf: "flex-end", backgroundColor: "#202020" },
  aiAssistant: { alignSelf: "flex-start", backgroundColor: "#111", borderWidth: 1, borderColor: "#222" },
  aiRole: { color: "#8e8e8e", fontSize: 10, fontWeight: "900", marginBottom: 4 },
  aiText: { color: "#fff", lineHeight: 20 },
  aiComposer: { flexDirection: "row", gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: "#222", backgroundColor: "#090909" },
  aiInput: { flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 23, backgroundColor: "#171717", color: "#fff", paddingHorizontal: 15, paddingVertical: 11 },
  errorText: { color: "#ff7777", paddingHorizontal: 16, paddingVertical: 7 },
  form: { padding: 18, paddingBottom: 60 },
  fieldLabel: { color: "#ddd", fontWeight: "800", marginTop: 18, marginBottom: 7 },
  formInput: { minHeight: 48, borderRadius: 14, backgroundColor: "#151515", borderWidth: 1, borderColor: "#252525", color: "#fff", paddingHorizontal: 14, paddingVertical: 12 },
  largeInput: { minHeight: 140, textAlignVertical: "top" },
  creatorAvatarSmall: { width: 45, height: 45, borderRadius: 23, backgroundColor: "#1d1d1d", alignItems: "center", justifyContent: "center", marginRight: 12 },
  communityCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 16, padding: 12, marginTop: 10 },
  settingRow: { minHeight: 62, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#181818" },
  settingTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  premium: { flex: 1, alignItems: "center", justifyContent: "center", padding: 25 },
  premiumIcon: { color: "#fff", fontSize: 60, marginBottom: 15 },
});

