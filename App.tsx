const LEVELPLAY_APP_KEY = "c2a26252-65fe-40ad-a904-31378e98a611";
const LEVELPLAY_REWARDED_AD_UNIT_ID = "DefaultRewardedAd";
const LEVELPLAY_INTERSTITIAL_AD_UNIT_ID = "DefaultInterstitialAd";
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
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from "expo-audio";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  LevelPlay,
  LevelPlayInitRequest,
  LevelPlayRewardedAd,
  LevelPlayInterstitialAd,
  type LevelPlayAdInfo,
  type LevelPlayAdError,
  type LevelPlayRewardedAdListener,
  type LevelPlayInterstitialAdListener,
} from "unity-levelplay-mediation";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  "http://16.170.245.45:3000";

const AI_MODEL = "gemini-3.7-flash";

const LEVELPLAY_APP_KEY =
  process.env.EXPO_PUBLIC_LEVELPLAY_APP_KEY?.trim() ||
  "PUT_YOUR_UNITY_LEVELPLAY_APP_KEY_HERE";
const LEVELPLAY_REWARDED_AD_UNIT_ID =
  process.env.EXPO_PUBLIC_LEVELPLAY_REWARDED_AD_UNIT_ID?.trim() ||
  "PUT_YOUR_REWARDED_AD_UNIT_ID_HERE";
const LEVELPLAY_INTERSTITIAL_AD_UNIT_ID =
  process.env.EXPO_PUBLIC_LEVELPLAY_INTERSTITIAL_AD_UNIT_ID?.trim() ||
  "PUT_YOUR_INTERSTITIAL_AD_UNIT_ID_HERE";
const LEVELPLAY_REWARDED_PLACEMENT =
  process.env.EXPO_PUBLIC_LEVELPLAY_REWARDED_PLACEMENT?.trim() ||
  "PocketRivalsReward";
const LEVELPLAY_INTERSTITIAL_PLACEMENT =
  process.env.EXPO_PUBLIC_LEVELPLAY_INTERSTITIAL_PLACEMENT?.trim() ||
  "PocketRivalsBetweenEpisodes";

type Screen =
  | "home" | "trending" | "audio" | "video" | "library" | "profile"
  | "search" | "detail" | "comments" | "creator" | "coins" | "rewards"
  | "notifications" | "downloads" | "ai" | "settings" | "premium"
  | "create" | "community" | "register";

type Story = {
  id: string;
  title: string;
  genre: string;
  author: string;
  creator: string;
  description: string;
  image: string;
  plays: number;
  likes: number;
  rating: number;
  episodes: number;
  lockedFrom: number;
  duration: number;
  audioUrl?: string;
  videoUrl?: string;
  likedBy?: string[];
  raw?: any;
};

type CommentItem = {
  id: string;
  user: string;
  text: string;
  likes: number;
};

type AIMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type CoinPackage = {
  coins: number;
  amount: string;
  url: string;
};

type User = {
  id?: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  followersCount?: number;
  followingCount?: number;
  isAdmin?: boolean;
};

type CreatorProfile = {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  followersCount: number;
  followingCount: number;
  videos: Story[];
};

const DEFAULT_PACKAGES: CoinPackage[] = [
  {
    coins: 3000,
    amount: "$24.99",
    url: "https://www.paynow.co.zw/Payment/Link/?q=c2VhcmNoPXJ1ZGR5Y2hhbml3YTc3NyU0MGdtYWlsLmNvbSZhbW91bnQ9MjQuOTkmcmVmZXJlbmNlPSZsPTE%3d"
  },
  {
    coins: 1200,
    amount: "$9.99",
    url: "https://www.paynow.co.zw/Payment/Link/?q=c2VhcmNoPXJ1ZGR5Y2hhbml3YTc3NyU0MGdtYWlsLmNvbSZhbW91bnQ9OS45OSZyZWZlcmVuY2U9Jmw9MQ%3d%3d"
  },
  {
    coins: 550,
    amount: "$4.99",
    url: "https://www.paynow.co.zw/Payment/Link/?q=c2VhcmNoPXJ1ZGR5Y2hhbml3YTc3NyU0MGdtYWlsLmNvbSZhbW91bnQ9NC45OSZyZWZlcmVuY2U9Jmw9MQ%3d%3d"
  },
  {
    coins: 100,
    amount: "$0.99",
    url: "https://www.paynow.co.zw/Payment/Link/?q=c2VhcmNoPXJ1ZGR5Y2hhbml3YTc3NyU0MGdtYWlsLmNvbSZhbW91bnQ9MC45OSZyZWZyZW5jZT0mbD0x%3d%3d"
  },
];

const money = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`
      : String(n);

function normalizeShow(x: any): Story {
  const firstEpisode =
    x?.seasons?.[0]?.episodes?.[0] ??
    x?.episodes?.[0] ??
    null;

  const serverVideoUrl =
    x?.videoUrl ??
    firstEpisode?.videoUrl ??
    firstEpisode?.url ??
    undefined;

  const serverAudioUrl =
    x?.audioUrl ??
    firstEpisode?.audioUrl ??
    undefined;

  const episodeCount =
    typeof x?.episodes === "number"
      ? x.episodes
      : Array.isArray(x?.episodes)
        ? x.episodes.length
        : Array.isArray(x?.seasons)
          ? x.seasons.reduce(
              (total: number, season: any) =>
                total + (Array.isArray(season?.episodes) ? season.episodes.length : 0),
              0
            )
          : 1;

  const image =
    typeof x?.thumbnail === "string" && x.thumbnail.trim()
      ? x.thumbnail.trim()
      : typeof x?.poster === "string" && x.poster.trim()
        ? x.poster.trim()
        : typeof firstEpisode?.thumbnail === "string" && firstEpisode.thumbnail.trim()
          ? firstEpisode.thumbnail.trim()
          : typeof firstEpisode?.poster === "string" && firstEpisode.poster.trim()
            ? firstEpisode.poster.trim()
            : typeof x?.cover === "string" && x.cover.trim()
              ? x.cover.trim()
              : typeof x?.image === "string" && x.image.trim()
                ? x.image.trim()
                : "";

  const title = typeof x?.title === "string" ? x.title : String(x?.title ?? "Untitled");
  const genre = typeof x?.genre === "string" ? x.genre : String(x?.genre ?? "Drama");
  const author = typeof x?.author === "string" ? x.author : String(x?.author?.username ?? x?.creator?.username ?? x?.creator ?? "Unknown");
  const creator = typeof x?.creator === "string" ? x.creator : String(x?.creator?.username ?? x?.author?.username ?? x?.author ?? "Unknown Creator");
  const description = typeof x?.description === "string" ? x.description : String(x?.description ?? "");

    return {
    id: String(x?.id ?? x?._id ?? Date.now()),
    title,
    genre,
    author,
    creator,
    description,
    image,
    plays: Number(x?.plays ?? x?.views ?? 0),
    likes: Number(x?.likes ?? 0),
    rating: Number(x?.rating ?? 0),
    episodes: Math.max(0, episodeCount),
    lockedFrom: 
      typeof x?.lockedFrom === "string" && x.lockedFrom.toLowerCase() === "free"
        ? 999999 
        : Number(x?.lockedFrom ?? x?.lockStatus ?? (x?.isLocked ? 1 : 2)),
    duration: Number(x?.duration ?? firstEpisode?.duration ?? 20),
    audioUrl: serverAudioUrl,
    videoUrl: serverVideoUrl,
    likedBy: Array.isArray(x?.likedBy) ? x.likedBy.map(String) : [],
    raw: x,
  };
}

async function api<T = any>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${response.status})`);
  }

  return data as T;
}

function Header({
  title,
  onBack,
  onAI,
  onCoins,
  coins,
}: {
  title: string;
  onBack?: () => void;
  onAI?: () => void;
  onCoins?: () => void;
  coins: number;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.iconButton}>
            <Text style={styles.iconText}>‹</Text>
          </Pressable>
        ) : (
          <Text style={styles.brand}>PR</Text>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <View style={styles.headerRight}>
        {onAI && (
          <Pressable onPress={onAI} style={styles.headerPill}>
            <Text style={styles.headerPillText}>AI</Text>
          </Pressable>
        )}
        {onCoins && (
          <Pressable onPress={onCoins} style={styles.coinPill}>
            <Text>💎</Text>
            <Text style={styles.coinText}>{money(coins)}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function BottomNav({
  active,
  go,
}: {
  active: Screen;
  go: (s: Screen) => void;
}) {
  const items: { key: Screen; icon: string; label: string }[] = [
    { key: "home", icon: "⌂", label: "Home" },
    { key: "trending", icon: "↗", label: "Trending" },
    { key: "library", icon: "▣", label: "Library" },
    { key: "profile", icon: "●", label: "Profile" },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => go(item.key)}
          style={styles.navItem}
        >
          <Text style={[styles.navIcon, active === item.key && styles.navActive]}>
            {item.icon}
          </Text>
          <Text style={[styles.navLabel, active === item.key && styles.navActive]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function SectionTitle({
  title,
  onPress,
}: {
  title: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {onPress && (
        <Pressable onPress={onPress}>
          <Text style={styles.linkText}>See all</Text>
        </Pressable>
      )}
    </View>
  );
}

function AnalyticsCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.analyticsCard}>
      <Text style={styles.analyticsValue}>{value}</Text>
      <Text style={styles.analyticsLabel}>{label}</Text>
    </View>
  );
}

function StoryCard({
  story,
  onPress,
}: {
  story: Story;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.storyCard}>
      <Image source={{ uri: story.image }} style={styles.storyImage} />
      <View style={styles.storyGradient} />
      <View style={styles.storyCardText}>
        <Text style={styles.storyGenre}>{story.genre.toUpperCase()}</Text>
        <Text style={styles.storyTitle} numberOfLines={2}>
          {story.title}
        </Text>
        <Text style={styles.storyMeta}>
          {money(story.plays)} plays · ⭐ {story.rating || "—"}
        </Text>
      </View>
    </Pressable>
  );
}

function StoryRow({
  story,
  onPress,
}: {
  story: Story;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.storyRow}>
      <Image source={{ uri: story.image }} style={styles.rowImage} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{story.title}</Text>
        <Text style={styles.muted}>{story.genre} · {story.episodes} episodes</Text>
        <Text style={styles.muted}>{money(story.plays)} plays</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>◌</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.mutedCenter}>{text}</Text>
      {action && (
        <Pressable style={styles.primaryButton} onPress={action.onPress}>
          <Text style={styles.primaryButtonText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

function HomeScreen({
  stories,
  openStory,
  go,
  coins,
}: {
  stories: Story[];
  openStory: (s: Story) => void;
  go: (s: Screen) => void;
  coins: number;
}) {
  const featured = stories[0];
  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Pocket Rivals"
        onAI={() => go("ai")}
        onCoins={() => go("coins")}
        coins={coins}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Image source={{ uri: featured?.image || "" }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>FEATURED ORIGINAL</Text>
            <Text style={styles.heroTitle}>{featured?.title || "Welcome to Pocket Rivals"}</Text>
            <Text style={styles.heroDescription} numberOfLines={3}>
              {featured?.description || "Watch stories, discover creators and explore AI video originals."}
            </Text>
            {featured && (
              <Pressable style={styles.primaryButton} onPress={() => openStory(featured)}>
                <Text style={styles.primaryButtonText}>▶ Watch now</Text>
              </Pressable>
            )}
          </View>
        </View>

        <SectionTitle title="For You" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} onPress={() => openStory(s)} />
          ))}
        </ScrollView>

        <SectionTitle title="Trending" onPress={() => go("trending")} />
        {stories.slice(0, 4).map((s) => (
          <StoryRow key={s.id} story={s} onPress={() => openStory(s)} />
        ))}

        <SectionTitle title="Community" />
        <Pressable style={styles.communityBanner} onPress={() => go("community")}>
          <View>
            <Text style={styles.communityTitle}>Meet the creators</Text>
            <Text style={styles.muted}>Follow, comment and discover new stories.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </ScrollView>
      <BottomNav active="home" go={go} />
    </SafeAreaView>
  );
}

function TrendingScreen({
  stories,
  openStory,
  go,
  coins,
}: {
  stories: Story[];
  openStory: (s: Story) => void;
  go: (s: Screen) => void;
  coins: number;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Trending" onAI={() => go("ai")} onCoins={() => go("coins")} coins={coins} />
      <FlatList
        data={stories}
        keyExtractor={(x) => x.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <StoryRow story={item} onPress={() => openStory(item)} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.pageTitle}>What's hot</Text>
            <Text style={styles.muted}>Real engagement from your server will appear here.</Text>
          </View>
        }
      />
      <BottomNav active="trending" go={go} />
    </SafeAreaView>
  );
}

function LibraryScreen({
  stories,
  saved,
  downloaded,
  openStory,
  go,
  coins,
}: {
  stories: Story[];
  saved: Record<string, boolean>;
  downloaded: Record<string, boolean>;
  openStory: (s: Story) => void;
  go: (s: Screen) => void;
  coins: number;
}) {
  const savedStories = stories.filter((s) => saved[s.id]);
  const downloadedStories = stories.filter((s) => downloaded[s.id]);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Library" onCoins={() => go("coins")} coins={coins} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SectionTitle title="Watch later" />
        {savedStories.length ? savedStories.map((s) => (
          <StoryRow key={s.id} story={s} onPress={() => openStory(s)} />
        )) : (
          <EmptyState title="Nothing saved yet" text="Save stories and they will appear here." />
        )}

        <SectionTitle title="Downloads" onPress={() => go("downloads")} />
        {downloadedStories.length ? downloadedStories.map((s) => (
          <StoryRow key={s.id} story={s} onPress={() => openStory(s)} />
        )) : (
          <EmptyState title="No downloads" text="Downloaded stories will appear here." />
        )}
      </ScrollView>
      <BottomNav active="library" go={go} />
    </SafeAreaView>
  );
}

function ProfileScreen({
  user,
  go,
  coins,
  logout,
  onCreator,
  onUploadAvatar,
  avatarUploading,
}: {
  user: User | null;
  go: (s: Screen) => void;
  coins: number;
  logout: () => void;
  onCreator: () => void;
  onUploadAvatar: () => void;
  avatarUploading: boolean;
}) {
  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Profile" onCoins={() => go("coins")} coins={coins} />
        <EmptyState
          title="Create your profile"
          text="Register or log in to like, comment, follow creators and use your wallet."
          action={{ label: "Register / Login", onPress: () => go("register") }}
        />
        <BottomNav active="profile" go={go} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Profile" onCoins={() => go("coins")} coins={coins} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHero}>
          <View style={styles.avatar}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{String(user.username || "U").slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.profileName}>@{user.username}</Text>
          <Text style={styles.muted}>{user.email || "Pocket Rivals member"}</Text>
          <Pressable style={styles.secondaryButton} onPress={onUploadAvatar} disabled={avatarUploading}>
            {avatarUploading ? <ActivityIndicator /> : <Text style={styles.secondaryButtonText}>{user.avatarUrl ? "Change profile picture" : "Add profile picture"}</Text>}
          </Pressable>
        </View>

        <View style={styles.profileGrid}>
          <Pressable style={styles.profileTile} onPress={() => go("downloads")}>
            <Text style={styles.tileIcon}>↓</Text>
            <Text style={styles.tileText}>Downloads</Text>
          </Pressable>
          <Pressable style={styles.profileTile} onPress={() => go("notifications")}>
            <Text style={styles.tileIcon}>♢</Text>
            <Text style={styles.tileText}>Notifications</Text>
          </Pressable>
          <Pressable style={styles.profileTile} onPress={onCreator}>
            <Text style={styles.tileIcon}>✦</Text>
            <Text style={styles.tileText}>Creator</Text>
          </Pressable>
          <Pressable style={styles.profileTile} onPress={() => go("settings")}>
            <Text style={styles.tileIcon}>⚙</Text>
            <Text style={styles.tileText}>Settings</Text>
          </Pressable>
        </View>

        <Pressable style={styles.secondaryButton} onPress={logout}>
          <Text style={styles.secondaryButtonText}>Log out</Text>
        </Pressable>
      </ScrollView>
      <BottomNav active="profile" go={go} />
    </SafeAreaView>
  );
}

function SearchScreen({
  stories,
  query,
  setQuery,
  openStory,
  go,
  coins,
}: {
  stories: Story[];
  query: string;
  setQuery: (v: string) => void;
  openStory: (s: Story) => void;
  go: (s: Screen) => void;
  coins: number;
}) {
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stories;
    return stories.filter((s) =>
      [s.title, s.genre, s.author, s.creator].some((x) =>
        x.toLowerCase().includes(q)
      )
    );
  }, [query, stories]);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Search" onBack={() => go("home")} coins={coins} />
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          autoFocus
          placeholder="Search stories, genres or creators"
          placeholderTextColor="#777"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")}>
            <Text style={styles.muted}>Clear</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={results}
        keyExtractor={(x) => x.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <StoryRow story={item} onPress={() => openStory(item)} />}
        ListEmptyComponent={<EmptyState title="No results" text="Try another search." />}
      />
    </SafeAreaView>
  );
}

function DetailScreen({
  story,
  liked,
  saved,
  followed,
  onLike,
  onSave,
  onFollow,
  openComments,
  openPlayer,
  openCreator,
  go,
  coins,
}: {
  story: Story;
  liked: boolean;
  saved: boolean;
  followed: boolean;
  onLike: () => void;
  onSave: () => void;
  onFollow: () => void;
  openComments: () => void;
  openPlayer: (episode: number) => void;
  openCreator: () => void;
  go: (s: Screen) => void;
  coins: number;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title={story.title} onBack={() => go("home")} onCoins={() => go("coins")} coins={coins} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {story.image ? <Image source={{ uri: story.image }} style={styles.detailImage} /> : <View style={[styles.detailImage, { backgroundColor: "#111" }]} />}
        <Text style={styles.detailGenre}>{story.genre.toUpperCase()}</Text>
        <Text style={styles.detailTitle}>{story.title}</Text>
        <Text style={styles.muted}>By {story.author} · {story.creator}</Text>
        <Text style={styles.detailDescription}>{story.description}</Text>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionButton} onPress={onLike}>
            <Text style={styles.actionIcon}>{liked ? "♥" : "♡"}</Text>
            <Text style={styles.actionLabel}>{liked ? "Liked" : "Like"}</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={onSave}>
            <Text style={styles.actionIcon}>{saved ? "✓" : "+"}</Text>
            <Text style={styles.actionLabel}>{saved ? "Saved" : "Save"}</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={openComments}>
            <Text style={styles.actionIcon}>☷</Text>
            <Text style={styles.actionLabel}>Comments</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={onFollow}>
            <Text style={styles.actionIcon}>●</Text>
            <Text style={styles.actionLabel}>{followed ? "Following" : "Follow"}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.primaryButton} onPress={() => openPlayer(1)}>
          <Text style={styles.primaryButtonText}>▶ Start episode 1</Text>
        </Pressable>

        <SectionTitle title={`Episodes (${story.episodes})`} />
        {Array.from({ length: Math.min(story.episodes, 20) }, (_, i) => i + 1).map((ep) => {
          const locked = ep >= story.lockedFrom;
          return (
            <Pressable key={ep} style={styles.episodeRow} onPress={() => openPlayer(ep)}>
              <View style={styles.episodeNumber}>
                <Text style={styles.episodeNumberText}>{ep}</Text>
              </View>
              <View style={styles.episodeInfo}>
                <Text style={styles.episodeTitle}>Episode {ep}</Text>
                <Text style={styles.muted}>{locked ? "🔒 Premium episode · 50 coins" : "Free episode"}</Text>
              </View>
              <Text style={styles.chevron}>{locked ? "🔒" : "▶"}</Text>
            </Pressable>
          );
        })}

        <Pressable style={styles.communityBanner} onPress={openCreator}>
          <View>
            <Text style={styles.communityTitle}>{story.creator}</Text>
            <Text style={styles.muted}>View creator profile</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function VideoScreen({
  story,
  episode,
  onBack,
  onNext,
  onCoins,
  coins,
}: {
  story: Story;
  episode: number;
  onBack: () => void;
  onNext: () => void;
  onCoins: () => void;
  coins: number;
}) {
  const source = story.videoUrl || null;
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.staysActiveInBackground = false;
  });

  useEffect(() => {
    try {
      player.play();
    } catch {}
    return () => {
      try {
        player.pause();
      } catch {}
    };
  }, [player, source]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.videoHeader}>
        <Pressable onPress={onBack} style={styles.iconButton}>
          <Text style={styles.iconText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.videoHeaderTitle}>{story.title}</Text>
          <Text style={styles.muted}>Episode {episode}</Text>
        </View>
        <Pressable onPress={onCoins} style={styles.coinPill}>
          <Text>💎</Text><Text style={styles.coinText}>{money(coins)}</Text>
        </Pressable>
      </View>

      <View style={styles.videoContainer}>
        <VideoView
          player={player}
          style={styles.videoPlayerView}
          nativeControls
          contentFit="contain"
          allowsFullscreen
          allowsPictureInPicture
        />
      </View>

      <View style={styles.playerBottom}>
        <Text style={styles.playerTitle}>{story.title}</Text>
        <Text style={styles.muted}>Episode {episode}</Text>
        <Pressable style={styles.primaryButton} onPress={onNext}>
          <Text style={styles.primaryButtonText}>Next episode ›</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function AudioScreen({
  story,
  onBack,
  coins,
}: {
  story: Story;
  onBack: () => void;
  coins: number;
}) {
  const source = story.audioUrl || undefined;
  const player = useAudioPlayer(source, {
    updateInterval: 500,
    downloadFirst: false,
    preferredForwardBufferDuration: 15,
  });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Audio" onBack={onBack} coins={coins} />
      <View style={styles.audioScreen}>
        <Image source={{ uri: story.image }} style={styles.audioArtwork} />
        <Text style={styles.audioTitle}>{story.title}</Text>
        <Text style={styles.muted}>Episode 1 · {story.author}</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${status.duration ? Math.min(100, (status.currentTime / status.duration) * 100) : 0}%`,
              },
            ]}
          />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.muted}>{Math.floor(status.currentTime || 0)}s</Text>
          <Text style={styles.muted}>{Math.floor(status.duration || 0)}s</Text>
        </View>
        <Pressable
          style={styles.playCircle}
          onPress={() => (status.playing ? player.pause() : player.play())}
        >
          <Text style={styles.playCircleText}>{status.playing ? "Ⅱ" : "▶"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CommentsScreen({
  comments,
  text,
  setText,
  onSend,
  liked,
  onLike,
  onBack,
  user,
}: {
  comments: CommentItem[];
  text: string;
  setText: (v: string) => void;
  onSend: () => void;
  liked: Record<string, boolean>;
  onLike: (id: string) => void;
  onBack: () => void;
  user: User | null;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <Header title="Comments" onBack={onBack} coins={0} />
        <FlatList
          data={comments}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.commentsList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <View style={styles.commentAvatar}>
                <Text>{item.user.slice(0, 1).toUpperCase()}</Text>
              </View>
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
          ListEmptyComponent={<EmptyState title="No comments yet" text="Be the first to say something." />}
        />

        <View style={styles.commentComposer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={user ? "Add a comment..." : "Log in to comment"}
            placeholderTextColor="#777"
            style={styles.commentInput}
            editable={!!user}
            multiline
          />
          <Pressable
            style={[styles.sendButton, !user && styles.disabled]}
            onPress={onSend}
            disabled={!user}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CoinsScreen({
  packages,
  coins,
  onBuy,
  onBack,
  loading,
  go,
}: {
  packages: CoinPackage[];
  coins: number;
  onBuy: (p: CoinPackage) => void;
  onBack: () => void;
  loading: boolean;
  go: (s: Screen) => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Coins" onBack={onBack} coins={coins} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.walletCard}>
          <Text style={styles.walletLabel}>YOUR BALANCE</Text>
          <Text style={styles.walletCoins}>💎 {coins}</Text>
          <Text style={styles.muted}>Coins are server-controlled. Buying does not credit the wallet until payment is confirmed.</Text>
        </View>

        <SectionTitle title="Choose a package" />
        {(packages.length ? packages : DEFAULT_PACKAGES).map((p) => (
          <Pressable key={`${p.coins}-${p.amount}`} style={styles.coinPackage} onPress={() => onBuy(p)}>
            <View>
              <Text style={styles.packageCoins}>💎 {money(p.coins)} coins</Text>
              <Text style={styles.muted}>Payment: {p.amount}</Text>
            </View>
            <View style={styles.buyButton}>
              {loading ? <ActivityIndicator /> : <Text style={styles.buyButtonText}>Buy</Text>}
            </View>
          </Pressable>
        ))}

        <Pressable style={styles.secondaryButton} onPress={() => go("rewards")}>
          <Text style={styles.secondaryButtonText}>Daily rewards</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function RewardsScreen({
  onBack,
  user,
  coins,
  adReady,
  adLoading,
  onWatchAd,
}: {
  onBack: () => void;
  user: User | null;
  coins: number;
  adReady: boolean;
  adLoading: boolean;
  onWatchAd: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Rewards" onBack={onBack} coins={coins} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.rewards}>
          <Text style={styles.rewardIcon}>🎁</Text>
          <Text style={styles.pageTitle}>Watch & Earn</Text>
          <Text style={styles.mutedCenter}>
            Watch a real rewarded ad and earn coins after LevelPlay confirms the reward.
          </Text>

          <View style={styles.challengeCard}>
            <Text style={styles.challengeTitle}>Rewarded video</Text>
            <Text style={styles.muted}>Status: {adLoading ? "Loading ad…" : adReady ? "Ready" : "Preparing…"}</Text>
            <Text style={styles.muted}>Your wallet is verified by the Pocket Rivals server.</Text>
          </View>

          <Pressable
            style={[styles.primaryButton, (!user || !adReady || adLoading) && styles.disabled]}
            disabled={!user || !adReady || adLoading}
            onPress={onWatchAd}
          >
            {adLoading ? <ActivityIndicator /> : <Text style={styles.primaryButtonText}>▶ Watch ad for coins</Text>}
          </Pressable>

          {!user && (
            <Text style={styles.mutedCenter}>Log in first so the server can credit the correct wallet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AIScreen({
  messages,
  input,
  setInput,
  onSend,
  loading,
  error,
  onBack,
}: {
  messages: AIMessage[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  error: string;
  onBack: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Header title="Pocket AI" onBack={onBack} coins={0} />
        <FlatList
          data={messages}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.aiList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View
              style={[
                styles.aiBubble,
                item.role === "user" ? styles.aiUser : styles.aiAssistant,
              ]}
            >
              <Text style={styles.aiRole}>{item.role === "user" ? "You" : "Pocket AI"}</Text>
              <Text style={styles.aiText}>{item.text}</Text>
            </View>
          )}
        />
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <View style={styles.aiComposer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Pocket AI..."
            placeholderTextColor="#777"
            style={styles.aiInput}
            multiline
            editable={!loading}
            returnKeyType="send"
            onSubmitEditing={onSend}
          />
          <Pressable
            style={[styles.sendButton, loading && styles.disabled]}
            onPress={onSend}
            disabled={loading}
          >
            {loading ? <ActivityIndicator /> : <Text style={styles.sendButtonText}>↑</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RegisterScreen({
  onBack,
  onSubmit,
  onLogin,
  mode,
  setMode,
  username,
  setUsername,
  email,
  setEmail,
  password,
  setPassword,
  loading,
}: {
  onBack: () => void;
  onSubmit: () => void;
  onLogin: () => void;
  mode: "register" | "login";
  setMode: (v: "register" | "login") => void;
  username: string;
  setUsername: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loading: boolean;
}) {
  const isLogin = mode === "login";
  return (
    <SafeAreaView style={styles.safe}>
      <Header title={isLogin ? "Log in" : "Create account"} onBack={onBack} coins={0} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.pageTitle}>{isLogin ? "Welcome back" : "Create your account"}</Text>
          <Text style={styles.muted}>
            {isLogin
              ? "Your account is saved on this device, so you won't need to log in every time."
              : "Create an account once. Pocket Rivals will remember your signed-in session."}
          </Text>

          {!isLogin && (
            <>
              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
                placeholderTextColor="#666"
                style={styles.formInput}
                autoCapitalize="none"
              />
            </>
          )}

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#666"
            style={styles.formInput}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor="#666"
            style={styles.formInput}
            secureTextEntry
            autoComplete={isLogin ? "current-password" : "new-password"}
          />

          <Pressable
            style={styles.primaryButton}
            onPress={isLogin ? onLogin : onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.primaryButtonText}>{isLogin ? "Log in" : "Create account"}</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => setMode(isLogin ? "register" : "login")}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>
              {isLogin ? "Need an account? Create one" : "Already have an account? Log in"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CreatorScreen({
  profile,
  ownProfile,
  following,
  onToggleFollow,
  onUploadAvatar,
  avatarUploading,
  onBack,
  go,
  openStory,
}: {
  profile: CreatorProfile | null;
  ownProfile: boolean;
  following: boolean;
  onToggleFollow: () => void;
  onUploadAvatar: () => void;
  avatarUploading: boolean;
  onBack: () => void;
  go: (s: Screen) => void;
  openStory: (story: Story) => void;
}) {
  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Creator" onBack={onBack} coins={0} />
        <EmptyState title="Creator profile unavailable" text="Open your Creator page from Profile or open a creator from a story." />
      </SafeAreaView>
    );
  }

  const totalPlays = profile.videos.reduce((sum, video) => sum + Number(video.plays || 0), 0);
  const totalLikes = profile.videos.reduce((sum, video) => sum + Number(video.likes || 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Creator" onBack={onBack} coins={0} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHero}>
          <View style={styles.creatorAvatar}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.creatorAvatarImage} />
            ) : (
              <Text style={styles.avatarText}>{String(profile.username || "C").slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.profileName}>{profile.username}</Text>
          <Text style={styles.muted}>{ownProfile ? "Your creator profile" : `${profile.followersCount} followers`}</Text>

          {ownProfile ? (
            <>
              <Pressable style={styles.secondaryButton} onPress={onUploadAvatar} disabled={avatarUploading}>
                {avatarUploading ? <ActivityIndicator /> : <Text style={styles.secondaryButtonText}>{profile.avatarUrl ? "Change profile picture" : "Add profile picture"}</Text>}
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={() => go("create")}>
                <Text style={styles.primaryButtonText}>Creator studio</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.primaryButton} onPress={onToggleFollow}>
              <Text style={styles.primaryButtonText}>{following ? "Following" : "Follow creator"}</Text>
            </Pressable>
          )}
        </View>

        <SectionTitle title="Creator Analytics" />
        <View style={styles.analyticsGrid}>
          <AnalyticsCard label="Total Plays" value={money(totalPlays)} />
          <AnalyticsCard label="Likes" value={money(totalLikes)} />
          <AnalyticsCard label="Followers" value={money(profile.followersCount)} />
          <AnalyticsCard label="Videos" value={money(profile.videos.length)} />
        </View>

        <SectionTitle title="Shared videos" />
        {profile.videos.length ? profile.videos.map((video) => (
          <StoryRow key={video.id} story={video} onPress={() => openStory(video)} />
        )) : (
          <EmptyState title="No videos yet" text={ownProfile ? "Your published videos will appear here after the server accepts them." : "This creator has not published a video yet."} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CreateScreen({
  title,
  setTitle,
  description,
  setDescription,
  genre,
  setGenre,
  onPublish,
  onBack,
  loading,
  user,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  genre: string;
  setGenre: (v: string) => void;
  onPublish: () => void;
  onBack: () => void;
  loading: boolean;
  user: User | null;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Creator Studio" onBack={onBack} coins={0} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.pageTitle}>Create a story</Text>
          {!user && <Text style={styles.errorText}>Log in before publishing.</Text>}

          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Story title" placeholderTextColor="#666" style={styles.formInput} />

          <Text style={styles.fieldLabel}>Genre</Text>
          <TextInput value={genre} onChangeText={setGenre} placeholder="Drama" placeholderTextColor="#666" style={styles.formInput} />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Tell viewers what this story is about..."
            placeholderTextColor="#666"
            style={[styles.formInput, styles.largeInput]}
            multiline
          />

          <View style={styles.challengeCard}>
            <Text style={styles.challengeTitle}>Review first</Text>
            <Text style={styles.muted}>
              New creator content should be reviewed by your admin/moderation system before being promoted.
            </Text>
          </View>

          <Pressable style={styles.primaryButton} onPress={onPublish} disabled={loading || !user}>
            {loading ? <ActivityIndicator /> : <Text style={styles.primaryButtonText}>Submit to server</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SettingsScreen({
  autoPlay,
  setAutoPlay,
  autoUnlock,
  setAutoUnlock,
  notifications,
  setNotifications,
  onBack,
  go,
}: {
  autoPlay: boolean;
  setAutoPlay: (v: boolean) => void;
  autoUnlock: boolean;
  setAutoUnlock: (v: boolean) => void;
  notifications: boolean;
  setNotifications: (v: boolean) => void;
  onBack: () => void;
  go: (s: Screen) => void;
}) {
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

        <Pressable style={styles.settingsLink} onPress={() => go("premium")}>
          <Text style={styles.settingTitle}>Premium</Text><Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable style={styles.settingsLink} onPress={() => go("coins")}>
          <Text style={styles.settingTitle}>Wallet & coins</Text><Text style={styles.chevron}>›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function PremiumScreen({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Premium" onBack={onBack} coins={0} />
      <View style={styles.premium}>
        <Text style={styles.premiumIcon}>✦</Text>
        <Text style={styles.pageTitle}>Pocket Rivals Premium</Text>
        <Text style={styles.mutedCenter}>
          Premium memberships can be connected to your production billing provider later.
        </Text>
        <View style={styles.challengeCard}>
          <Text style={styles.challengeTitle}>Premium benefits</Text>
          <Text style={styles.muted}>• Ad-free experience when enabled</Text>
          <Text style={styles.muted}>• Premium stories</Text>
          <Text style={styles.muted}>• Creator perks</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function CommunityScreen({ go, stories }: { go: (s: Screen) => void; stories: Story[] }) {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Community" onBack={() => go("home")} coins={0} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Creator community</Text>
        <Text style={styles.muted}>Discover creators without manufacturing likes or followers.</Text>
        {stories.map((s) => (
          <View key={s.id} style={styles.communityCard}>
            <View style={styles.creatorAvatarSmall}>
              <Text>{String(s.creator || "C").slice(0, 1).toUpperCase()}</Text>
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

function DownloadsScreen({
  stories,
  downloaded,
  openStory,
  onBack,
}: {
  stories: Story[];
  downloaded: Record<string, boolean>;
  openStory: (s: Story) => void;
  onBack: () => void;
}) {
  const items = stories.filter((s) => downloaded[s.id]);
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Downloads" onBack={onBack} coins={0} />
      {items.length ? (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <StoryRow story={item} onPress={() => openStory(item)} />}
        />
      ) : (
        <EmptyState title="No downloads" text="Downloads are kept as local app state for this testing build." />
      )}
    </SafeAreaView>
  );
}

function NotificationsScreen({ onBack }: { onBack: () => void }) {
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
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story>({
    id: "", title: "", genre: "", author: "", creator: "", description: "", image: "",
    plays: 0, likes: 0, rating: 0, episodes: 0, lockedFrom: 999999, duration: 0,
  });

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
  const [comments, setComments] = useState<CommentItem[]>([]);
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
    {
      id: "welcome",
      role: "assistant",
      text: "Hey 👋 I'm Pocket AI. Ask me about stories, creators or the Pocket Rivals experience.",
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>(DEFAULT_PACKAGES);
  const [coinLoading, setCoinLoading] = useState(false);

  const rewardedAdRef = useRef<LevelPlayRewardedAd | null>(null);
  const interstitialAdRef = useRef<LevelPlayInterstitialAd | null>(null);
  const [adsInitialized, setAdsInitialized] = useState(false);
  const [rewardedAdReady, setRewardedAdReady] = useState(false);
  const [rewardedAdLoading, setRewardedAdLoading] = useState(false);
  const [interstitialAdReady, setInterstitialAdReady] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState(0);

  const [creatorFollowing, setCreatorFollowing] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [creatorOwnProfile, setCreatorOwnProfile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const navigate = (next: Screen, story?: Story) => {
    setPreviousScreen(screen);
    if (story) setSelectedStory(story);
    setScreen(next);
  };

  const back = () => setScreen(previousScreen || "home");

  async function refreshWalletFromServer() {
    if (!token) return;
    try {
      const me = await api<any>("/api/me", {}, token);
      const account = me?.user ?? me?.account ?? me;
      const balance = Number(me?.coins ?? account?.coins ?? me?.balance);
      if (Number.isFinite(balance)) setCoins(balance);
    } catch {}
  }

  async function initializeLevelPlay() {
    if (Platform.OS !== "android" && Platform.OS !== "ios") return;
    if (!LEVELPLAY_APP_KEY || LEVELPLAY_APP_KEY.includes("PUT_YOUR_")) return;

    try {
      const request = LevelPlayInitRequest.builder(LEVELPLAY_APP_KEY)
        .withUserId(user?.id || `guest-${Date.now()}`.slice(0, 64))
        .build();

      await LevelPlay.init(request, {
        onInitFailed: () => setAdsInitialized(false),
        onInitSuccess: () => setAdsInitialized(true),
      });
    } catch {}
  }

  async function loadRewardedAd() {
    if (!adsInitialized || !LEVELPLAY_REWARDED_AD_UNIT_ID || LEVELPLAY_REWARDED_AD_UNIT_ID.includes("PUT_YOUR_")) return;
    try {
      setRewardedAdLoading(true);
      if (!rewardedAdRef.current) {
        rewardedAdRef.current = new LevelPlayRewardedAd(LEVELPLAY_REWARDED_AD_UNIT_ID);
        const listener: LevelPlayRewardedAdListener = {
          onAdLoaded: () => setRewardedAdReady(true),
          onAdLoadFailed: () => setRewardedAdReady(false),
          onAdInfoChanged: (_info: LevelPlayAdInfo) => {},
          onAdDisplayed: () => {},
          onAdDisplayFailed: () => setRewardedAdReady(false),
          onAdClicked: () => {},
          onAdClosed: () => {
            setRewardedAdReady(false);
            setTimeout(() => loadRewardedAd(), 800);
          },
          onAdRewarded: () => {
            setTimeout(() => refreshWalletFromServer(), 1500);
          },
        };
        rewardedAdRef.current.setListener(listener);
      }
      await rewardedAdRef.current.loadAd();
    } catch {} finally {
      setRewardedAdLoading(false);
    }
  }

  async function watchRewardedAd() {
    if (!requireLogin("watch rewarded ads")) return;
    if (!rewardedAdRef.current) return;
    try {
      await LevelPlay.setDynamicUserId(String(user?.id || user?.username || "guest").slice(0, 64));
      if (await rewardedAdRef.current.isAdReady()) {
        setRewardedAdLoading(true);
        await rewardedAdRef.current.showAd(LEVELPLAY_REWARDED_PLACEMENT);
      } else {
        Alert.alert("Ad not ready", "Loading rewarded ad...");
        await loadRewardedAd();
      }
    } catch (e: any) {
      Alert.alert("Ad unavailable", e?.message || "Could not show ad.");
    } finally {
      setRewardedAdLoading(false);
    }
  }

  async function loadInterstitialAd() {
    if (!adsInitialized || !LEVELPLAY_INTERSTITIAL_AD_UNIT_ID || LEVELPLAY_INTERSTITIAL_AD_UNIT_ID.includes("PUT_YOUR_")) return;
    try {
      if (!interstitialAdRef.current) {
        interstitialAdRef.current = new LevelPlayInterstitialAd(LEVELPLAY_INTERSTITIAL_AD_UNIT_ID);
        const listener: LevelPlayInterstitialAdListener = {
          onAdLoaded: () => setInterstitialAdReady(true),
          onAdLoadFailed: () => setInterstitialAdReady(false),
          onAdInfoChanged: (_info: LevelPlayAdInfo) => {},
          onAdDisplayed: () => {},
          onAdDisplayFailed: () => {},
          onAdClicked: () => {},
          onAdClosed: () => {
            setInterstitialAdReady(false);
            setTimeout(() => loadInterstitialAd(), 800);
          },
        };
        interstitialAdRef.current.setListener(listener);
      }
      await interstitialAdRef.current.loadAd();
    } catch {}
  }

  async function maybeShowInterstitial() {
    if (!interstitialAdRef.current || !interstitialAdReady) return;
    try {
      if (await interstitialAdRef.current.isAdReady()) {
        await interstitialAdRef.current.showAd(LEVELPLAY_INTERSTITIAL_PLACEMENT);
      }
    } catch {}
  }

  useEffect(() => {
    if (screen !== "rewards" || adsInitialized) return;
    initializeLevelPlay();
  }, [screen, adsInitialized]);

  useEffect(() => {
    if (!adsInitialized) return;
    loadRewardedAd();
    loadInterstitialAd();
  }, [adsInitialized]);

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
    await AsyncStorage.setItem(
      "pocket_rivals_session",
      JSON.stringify({ user: nextUser, token: nextToken, coins: nextCoins })
    );
  }

  useEffect(() => {
    likedRef.current = liked;
  }, [liked]);

  useEffect(() => {
    if (!user || !token) return;
    persistSession(user, token, coins).catch(() => undefined);
  }, [user, token, coins]);

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
        setCoinPackages(
          raw.map((x: any) => ({
            coins: Number(x.coins),
            amount: String(x.amount ?? x.price ?? ""),
            url: String(x.url ?? x.paymentUrl ?? ""),
          }))
        );
      }
    } catch {
      setCoinPackages(DEFAULT_PACKAGES);
    }
  }

  function requireLogin(action: string) {
    if (user && token) return true;
    Alert.alert("Login required", `Please register or log in before you ${action}.`, [
      { text: "Later", style: "cancel" },
      {
        text: "Log in / Register",
        onPress: () => {
          setAuthMode("login");
          navigate("register");
        },
      },
    ]);
    return false;
  }

 // Keep a ref to track what is currently syncing
const likingInProgress = useRef<Record<string, boolean>>({});

async function toggleLike(story: Story) {
  if (!requireLogin("like videos")) return;
  if (likingInProgress.current[story.id]) return; // Prevent spam tapping

  likingInProgress.current[story.id] = true;
  const wasLiked = !!likedRef.current[story.id];

  // Optimistic UI update
  setLiked((prev) => ({ ...prev, [story.id]: !wasLiked }));
  likedRef.current = { ...likedRef.current, [story.id]: !wasLiked };

  const delta = wasLiked ? -1 : 1;
  setStories((prev) =>
    prev.map((s) => (s.id === story.id ? { ...s, likes: Math.max(0, s.likes + delta) } : s))
  );
  setSelectedStory((s) => (s.id === story.id ? { ...s, likes: Math.max(0, s.likes + delta) } : s));

  try {
    const result = await api<any>(
      `/api/shows/${encodeURIComponent(story.id)}/like`,
      { method: "POST" },
      token
    );
    if (typeof result.likes === "number") {
      setStories((prev) => prev.map((s) => s.id === story.id ? { ...s, likes: result.likes } : s));
      setSelectedStory((s) => s.id === story.id ? { ...s, likes: result.likes } : s));
    }
  } catch (e: any) {
    // Rollback on failure
    setLiked((prev) => ({ ...prev, [story.id]: wasLiked }));
    likedRef.current = { ...likedRef.current, [story.id]: wasLiked };
    setStories((prev) =>
      prev.map((s) => (s.id === story.id ? { ...s, likes: Math.max(0, s.likes - delta) } : s))
    );
    setSelectedStory((s) => (s.id === story.id ? { ...s, likes: Math.max(0, s.likes - delta) } : s));
    Alert.alert("Like failed", e.message);
  } finally {
    likingInProgress.current[story.id] = false; // Release the lock
  }
}


  function toggleSave(id: string) {
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function toggleFollow(story: Story) {
    if (!requireLogin("follow creators")) return;
    const creatorId = String(story.raw?.creatorId || story.raw?.authorId || story.raw?.creator?.id || "");
    if (!creatorId) return;
    try {
      const result = await api<any>(`/api/users/${encodeURIComponent(creatorId)}/follow`, { method: "POST" }, token);
      setFollowed((prev) => ({ ...prev, [story.id]: !!result.following }));
      setCreatorFollowing(!!result.following);
    } catch (e: any) {
      Alert.alert("Follow failed", e.message || "Unable to follow this creator.");
    }
  }

  async function postComment() {
  if (!requireLogin("comment")) return;
  const text = commentText.trim();
  if (!text) return;

  const local: CommentItem = {
    id: `local-${Date.now()}`,
    user: user!.username,
    text,
    likes: 0,
  };

  setComments((prev) => [local, ...prev]);
  setCommentText("");

  try {
    const result = await api<any>(
      `/api/shows/${encodeURIComponent(selectedStory.id)}/comments`,
      { method: "POST", body: JSON.stringify({ text }) },
      token
    );
    if (result?.comment) {
      setComments((prev) => prev.filter((x) => x.id !== local.id));
      setComments((prev) => [
        { id: String(result.comment.id), user: String(result.comment.username ?? user!.username), text: String(result.comment.text ?? text), likes: Number(result.comment.likes ?? 0) },
        ...prev,
      ]);
    }
  } catch (e: any) {
    setComments((prev) => prev.filter((x) => x.id !== local.id));
    Alert.alert("Comment failed", e.message);
  }
}

// Keep a ref to prevent spam-tapping comment likes
const commentLikingInProgress = useRef<Record<string, boolean>>({});

async function likeComment(id: string) {
  if (!requireLogin("like comments")) return;
  if (commentLikingInProgress.current[id]) return;

  commentLikingInProgress.current[id] = true;
  const wasLiked = !!commentLiked[id];

  setCommentLiked((prev) => ({ ...prev, [id]: !wasLiked }));
  const delta = wasLiked ? -1 : 1;

  setComments((prev) =>
    prev.map((c) => (c.id === id ? { ...c, likes: Math.max(0, c.likes + delta) } : c))
  );

  try {
    const result = await api<any>(`/api/comments/${encodeURIComponent(id)}/like`, { method: "POST" }, token);
    if (typeof result.likes === "number") {
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, likes: result.likes } : c))
      );
    }
  } catch (e: any) {
    setCommentLiked((prev) => ({ ...prev, [id]: wasLiked }));
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, likes: Math.max(0, c.likes - delta) } : c))
    );
    Alert.alert("Comment like failed", e.message || "Unable to like comment.");
  } finally {
    commentLikingInProgress.current[id] = false;
  }
}

  // FIXED PROFILE PICTURE BUTTON & UPLOADER
  async function uploadProfileAvatar() {
    if (!requireLogin("change your profile picture")) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow Pocket Rivals to access your photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      const form = new FormData();
      form.append("avatar", {
        uri: asset.uri,
        name: asset.fileName || `profile-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      } as any);

      setAvatarUploading(true);
      const response = await fetch(`${API_URL}/api/profile/avatar`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });
      const text = await response.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
      if (!response.ok) throw new Error(data?.message || `Upload failed (${response.status})`);

      const nextAccount = data.user ?? data.account ?? user;
      const nextUser: User = {
        ...(user || { username: regUsername || "User" }),
        ...nextAccount,
        avatarUrl: String(data.avatarUrl ?? nextAccount?.avatarUrl ?? ""),
      };
      setUser(nextUser);
      if (token) await persistSession(nextUser, token, coins);
      setCreatorProfile((prev) => prev ? { ...prev, avatarUrl: nextUser.avatarUrl } : prev);
      Alert.alert("Profile picture updated", "Your new picture is now visible on your profile.");
    } catch (e: any) {
      Alert.alert("Profile picture failed", e.message || "Unable to upload picture.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function openCreatorProfile(story?: Story) {
    if (!user && !story) {
      requireLogin("open your creator profile");
      return;
    }

    try {
      const creatorId = story
        ? String(story.raw?.creatorId || story.raw?.authorId || story.raw?.creator?.id || "")
        : String(user?.id || "");
      if (!creatorId) return;

      const data = await api<any>(`/api/users/${encodeURIComponent(creatorId)}`);
      const account = data?.user ?? data?.account ?? data;
      const videosRaw = Array.isArray(data?.videos) ? data.videos : [];
      const profile: CreatorProfile = {
        id: String(account?.id ?? creatorId),
        username: String(account?.username ?? story?.creator ?? user?.username ?? "Creator"),
        email: account?.email,
        avatarUrl: account?.avatarUrl || "",
        followersCount: Number(account?.followersCount ?? 0),
        followingCount: Number(account?.followingCount ?? 0),
        videos: videosRaw.map(normalizeShow),
      };

      const own = String(profile.id) === String(user?.id);
      setCreatorProfile(profile);
      setCreatorOwnProfile(own);
      navigate("creator");
    } catch (e: any) {
      Alert.alert("Creator profile failed", e.message);
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
      await api("/api/signup", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });
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

    if (!email.includes("@")) return Alert.alert("Invalid email", "Enter a valid email.");
    if (password.length < 6) return Alert.alert("Invalid password", "Use at least 6 characters.");

    if (!fromRegister) setAuthLoading(true);
    try {
      const login = await api<any>("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const newToken = login.token ?? login.accessToken ?? null;
      if (!newToken) throw new Error("No token returned from server.");

      const account = login.user ?? login.account ?? {
        username: regUsername || email.split("@")[0],
        email,
      };
      const nextUser: User = {
        id: account.id ?? account._id,
        username: account.username ?? (regUsername || email.split("@")[0]),
        email: account.email ?? email,
        avatarUrl: account.avatarUrl ?? "",
        isAdmin: !!account.isAdmin,
      };
      const nextCoins = Number(login.coins ?? account.coins ?? 0);

      setToken(newToken);
      setUser(nextUser);
      setCoins(nextCoins);
      await persistSession(nextUser, newToken, nextCoins);
      setRegPassword("");
      navigate("profile");
    } catch (e: any) {
      Alert.alert("Login failed", e.message);
    } finally {
      if (!fromRegister) setAuthLoading(false);
    }
  }

  async function logout() {
    await AsyncStorage.removeItem("pocket_rivals_session").catch(() => undefined);
    setUser(null);
    setToken(null);
    setCoins(0);
    setLiked({});
    likedRef.current = {};
    navigate("home");
  }

  async function sendAI() {
    const message = aiInput.trim();
    if (!message || aiLoading) return;

    setAiError("");
    const userMessage: AIMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: message,
    };

    const nextMessages = [...aiMessages, userMessage];
    setAiMessages(nextMessages);
    setAiInput("");
    setAiLoading(true);

    try {
      const result = await api<any>(
        "/api/ai/chat",
        {
          method: "POST",
          body: JSON.stringify({
            message,
            messages: nextMessages,
            app: "Pocket Rivals",
            assistantName: "Pocket AI",
            model: AI_MODEL,
            shows: stories,
          }),
        },
        token
      );

      const text = result.reply ?? result.text ?? result.message ?? "Pocket AI returned no text.";
      setAiMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: String(text) },
      ]);
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
        creatorId: user!.id,
        status: "pending",
      };

      const result = await api<any>(
        "/api/shows",
        { method: "POST", body: JSON.stringify(payload) },
        token
      );

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
    setCoinLoading(true);
    try {
      if (pkg.url) {
        await Linking.openURL(pkg.url);
      }
    } catch (e: any) {
      Alert.alert("Payment error", e.message);
    } finally {
      setCoinLoading(false);
    }
  }

  function openEpisode(ep: number) {
    const mediaUrl = selectedStory.videoUrl || selectedStory.audioUrl;
    if (!mediaUrl) {
      Alert.alert("Video unavailable", "This episode has no video file on the server yet.");
      return;
    }
    const locked = ep >= selectedStory.lockedFrom;
    if (!locked || unlocked[`${selectedStory.id}:${ep}`]) {
      setCurrentEpisode(ep);
      navigate("video");
      return;
    }

    if (!requireLogin("unlock episodes")) return;

    if (coins < 50) {
      Alert.alert("Not enough coins", "You need 50 coins to unlock this episode.", [
        { text: "Cancel", style: "cancel" },
        { text: "Get coins", onPress: () => navigate("coins") },
      ]);
      return;
    }

    Alert.alert("Unlock episode", "Spend 50 coins?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlock",
        onPress: async () => {
          try {
            const result = await api<any>(
              "/api/coins/spend",
              {
                method: "POST",
                body: JSON.stringify({ amount: 50, reason: "episode_unlock", seriesId: selectedStory.id, episode: ep }),
              },
              token
            );
            const balance = Number(result.coins ?? result.balance);
            if (Number.isFinite(balance)) setCoins(balance);
            else setCoins((x) => Math.max(0, x - 50));

            setUnlocked((prev) => ({ ...prev, [`${selectedStory.id}:${ep}`]: true }));
            setCurrentEpisode(ep);
            navigate("video");
          } catch (e: any) {
            Alert.alert("Unlock unavailable", e.message);
          }
        },
      },
    ]);
  }

  async function loadComments(showId: string) {
    try {
      const data = await api<any>(`/api/shows/${encodeURIComponent(showId)}/comments`);
      const raw = Array.isArray(data) ? data : data.comments;
      if (Array.isArray(raw)) {
        setComments(raw.map((c: any) => ({
          id: String(c.id ?? c._id),
          user: String(c.username ?? c.user ?? "User"),
          text: String(c.text ?? ""),
          likes: Number(c.likes ?? 0),
        })));
      }
    } catch {}
  }

  function openStory(story: Story) {
    setSelectedStory(story);
    navigate("detail");
  }

  const screenContent = (() => {
    if (screen === "home")
      return <HomeScreen stories={stories} openStory={openStory} go={navigate} coins={coins} />;

    if (screen === "trending")
      return <TrendingScreen stories={stories} openStory={openStory} go={navigate} coins={coins} />;

    if (screen === "library")
      return (
        <LibraryScreen
          stories={stories}
          saved={saved}
          downloaded={downloaded}
          openStory={openStory}
          go={navigate}
          coins={coins}
        />
      );

    if (screen === "profile")
      return <ProfileScreen user={user} go={navigate} coins={coins} logout={logout} onCreator={() => openCreatorProfile()} onUploadAvatar={uploadProfileAvatar} avatarUploading={avatarUploading} />;

    if (screen === "search")
      return (
        <SearchScreen
          stories={stories}
          query={searchQuery}
          setQuery={setSearchQuery}
          openStory={openStory}
          go={navigate}
          coins={coins}
        />
      );

    if (screen === "detail")
      return (
        <DetailScreen
          story={selectedStory}
          liked={!!liked[selectedStory.id]}
          saved={!!saved[selectedStory.id]}
          followed={!!followed[selectedStory.id]}
          onLike={() => toggleLike(selectedStory)}
          onSave={() => toggleSave(selectedStory.id)}
          onFollow={() => toggleFollow(selectedStory)}
          openComments={() => { loadComments(selectedStory.id); navigate("comments"); }}
          openPlayer={openEpisode}
          openCreator={() => openCreatorProfile(selectedStory)}
          go={navigate}
          coins={coins}
        />
      );

    if (screen === "video")
      return (
        <VideoScreen
          story={selectedStory}
          episode={currentEpisode}
          onBack={() => navigate("detail")}
          onNext={async () => {
            const nextWatched = watchedEpisodes + 1;
            setWatchedEpisodes(nextWatched);
            if (nextWatched >= 5) {
              setWatchedEpisodes(0);
              await maybeShowInterstitial();
            }
            if (currentEpisode < selectedStory.episodes) openEpisode(currentEpisode + 1);
            else Alert.alert("End", "You reached the end of this story.");
          }}
          onCoins={() => navigate("coins")}
          coins={coins}
        />
      );

    if (screen === "audio")
      return <AudioScreen story={selectedStory} onBack={back} coins={coins} />;

    if (screen === "comments")
      return (
        <CommentsScreen
          comments={comments}
          text={commentText}
          setText={setCommentText}
          onSend={postComment}
          liked={commentLiked}
          onLike={likeComment}
          onBack={back}
          user={user}
        />
      );

    if (screen === "coins")
      return (
        <CoinsScreen
          packages={coinPackages}
          coins={coins}
          onBuy={buyCoins}
          onBack={back}
          loading={coinLoading}
          go={navigate}
        />
      );

    if (screen === "rewards")
      return (
        <RewardsScreen
          onBack={back}
          user={user}
          coins={coins}
          adReady={rewardedAdReady}
          adLoading={rewardedAdLoading}
          onWatchAd={watchRewardedAd}
        />
      );

    if (screen === "ai")
      return (
        <AIScreen
          messages={aiMessages}
          input={aiInput}
          setInput={setAiInput}
          onSend={sendAI}
          loading={aiLoading}
          error={aiError}
          onBack={back}
        />
      );

    if (screen === "register")
      return (
        <RegisterScreen
          onBack={back}
          onSubmit={register}
          onLogin={() => loginAccount()}
          mode={authMode}
          setMode={setAuthMode}
          username={regUsername}
          setUsername={setRegUsername}
          email={regEmail}
          setEmail={setRegEmail}
          password={regPassword}
          setPassword={setRegPassword}
          loading={authLoading}
        />
      );

    // FIXED CREATOR SCREEN: Back button correctly returns to profile without getting stuck
    if (screen === "creator")
      return (
        <CreatorScreen
          profile={creatorProfile}
          ownProfile={creatorOwnProfile}
          following={creatorFollowing}
          onToggleFollow={() => {
            if (!creatorProfile || creatorOwnProfile || !requireLogin("follow creators")) return;
            toggleFollow({ ...selectedStory, raw: { ...(selectedStory.raw || {}), creatorId: creatorProfile.id } });
          }}
          onUploadAvatar={uploadProfileAvatar}
          avatarUploading={avatarUploading}
          onBack={() => navigate("profile")}
          go={navigate}
          openStory={openStory}
        />
      );

    if (screen === "create")
      return (
        <CreateScreen
          title={newStoryTitle}
          setTitle={setNewStoryTitle}
          description={newStoryDescription}
          setDescription={setNewStoryDescription}
          genre={newStoryGenre}
          setGenre={setNewStoryGenre}
          onPublish={publishStory}
          onBack={() => navigate("creator")}
          loading={createLoading}
          user={user}
        />
      );

    if (screen === "settings")
      return (
        <SettingsScreen
          autoPlay={autoPlay}
          setAutoPlay={setAutoPlay}
          autoUnlock={autoUnlock}
          setAutoUnlock={setAutoUnlock}
          notifications={notificationsEnabled}
          setNotifications={setNotificationsEnabled}
          onBack={back}
          go={navigate}
        />
      );

    if (screen === "premium") return <PremiumScreen onBack={back} />;

    if (screen === "community")
      return <CommunityScreen go={navigate} stories={stories} />;

    if (screen === "downloads")
      return (
        <DownloadsScreen
          stories={stories}
          downloaded={downloaded}
          openStory={openStory}
          onBack={back}
        />
      );

    if (screen === "notifications") return <NotificationsScreen onBack={back} />;

    return <HomeScreen stories={stories} openStory={openStory} go={navigate} coins={coins} />;
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
  safe: {
    flex: 1,
    backgroundColor: "#050505",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    minHeight: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#050505",
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brand: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  headerPill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: "#191919",
  },
  headerPillText: {
    color: "#fff",
    fontWeight: "900",
  },
  coinPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: "#191919",
  },
  coinText: {
    color: "#fff",
    fontWeight: "800",
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171717",
  },
  iconText: {
    color: "#fff",
    fontSize: 42,
    lineHeight: 44,
    fontWeight: "800",
    marginTop: -3,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "#090909",
    borderTopWidth: 1,
    borderTopColor: "#1d1d1d",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 10 : 2,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  navIcon: {
    color: "#777",
    fontSize: 22,
    fontWeight: "800",
  },
  navLabel: {
    color: "#777",
    fontSize: 10,
    marginTop: 3,
  },
  navActive: {
    color: "#fff",
  },
  hero: {
    height: 430,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#121212",
    marginBottom: 24,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.54)",
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 22,
  },
  heroEyebrow: {
    color: "#bbb",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 39,
  },
  heroDescription: {
    color: "#ddd",
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 16,
  },
  primaryButton: {
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 23,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginTop: 14,
  },
  primaryButtonText: {
    color: "#050505",
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  sectionTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitleText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  linkText: {
    color: "#aaa",
    fontWeight: "700",
  },
  storyCard: {
    width: Math.min(190, width * 0.46),
    height: 260,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#151515",
    marginRight: 12,
  },
  storyImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  storyGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  storyCardText: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  storyGenre: {
    color: "#bbb",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  storyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  storyMeta: {
    color: "#ccc",
    fontSize: 11,
    marginTop: 5,
  },
  storyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#101010",
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#181818",
  },
  rowImage: {
    width: 72,
    height: 88,
    borderRadius: 12,
    backgroundColor: "#181818",
  },
  rowInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },
  rowTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 5,
  },
  muted: {
    color: "#8c8c8c",
    fontSize: 12,
    lineHeight: 18,
  },
  mutedCenter: {
    color: "#8c8c8c",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 340,
  },
  chevron: {
    color: "#777",
    fontSize: 26,
    paddingHorizontal: 5,
  },
  communityBanner: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 17,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  communityTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  listHeader: {
    paddingBottom: 14,
  },
  pageTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 7,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyIcon: {
    color: "#555",
    fontSize: 50,
    marginBottom: 10,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 7,
  },
  profileHero: {
    alignItems: "center",
    paddingVertical: 22,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#1d1d1d",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 10,
  },
  creatorAvatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: "#1d1d1d",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 10,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 42,
  },
  creatorAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 42,
  },
  avatarText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
  },
  profileName: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 4,
  },
  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  analyticsCard: {
    width: "48%",
    minHeight: 105,
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
    justifyContent: "center",
  },
  analyticsValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 5,
  },
  analyticsLabel: {
    color: "#777",
    fontSize: 14,
  },
  profileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginVertical: 15,
  },
  profileTile: {
    width: "48%",
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#222",
  },
  tileIcon: {
    color: "#fff",
    fontSize: 24,
    marginBottom: 8,
  },
  tileText: {
    color: "#fff",
    fontWeight: "800",
  },
  searchBox: {
    margin: 16,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "#242424",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  searchIcon: {
    color: "#aaa",
    fontSize: 22,
    marginRight: 8,
  },
  searchInput: {
    color: "#fff",
    flex: 1,
    fontSize: 15,
  },
  detailImage: {
    width: "100%",
    height: 360,
    borderRadius: 22,
    backgroundColor: "#121212",
  },
  detailGenre: {
    color: "#999",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 18,
  },
  detailTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 4,
  },
  detailDescription: {
    color: "#ccc",
    lineHeight: 22,
    marginTop: 15,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 15,
  },
  actionButton: {
    alignItems: "center",
    width: "23%",
    paddingVertical: 9,
    backgroundColor: "#111",
    borderRadius: 13,
  },
  actionIcon: {
    color: "#fff",
    fontSize: 21,
  },
  actionLabel: {
    color: "#aaa",
    fontSize: 10,
    marginTop: 4,
  },
  episodeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
  },
  episodeNumber: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#181818",
    alignItems: "center",
    justifyContent: "center",
  },
  episodeNumberText: {
    color: "#fff",
    fontWeight: "900",
  },
  episodeInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },
  episodeTitle: {
    color: "#fff",
    fontWeight: "800",
    marginBottom: 2,
  },
  videoHeader: {
    minHeight: 62,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#050505",
  },
  videoHeaderTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlayerView: {
    width: "100%",
    height: "100%",
  },
  playerBottom: {
    backgroundColor: "#090909",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#1b1b1b",
  },
  playerTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "900",
  },
  audioScreen: {
    flex: 1,
    alignItems: "center",
    padding: 24,
    justifyContent: "center",
  },
  audioArtwork: {
    width: Math.min(320, width - 48),
    height: Math.min(320, width - 48),
    borderRadius: 24,
    marginBottom: 25,
  },
  audioTitle: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#242424",
    borderRadius: 4,
    marginTop: 28,
  },
  progressFill: {
    height: 4,
    backgroundColor: "#fff",
    borderRadius: 4,
  },
  timeRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  playCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
  },
  playCircleText: {
    color: "#050505",
    fontSize: 24,
    fontWeight: "900",
  },
  commentsList: {
    padding: 16,
    paddingBottom: 12,
  },
  commentRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
    alignItems: "flex-start",
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1b1b1b",
    alignItems: "center",
    justifyContent: "center",
  },
  commentBody: {
    flex: 1,
    paddingHorizontal: 10,
  },
  commentUser: {
    color: "#fff",
    fontWeight: "800",
    marginBottom: 4,
  },
  commentText: {
    color: "#ddd",
    lineHeight: 19,
  },
  commentLike: {
    alignItems: "center",
    minWidth: 35,
  },
  commentHeart: {
    color: "#fff",
    fontSize: 20,
  },
  commentComposer: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#222",
    backgroundColor: "#090909",
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: "#171717",
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 11,
    color: "#fff",
  },
  sendButton: {
    minWidth: 52,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  sendButtonText: {
    color: "#050505",
    fontWeight: "900",
  },
  walletCard: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#252525",
    borderRadius: 22,
    padding: 22,
    marginBottom: 15,
  },
  walletLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  walletCoins: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "900",
    marginVertical: 7,
  },
  coinPackage: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packageCoins: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 3,
  },
  buyButton: {
    minWidth: 72,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  buyButtonText: {
    color: "#050505",
    fontWeight: "900",
  },
  rewards: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  rewardIcon: {
    fontSize: 70,
    marginBottom: 18,
  },
  aiList: {
    padding: 15,
    paddingBottom: 10,
  },
  aiBubble: {
    maxWidth: "88%",
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
  },
  aiUser: {
    alignSelf: "flex-end",
    backgroundColor: "#202020",
  },
  aiAssistant: {
    alignSelf: "flex-start",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
  },
  aiRole: {
    color: "#8e8e8e",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 4,
  },
  aiText: {
    color: "#fff",
    lineHeight: 20,
  },
  aiComposer: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#222",
    backgroundColor: "#090909",
  },
  aiInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 23,
    backgroundColor: "#171717",
    color: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  errorText: {
    color: "#ff7777",
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  form: {
    padding: 18,
    paddingBottom: 60,
  },
  fieldLabel: {
    color: "#ddd",
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 7,
  },
  formInput: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "#252525",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  largeInput: {
    minHeight: 140,
    textAlignVertical: "top",
  },
  challengeCard: {
    backgroundColor: "#111",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#222",
    padding: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  challengeTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 5,
  },
  creatorAvatarSmall: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#1d1d1d",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  communityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
  },
  settingRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#181818",
  },
  settingTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  settingsLink: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#181818",
  },
  premium: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  premiumIcon: {
    color: "#fff",
    fontSize: 60,
    marginBottom: 15,
  },
  disabled: {
    opacity: 0.45,
  },
});

