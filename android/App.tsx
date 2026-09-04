import React, { useEffect, useMemo, useState } from "react";
import {
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

const { width } = Dimensions.get("window");

/* =========================================================
POCKET RIVALS MASTER CONFIG
========================================================= */

const API_URL =
process.env.EXPO_PUBLIC_API_URL?.trim() ||
"http://16.170.245.45:3000";

const AUDIO_URL =
"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

const VIDEO_URL =
"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const FALLBACK_IMAGE =
"https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=900";

const AI_ENDPOINT = ${API_URL}/api/ai/chat;

/* =========================================================
TYPES
========================================================= */

type Screen =
| "home"
| "trending"
| "audio"
| "video"
| "library"
| "profile"
| "search"
| "detail"
| "comments"
| "creator"
| "coins"
| "rewards"
| "notifications"
| "downloads"
| "ai"
| "settings"
| "premium"
| "create"
| "community"
| "register";

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
duration: string;
audioUrl?: string;
videoUrl?: string;
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

/* =========================================================
FALLBACK DATA
========================================================= */

const STORIES: Story[] = [
{
id: "1",
title: "The Billionaire's Secret",
genre: "Romance",
author: "Ruddy C",
creator: "Ruddy Studios",
description:
"She thought she knew everything about the billionaire she married. She was wrong.",
image:
"https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900",
plays: 12400000,
likes: 830000,
rating: 4.9,
episodes: 86,
lockedFrom: 6,
duration: "18 min",
videoUrl: VIDEO_URL,
},
{
id: "2",
title: "Dark City (AI Video)",
genre: "Thriller",
author: "J. Phoenix",
creator: "Nightfall Studios",
description:
"In a city where nobody can be trusted, one detective finds a secret buried beneath everything.",
image:
"https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=900",
plays: 8700000,
likes: 510000,
rating: 4.8,
episodes: 64,
lockedFrom: 5,
duration: "22 min",
videoUrl: VIDEO_URL,
},
{
id: "3",
title: "Last Survivor",
genre: "Apocalypse",
author: "M. Carter",
creator: "Red Moon",
description: "The world ended. But one survivor refuses to disappear.",
image:
"https://images.unsplash.com/photo-1511497584788-876760111969?w=900",
plays: 6300000,
likes: 390000,
rating: 4.7,
episodes: 72,
lockedFrom: 8,
duration: "20 min",
videoUrl: VIDEO_URL,
},
{
id: "4",
title: "The CEO's Daughter",
genre: "Drama",
author: "Luna Ray",
creator: "Rivals Originals",
description: "Money can buy almost anything. It cannot buy forgiveness.",
image:
"https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900",
plays: 5200000,
likes: 310000,
rating: 4.8,
episodes: 91,
lockedFrom: 7,
duration: "16 min",
videoUrl: VIDEO_URL,
},
{
id: "5",
title: "Shadow Hunter",
genre: "Fantasy",
author: "D. Knight",
creator: "Infinity Audio",
description:
"A hunter discovers that the monsters he was trained to kill may be protecting humanity.",
image:
"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900",
plays: 4100000,
likes: 270000,
rating: 4.6,
episodes: 58,
lockedFrom: 4,
duration: "24 min",
videoUrl: VIDEO_URL,
},
];

const COMMENTS: CommentItem[] = [
{ id: "1", user: "Tasha", text: "Episode 12 was CRAZY 😭🔥", likes: 421 },
{ id: "2", user: "Mike", text: "This is actually better than most shows I've watched.", likes: 287 },
{ id: "3", user: "Nia", text: "When is the next episode dropping?", likes: 194 },
];

const COIN_PACKAGES = [
{
id: "3000",
coins: 3000,
price: "$24.99",
url: "https://www.paynow.co.zw/Payment/Link/?q=c2VhcmNoPXJ1ZGR5Y2hhbml3YTc3NyU0MGdtYWlsLmNvbSZhbW91bnQ9MjQuOTkmcmVmZXJlbmNlPSZsPTE%3d",
},
{
id: "1200",
coins: 1200,
price: "$9.99",
url: "https://www.paynow.co.zw/Payment/Link/?q=c2VhcmNoPXJ1ZGR5Y2hhbml3YTc3NyU0MGdtYWlsLmNvbSZhbW91bnQ9OS45OSZyZWZlcmVuY2U9Jmw9MQ%3d%3d",
},
{
id: "550",
coins: 550,
price: "$4.99",
url: "https://www.paynow.co.zw/Payment/Link/?q=c2VhcmNoPXJ1ZGR5Y2hhbml3YTc3NyU0MGdtYWlsLmNvbSZhbW91bnQ9NC45OSZyZWZlcmVuY2U9Jmw9MQ%3d%3d",
},
{
id: "100",
coins: 100,
price: "$0.99",
url: "https://www.paynow.co.zw/Payment/Link/?q=c2VhcmNoPXJ1ZGR5Y2hhbml3YTc3NyU0MGdtYWlsLmNvbSZhbW91bnQ9MC45OSZyZWZlcmVuY2U9Jmw9MQ%3d%3d",
},
];

const money = (value: number) => {
if (value >= 1000000) return ${(value / 1000000).toFixed(1)}M;
if (value >= 1000) return ${(value / 1000).toFixed(1)}K;
return String(value);
};

const normalizeShow = (raw: any): Story => {
const firstSeason = raw?.seasons?.[0];
const episodes = raw?.episodes ?? firstSeason?.episodes?.length ?? 1;
const firstEpisode = firstSeason?.episodes?.[0];

return {
id: String(raw?.id ?? Date.now()),
title: raw?.title ?? "Untitled Story",
genre: raw?.genre ?? "Drama",
author: raw?.author ?? raw?.creator ?? "Pocket Rivals Creator",
creator: raw?.creator ?? raw?.author ?? "Pocket Rivals",
description: raw?.description ?? "",
image: raw?.image ?? raw?.thumbnailUrl ?? FALLBACK_IMAGE,
plays: raw?.plays ?? raw?.views ?? 0,
likes: raw?.likes ?? 0,
rating: raw?.rating ?? 0,
episodes,
lockedFrom: raw?.lockedFrom ?? 999999,
duration: raw?.duration ?? "15 min",
audioUrl: raw?.audioUrl ?? firstEpisode?.audioUrl,
videoUrl: raw?.videoUrl ?? VIDEO_URL,
raw,
};
};

/* =========================================================
SHARED COMPONENTS (Defined outside App to prevent re-mounts)
========================================================= */

const Header = ({
title = "POCKET RIVALS",
backButton = false,
onBack,
onNavigate,
coins,
}: {
title?: string;
backButton?: boolean;
onBack?: () => void;
onNavigate?: (screen: Screen) => void;
coins?: number;
}) => (
<View style={styles.header}>
<View style={styles.headerLeft}>
{backButton && (
<Pressable onPress={onBack} style={styles.iconButton}>
<Text style={styles.iconText}>‹</Text>
</Pressable>
)}
<View>
<Text style={styles.logo}>{title}</Text>
{!backButton && (
<Text style={styles.tagline}>AI Stories & Video Streaming</Text>
)}
</View>
</View>

{!backButton && onNavigate && (  
  <View style={styles.headerRight}>  
    <Pressable onPress={() => onNavigate("ai")} style={styles.aiButton}>  
      <Text style={styles.aiButtonText}>AI</Text>  
    </Pressable>  

    <Pressable  
      onPress={() => onNavigate("notifications")}  
      style={styles.iconButton}  
    >  
      <Text style={{ fontSize: 16 }}>🔔</Text>  
    </Pressable>  

    <Pressable onPress={() => onNavigate("coins")} style={styles.coinSmall}>  
      <Text style={{ fontSize: 14 }}>🪙</Text>  
      <Text style={styles.coinText}>{coins ?? 0}</Text>  
    </Pressable>  
  </View>  
)}

  </View>  
);  const BottomNav = ({
screen,
onNavigate,
}: {
screen: Screen;
onNavigate: (screen: Screen) => void;
}) => (
<View style={styles.bottomNav}>
{[
["home", "⌂", "Home"],
["trending", "🔥", "Trending"],
["library", "▣", "Library"],
["profile", "●", "Profile"],
].map(([id, icon, label]) => (
<Pressable
key={id}
style={styles.navItem}
onPress={() => onNavigate(id as Screen)}
>
<Text style={[styles.navIcon, screen === id && styles.navActive]}>
{icon}
</Text>
<Text style={[styles.navLabel, screen === id && styles.navActive]}>
{label}
</Text>
</Pressable>
))}
</View>
);

const SectionTitle = ({
title,
action,
onPress,
}: {
title: string;
action?: string;
onPress?: () => void;
}) => (
<View style={styles.sectionHeader}>
<Text style={styles.sectionTitle}>{title}</Text>
{action && (
<Pressable onPress={onPress}>
<Text style={styles.sectionAction}>{action}</Text>
</Pressable>
)}
</View>
);

const StoryCard = ({
story,
onPress,
}: {
story: Story;
onPress: (story: Story) => void;
}) => (
<Pressable style={styles.storyCard} onPress={() => onPress(story)}>
<Image source={{ uri: story.image }} style={styles.storyImage} />
<View style={styles.storyOverlay}>
<Text style={styles.storyGenre}>{story.genre}</Text>
</View>
<View style={styles.storyInfo}>
<Text style={styles.storyTitle} numberOfLines={2}>
{story.title}
</Text>
<Text style={styles.storyMeta}>
⭐ {story.rating} · {money(story.plays)} plays
</Text>
</View>
</Pressable>
);

const StoryRow = ({
story,
onPress,
}: {
story: Story;
onPress: (story: Story) => void;
}) => (
<Pressable style={styles.storyRow} onPress={() => onPress(story)}>
<Image source={{ uri: story.image }} style={styles.rowImage} />
<View style={styles.rowContent}>
<Text style={styles.rowTitle} numberOfLines={1}>
{story.title}
</Text>
<Text style={styles.rowGenre}>
{story.genre} · {story.creator}
</Text>
<Text style={styles.rowMeta}>
▶ {money(story.plays)} · ❤️ {money(story.likes)}
</Text>
</View>
<Text style={styles.chevron}>›</Text>
</Pressable>
);

function Stat({ value, label }: { value: string; label: string }) {
return (
<View style={styles.stat}>
<Text style={styles.statValue}>{value}</Text>
<Text style={styles.statLabel}>{label}</Text>
</View>
);
}

function ActionButton({
icon,
text,
active,
onPress,
}: {
icon: string;
text: string;
active?: boolean;
onPress: () => void;
}) {
return (
<Pressable
style={[styles.actionButton, active && styles.actionButtonActive]}
onPress={onPress}
>
<Text style={styles.actionIcon}>{icon}</Text>
<Text style={styles.actionText}>{text}</Text>
</Pressable>
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

function SettingToggle({
title,
value,
onChange,
}: {
title: string;
value: boolean;
onChange: (value: boolean) => void;
}) {
return (
<View style={styles.settingRow}>
<Text style={styles.settingTitle}>{title}</Text>
<Switch value={value} onValueChange={onChange} />
</View>
);
}

function EmptyState({ text }: { text: string }) {
return (
<View style={styles.emptyState}>
<Text style={styles.emptyText}>{text}</Text>
</View>
);
}

/* =========================================================
SCREEN COMPONENTS (Defined outside App to prevent re-mounts)
========================================================= */

const HomeScreen = ({
stories,
selectedStory,
saved,
coins,
onNavigate,
onToggleSave,
setSearchQuery,
}: any) => (
<ScrollView
showsVerticalScrollIndicator={false}
contentContainerStyle={styles.scrollContent}

> 

<Header onNavigate={onNavigate} coins={coins} />  

<Pressable style={styles.searchBox} onPress={() => onNavigate("search")}>  
  <Text style={styles.searchIcon}>⌕</Text>  
  <Text style={styles.searchPlaceholder}>  
    Search AI videos, stories, genres...  
  </Text>  
</Pressable>  

<Pressable  
  style={styles.hero}  
  onPress={() => onNavigate("detail", selectedStory)}  
>  
  <Image source={{ uri: selectedStory.image }} style={styles.heroImage} />  
  <View style={styles.heroShade} />  
  <View style={styles.heroContent}>  
    <Text style={styles.heroBadge}>RIVALS AI VIDEO ORIGINAL</Text>  
    <Text style={styles.heroTitle}>{selectedStory.title}</Text>  
    <Text style={styles.heroDescription}>  
      {selectedStory.description}  
    </Text>  
    <View style={styles.heroButtons}>  
      <Pressable  
        style={styles.primaryButton}  
        onPress={() => onNavigate("video", selectedStory)}  
      >  
        <Text style={styles.primaryButtonText}>▶ Watch Video</Text>  
      </Pressable>  
      <Pressable  
        style={styles.secondaryButton}  
        onPress={() => onToggleSave(selectedStory.id)}  
      >  
        <Text style={styles.secondaryButtonText}>  
          {saved[selectedStory.id] ? "✓ Saved" : "+ My List"}  
        </Text>  
      </Pressable>  
    </View>  
  </View>  
</Pressable>  

<SectionTitle title="Quick Access" />  
<ScrollView  
  horizontal  
  showsHorizontalScrollIndicator={false}  
  contentContainerStyle={styles.horizontalGap}  
>  
  {[  
    ["🔥", "Trending", "trending"],  
    ["🎬", "AI Video", "video"],  
    ["🤖", "Pocket AI", "ai"],  
    ["👥", "Community", "community"],  
    ["🎁", "Rewards", "rewards"],  
    ["👤", "Register", "register"],  
  ].map(([icon, label, target]) => (  
    <Pressable  
      key={label}  
      style={styles.quickChip}  
      onPress={() => onNavigate(target as Screen)}  
    >  
      <Text style={styles.quickIcon}>{icon}</Text>  
      <Text style={styles.quickText}>{label}</Text>  
    </Pressable>  
  ))}  
</ScrollView>  

<SectionTitle  
  title="Continue Watching"  
  action="See all"  
  onPress={() => onNavigate("library")}  
/>  
<StoryRow story={stories[0]} onPress={(s) => onNavigate("detail", s)} />  

<SectionTitle  
  title="Trending AI Videos"  
  action="View all"  
  onPress={() => onNavigate("trending")}  
/>  
<ScrollView  
  horizontal  
  showsHorizontalScrollIndicator={false}  
  contentContainerStyle={styles.horizontalGap}  
>  
  {stories.slice(0, 5).map((story: Story) => (  
    <StoryCard  
      key={story.id}  
      story={story}  
      onPress={(s) => onNavigate("detail", s)}  
    />  
  ))}  
</ScrollView>  

<SectionTitle title="Made For You" />  
{stories.slice(1, 4).map((story: Story) => (  
  <StoryRow  
    key={story.id}  
    story={story}  
    onPress={(s) => onNavigate("detail", s)}  
  />  
))}  

<SectionTitle title="Choose Your Mood" />  
<View style={styles.moodGrid}>  
  {[  
    ["🔥", "Adrenaline"],  
    ["❤️", "Romance"],  
    ["🕵️", "Mystery"],  
    ["😂", "Comedy"],  
    ["🌙", "Chill"],  
    ["🧠", "Mind Games"],  
  ].map(([emoji, mood]) => (  
    <Pressable  
      key={mood}  
      style={styles.moodCard}  
      onPress={() => {  
        setSearchQuery(  
          mood === "Adrenaline"  
            ? "Action"  
            : mood === "Mind Games"  
            ? "Thriller"  
            : mood  
        );  
        onNavigate("search");  
      }}  
    >  
      <Text style={styles.moodEmoji}>{emoji}</Text>  
      <Text style={styles.moodText}>{mood}</Text>  
    </Pressable>  
  ))}  
</View>  

<Pressable style={styles.aiBanner} onPress={() => onNavigate("ai")}>  
  <View>  
    <Text style={styles.aiBannerTitle}>🤖 Pocket AI</Text>  
    <Text style={styles.aiBannerText}>  
      Tell me what video you want to generate & watch.  
    </Text>  
  </View>  
  <Text style={styles.aiArrow}>›</Text>  
</Pressable>

  </ScrollView>  
);  const TrendingScreen = ({ stories, liked, onBack, onNavigate, onToggleLike }: any) => {
const sorted = [...stories].sort(
(a: Story, b: Story) => b.plays + b.likes * 10 - (a.plays + a.likes * 10)
);

return (
<View style={styles.flex}>
<Header title="TRENDING VIDEOS" backButton onBack={onBack} />
<FlatList
data={sorted}
keyExtractor={(item) => item.id}
contentContainerStyle={styles.listContent}
renderItem={({ item, index }) => (
<Pressable
style={styles.trendingRow}
onPress={() => onNavigate("detail", item)}
>
<Text style={styles.rank}>{index + 1}</Text>
<Image source={{ uri: item.image }} style={styles.trendingImage} />
<View style={styles.trendingContent}>
<Text style={styles.trendingTitle}>{item.title}</Text>
<Text style={styles.trendingGenre}>{item.genre}</Text>
<Text style={styles.trendingMeta}>
▶ {money(item.plays)} · ⭐ {item.rating} · ❤️ {money(item.likes)}
</Text>
</View>
<Pressable onPress={() => onToggleLike(item.id)}>
<Text style={styles.heart}>{liked[item.id] ? "♥" : "♡"}</Text>
</Pressable>
</Pressable>
)}
/>
</View>
);
};

const LibraryScreen = ({ stories, saved, downloaded, coins, onNavigate }: any) => {
const savedStories = stories.filter((story: Story) => saved[story.id]);
const downloadedStories = stories.filter((story: Story) => downloaded[story.id]);

return (
<ScrollView contentContainerStyle={styles.scrollContent}>
<Header onNavigate={onNavigate} coins={coins} />
<View style={styles.libraryTop}>
<Text style={styles.pageTitle}>Your Library</Text>
<Pressable
style={styles.smallAction}
onPress={() => onNavigate("downloads")}
>
<Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Downloads</Text>
</Pressable>
</View>

<SectionTitle title="Saved Videos & Stories" />  
  {savedStories.length ? (  
    savedStories.map((story: Story) => (  
      <StoryRow key={story.id} story={story} onPress={(s) => onNavigate("detail", s)} />  
    ))  
  ) : (  
    <EmptyState text="Your saved videos will appear here." />  
  )}  

  <SectionTitle title="Downloaded" />  
  {downloadedStories.length ? (  
    downloadedStories.map((story: Story) => (  
      <StoryRow key={story.id} story={story} onPress={(s) => onNavigate("detail", s)} />  
    ))  
  ) : (  
    <EmptyState text="Download content to watch offline." />  
  )}  
</ScrollView>

);
};

const ProfileScreen = ({ profileName, coins, onNavigate }: any) => (
<ScrollView contentContainerStyle={styles.scrollContent}>
<Header onNavigate={onNavigate} coins={coins} />
<View style={styles.profileCard}>
<View style={styles.avatar}>
<Text style={styles.avatarText}>
{profileName.charAt(0).toUpperCase()}
</Text>
</View>
<Text style={styles.profileName}>{profileName}</Text>
<Text style={styles.profileHandle}>@{profileName.toLowerCase()}</Text>

<View style={styles.stats}>  
    <Stat value="12" label="Videos" />  
    <Stat value="4.8K" label="Followers" />  
    <Stat value="231" label="Following" />  
  </View>  
</View>  

<SectionTitle title="Creator Hub & Account" />  
<View style={styles.creatorGrid}>  
  {[  
    ["🎬", "AI Video Player", "video"],  
    ["🎙", "Creator Studio", "creator"],  
    ["✍️", "Create Video", "create"],  
    ["🪙", "My Coins", "coins"],  
    ["🎁", "Rewards", "rewards"],  
    ["👤", "Register / Account", "register"],  
    ["🔔", "Notifications", "notifications"],  
    ["👑", "Premium", "premium"],  
  ].map(([icon, label, target]) => (  
    <Pressable  
      key={label}  
      style={styles.creatorTile}  
      onPress={() => onNavigate(target as Screen)}  
    >  
      <Text style={styles.tileIcon}>{icon}</Text>  
      <Text style={styles.tileText}>{label}</Text>  
    </Pressable>  
  ))}  
</View>  

<Pressable  
  style={styles.settingsButton}  
  onPress={() => onNavigate("settings")}  
>  
  <Text style={styles.settingsText}>⚙ Settings</Text>  
</Pressable>

  </ScrollView>  
);  const SearchScreen = ({ searchQuery, setSearchQuery, filteredStories, onBack, onNavigate }: any) => (
<View style={styles.flex}>
<Header title="SEARCH" backButton onBack={onBack} />
<View style={styles.searchInputWrap}>
<Text style={styles.searchIcon}>⌕</Text>
<TextInput  
value={searchQuery}  
onChangeText={setSearchQuery}  
autoFocus  
placeholder="Search videos, creators..."  
placeholderTextColor="#A0A0B0"  
style={styles.searchInput}  
/>
</View>
<FlatList
data={filteredStories}
keyExtractor={(item) => item.id}
contentContainerStyle={styles.listContent}
renderItem={({ item }) => (
<StoryRow story={item} onPress={(s) => onNavigate("detail", s)} />
)}
ListEmptyComponent={<EmptyState text="No videos or stories found." />}
/>
</View>
);

const DetailScreen = ({
selectedStory,
liked,
saved,
downloaded,
followed,
unlocked,
onBack,
onNavigate,
onToggleLike,
onToggleSave,
onToggleDownload,
onToggleFollow,
onUnlockEpisode,
shareStory,
}: any) => (
<ScrollView contentContainerStyle={styles.scrollContent}>
<Header title="STORY DETAILS" backButton onBack={onBack} />
<Image source={{ uri: selectedStory.image }} style={styles.detailImage} />

<Text style={styles.detailTitle}>{selectedStory.title}</Text>  
<Text style={styles.detailCreator}>  
  {selectedStory.genre} · {selectedStory.creator}  
</Text>  
<Text style={styles.detailStats}>  
  ⭐ {selectedStory.rating} · {money(selectedStory.plays)} plays · ❤️ {money(selectedStory.likes)} likes  
</Text>  

<Text style={styles.detailDescription}>  
  {selectedStory.description}  
</Text>  

<View style={styles.actionRow}>  
  <ActionButton  
    icon={liked[selectedStory.id] ? "♥" : "♡"}  
    text="Like"  
    active={liked[selectedStory.id]}  
    onPress={() => onToggleLike(selectedStory.id)}  
  />  
  <ActionButton  
    icon={saved[selectedStory.id] ? "✓" : "+"}  
    text="Save"  
    active={saved[selectedStory.id]}  
    onPress={() => onToggleSave(selectedStory.id)}  
  />  
  <ActionButton  
    icon="💬"  
    text="Comments"  
    onPress={() => onNavigate("comments")}  
  />  
  <ActionButton  
    icon="↗"  
    text="Share"  
    onPress={() => shareStory(selectedStory)}  
  />  
</View>  

<View style={styles.heroButtons}>  
  <Pressable  
    style={[styles.primaryButton, { flex: 1 }]}  
    onPress={() => onNavigate("video", selectedStory)}  
  >  
    <Text style={styles.primaryButtonText}>▶ Watch AI Video</Text>  
  </Pressable>  
  <Pressable  
    style={[styles.secondaryButton, { flex: 1 }]}  
    onPress={() => onNavigate("audio", selectedStory)}  
  >  
    <Text style={styles.secondaryButtonText}>🎧 Listen Audio</Text>  
  </Pressable>  
</View>  

<View style={styles.creatorBox}>  
  <View style={styles.creatorAvatar}>  
    <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>R</Text>  
  </View>  
  <View style={styles.creatorBoxContent}>  
    <Text style={styles.creatorName}>{selectedStory.creator}</Text>  
    <Text style={styles.creatorSub}>AI Video Creator</Text>  
  </View>  
  <Pressable  
    style={styles.followButton}  
    onPress={() => onToggleFollow(selectedStory.creator)}  
  >  
    <Text style={styles.followButtonText}>  
      {followed[selectedStory.creator] ? "Following" : "Follow"}  
    </Text>  
  </Pressable>  
</View>  

<Pressable  
  style={styles.downloadBox}  
  onPress={() => onToggleDownload(selectedStory.id)}  
>  
  <Text style={styles.downloadIcon}>↓</Text>  
  <View style={{ flex: 1 }}>  
    <Text style={styles.downloadTitle}>  
      {downloaded[selectedStory.id] ? "Downloaded" : "Download Video"}  
    </Text>  
    <Text style={styles.downloadSub}>Watch offline anytime.</Text>  
  </View>  
</Pressable>  

<SectionTitle title="Episodes & AI Clips" />  
{Array.from(  
  { length: Math.min(selectedStory.episodes, 15) },  
  (_, index) => index + 1  
).map((episode) => {  
  const locked =  
    episode >= selectedStory.lockedFrom &&  
    !unlocked[`${selectedStory.id}-${episode}`];  

  return (  
    <Pressable  
      key={episode}  
      style={styles.episodeRow}  
      onPress={() => onUnlockEpisode(episode)}  
    >  
      <View style={styles.episodeNumber}>  
        <Text style={{ color: "#FFFFFF", fontWeight: "950" }}>{episode}</Text>  
      </View>  
      <View style={{ flex: 1 }}>  
        <Text style={styles.episodeTitle}>Episode {episode}</Text>  
        <Text style={styles.episodeSub}>  
          {locked ? "50 coins to unlock" : selectedStory.duration}  
        </Text>  
      </View>  
      <Text style={styles.episodeIcon}>{locked ? "🔒" : "▶"}</Text>  
    </Pressable>  
  );  
})}

  </ScrollView>  
);  const VideoScreen = ({
selectedStory,
currentEpisode,
videoPlayer,
onBack,
onNavigate,
previousEpisode,
nextEpisode,
}: any) => (
<View style={[styles.flex, { backgroundColor: "#08080D" }]}>
<Header title="AI VIDEO PLAYER" backButton onBack={onBack} />
<View style={styles.videoContainer}>
<VideoView  
player={videoPlayer}  
style={styles.videoPlayerView}  
allowsFullscreen  
allowsPictureInPicture  
/>
</View>

<ScrollView contentContainerStyle={styles.scrollContent}>  
  <Text style={styles.audioTitle}>{selectedStory.title}</Text>  
  <Text style={styles.audioEpisode}>Episode {currentEpisode} (AI Video)</Text>  

  <View style={styles.playerControls}>  
    <Pressable  
      style={styles.playerButton}  
      onPress={() => {  
        videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);  
      }}  
    >  
      <Text style={styles.playerButtonText}>↶10</Text>  
    </Pressable>  

    <Pressable  
      style={styles.playButton}  
      onPress={() => {  
        if (videoPlayer.playing) {  
          videoPlayer.pause();  
        } else {  
          videoPlayer.play();  
        }  
      }}  
    >  
      <Text style={styles.playButtonText}>▶</Text>  
    </Pressable>  

    <Pressable  
      style={styles.playerButton}  
      onPress={() => {  
        videoPlayer.currentTime = videoPlayer.currentTime + 10;  
      }}  
    >  
      <Text style={styles.playerButtonText}>10↷</Text>  
    </Pressable>  
  </View>  

  <View style={styles.nextControls}>  
    <Pressable style={styles.nextButton} onPress={previousEpisode}>  
      <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>‹ Previous</Text>  
    </Pressable>  
    <Pressable  
      style={styles.nextButton}  
      onPress={() => onNavigate("audio", selectedStory)}  
    >  
      <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Switch to Audio 🎧</Text>  
    </Pressable>  
    <Pressable style={styles.nextButton} onPress={nextEpisode}>  
      <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Next ›</Text>  
    </Pressable>  
  </View>  
</ScrollView>

  </View>  
);  const AudioScreen = ({
selectedStory,
currentEpisode,
audioStatus,
speed,
autoPlay,
setAutoPlay,
onBack,
onNavigate,
playAudio,
pauseAudio,
seekAudio,
nextEpisode,
previousEpisode,
setSpeed,
}: any) => {
const progress =
audioStatus.duration > 0
? Math.min(100, (audioStatus.currentTime / audioStatus.duration) * 100)
: 0;

const formatTime = (seconds: number) => {
if (!seconds) return "0:00";
const minutes = Math.floor(seconds / 60);
const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
return ${minutes}:${secs};
};

return (
<View style={styles.flex}>
<Header title="NOW PLAYING AUDIO" backButton onBack={onBack} />
<ScrollView contentContainerStyle={styles.audioScreen}>
<Image source={{ uri: selectedStory.image }} style={styles.audioArtwork} />
<Text style={styles.audioTitle}>{selectedStory.title}</Text>
<Text style={styles.audioEpisode}>Episode {currentEpisode}</Text>

<View style={styles.progressArea}>  
      <View style={styles.progressTrack}>  
        <View style={[styles.progressFill, { width: `${progress}%` }]} />  
      </View>  
      <View style={styles.timeRow}>  
        <Text style={styles.timeText}>{formatTime(audioStatus.currentTime)}</Text>  
        <Text style={styles.timeText}>{formatTime(audioStatus.duration)}</Text>  
      </View>  
    </View>  

    <View style={styles.playerControls}>  
      <Pressable style={styles.playerButton} onPress={() => seekAudio(-10)}>  
        <Text style={styles.playerButtonText}>↶10</Text>  
      </Pressable>  

      <Pressable  
        style={styles.playButton}  
        onPress={audioStatus.playing ? pauseAudio : playAudio}  
      >  
        <Text style={styles.playButtonText}>  
          {audioStatus.isBuffering ? "…" : audioStatus.playing ? "Ⅱ" : "▶"}  
        </Text>  
      </Pressable>  

      <Pressable style={styles.playerButton} onPress={() => seekAudio(10)}>  
        <Text style={styles.playerButtonText}>10↷</Text>  
      </Pressable>  
    </View>  

    <View style={styles.playerSecondary}>  
      <Pressable  
        style={styles.optionButton}  
        onPress={() => {  
          const speeds = [0.75, 1, 1.25, 1.5, 2];  
          const index = speeds.indexOf(speed);  
          setSpeed(speeds[(index + 1) % speeds.length]);  
        }}  
      >  
        <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>{speed}x</Text>  
      </Pressable>  

      <Pressable  
        style={styles.optionButton}  
        onPress={() => onNavigate("video", selectedStory)}  
      >  
        <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>🎬 Watch Video</Text>  
      </Pressable>  

      <View style={styles.autoPlayOption}>  
        <Text style={{ color: "#FFFFFF", fontWeight: "800", marginRight: 8 }}>Auto</Text>  
        <Switch value={autoPlay} onValueChange={setAutoPlay} />  
      </View>  
    </View>  

    <View style={styles.nextControls}>  
      <Pressable style={styles.nextButton} onPress={previousEpisode}>  
        <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>‹ Previous</Text>  
      </Pressable>  
      <Pressable style={styles.nextButton} onPress={nextEpisode}>  
        <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Next ›</Text>  
      </Pressable>  
    </View>  
  </ScrollView>  
</View>

);
};

const CommentsScreen = ({
comments,
commentText,
setCommentText,
commentLiked,
onBack,
postComment,
toggleCommentLike,
}: any) => (
<KeyboardAvoidingView
behavior={Platform.OS === "ios" ? "padding" : "height"}
style={styles.flex}

> 

<Header title="COMMENTS" backButton onBack={onBack} />  
<FlatList  
  data={comments}  
  keyExtractor={(item) => item.id}  
  contentContainerStyle={styles.listContent}  
  renderItem={({ item }) => (  
    <View style={styles.commentRow}>  
      <View style={styles.commentAvatar}>  
        <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>  
          {item.user.charAt(0).toUpperCase()}  
        </Text>  
      </View>  
      <View style={styles.commentContent}>  
        <Text style={styles.commentUser}>{item.user}</Text>  
        <Text style={styles.commentText}>{item.text}</Text>  
        <Pressable onPress={() => toggleCommentLike(item.id)}>  
          <Text style={styles.commentLike}>  
            {commentLiked[item.id] ? "♥" : "♡"} {item.likes}  
          </Text>  
        </Pressable>  
      </View>  
    </View>  
  )}  
/>  

<View style={styles.commentComposer}>  
  <TextInput  
    value={commentText}  
    onChangeText={setCommentText}  
    placeholder="Write a comment..."  
    placeholderTextColor="#A0A0B0"  
    style={styles.commentInput}  
  />  
  <Pressable style={styles.sendButton} onPress={postComment}>  
    <Text style={{ color: "#08080D", fontWeight: "900" }}>➤</Text>  
  </Pressable>  
</View>

  </KeyboardAvoidingView>  
);  const CreatorScreen = ({
selectedStory,
stories,
creatorFollowing,
setCreatorFollowing,
onBack,
onNavigate,
}: any) => (
<ScrollView contentContainerStyle={styles.scrollContent}>
<Header title="CREATOR HUB" backButton onBack={onBack} />
<View style={styles.creatorHero}>
<View style={styles.creatorBigAvatar}>
<Text style={styles.creatorBigText}>R</Text>
</View>
<Text style={styles.creatorHeroTitle}>{selectedStory.creator}</Text>
<Text style={styles.creatorHeroSub}>
Producing AI video masterpieces for the next generation.
</Text>
<Pressable
style={styles.followButtonLarge}
onPress={() => setCreatorFollowing((value: boolean) => !value)}
>
<Text style={styles.followButtonText}>
{creatorFollowing ? "Following" : "Follow"}
</Text>
</Pressable>
</View>

<View style={styles.analyticsGrid}>  
  <AnalyticsCard label="Total Plays" value="24.7M" />  
  <AnalyticsCard label="Followers" value="84.2K" />  
  <AnalyticsCard label="Likes" value="2.1M" />  
  <AnalyticsCard label="Videos" value="12" />  
</View>  

<Pressable  
  style={styles.liveButton}  
  onPress={() =>  
    Alert.alert(  
      "Go Live",  
      "AI Live streaming connected successfully to streaming node."  
    )  
  }  
>  
  <Text style={styles.liveButtonText}>🔴 Go Live AI Stream</Text>  
</Pressable>  

<Pressable  
  style={styles.createLargeButton}  
  onPress={() => onNavigate("create")}  
>  
  <Text style={styles.createLargeText}>＋ Create AI Video Original</Text>  
</Pressable>  

<SectionTitle title="Your AI Originals" />  
{stories  
  .filter((story: Story) => story.creator === selectedStory.creator)  
  .map((story: Story) => (  
    <StoryRow key={story.id} story={story} onPress={(s) => onNavigate("detail", s)} />  
  ))}

  </ScrollView>  
);  const CoinsScreen = ({ coins, onBack, buyCoins }: any) => (
<ScrollView contentContainerStyle={styles.scrollContent}>
<Header title="COINS & WALLET" backButton onBack={onBack} />
<View style={styles.walletCard}>
<Text style={styles.walletLabel}>Your Balance</Text>
<Text style={styles.walletCoins}>🪙 {coins}</Text>
<Text style={styles.walletSub}>Use coins to unlock premium AI videos.</Text>
</View>

<SectionTitle title="Get More Coins" />  
{COIN_PACKAGES.map((pack) => (  
  <Pressable  
    key={pack.id}  
    style={styles.coinPackage}  
    onPress={() => buyCoins(pack.url)}  
  >  
    <View>  
      <Text style={styles.coinPackageCoins}>  
        🪙 {pack.coins.toLocaleString()} Coins  
      </Text>  
      <Text style={styles.coinPackagePrice}>{pack.price}</Text>  
    </View>  
    <View style={styles.buyButton}>  
      <Text style={styles.buyButtonText}>BUY</Text>  
    </View>  
  </Pressable>  
))}  
<Text style={styles.paymentNote}>Payments processed securely via Paynow.</Text>

  </ScrollView>  
);  const RewardsScreen = ({ claimedDaily, claimReward, onBack }: any) => (
<ScrollView contentContainerStyle={styles.scrollContent}>
<Header title="DAILY REWARDS" backButton onBack={onBack} />
<View style={styles.rewardCard}>
<Text style={styles.rewardEmoji}>🎁</Text>
<Text style={styles.rewardTitle}>Daily Streak Reward</Text>
<Text style={styles.rewardText}>Keep your daily streak alive and earn coins.</Text>
<Pressable
style={[styles.primaryButton, claimedDaily && styles.disabledButton]}
disabled={claimedDaily}
onPress={claimReward}
>
<Text style={styles.primaryButtonText}>
{claimedDaily ? "Claimed ✓" : "Claim +100 Coins"}
</Text>
</Pressable>
</View>

<SectionTitle title="7 Day Streak" />  
<View style={styles.streakRow}>  
  {[1, 2, 3, 4, 5, 6, 7].map((day) => (  
    <View  
      key={day}  
      style={[styles.streakDay, day === 1 && styles.streakActive]}  
    >  
      <Text style={{ color: day === 1 ? "#08080D" : "#FFFFFF", fontWeight: "900" }}>  
        {day}  
      </Text>  
    </View>  
  ))}  
</View>

  </ScrollView>  
);  const NotificationsScreen = ({ onBack }: any) => (
<ScrollView contentContainerStyle={styles.scrollContent}>
<Header title="NOTIFICATIONS" backButton onBack={onBack} />
{[
"🔥 Dark City AI video released a new episode.",
"🎁 Your daily reward of 100 coins is ready.",
"❤️ Someone liked your AI video creation.",
"🎙 Ruddy Studios published a new video original.",
].map((text, index) => (
<View key={index} style={styles.notificationRow}>
<View style={styles.notificationDot} />
<Text style={styles.notificationText}>{text}</Text>
</View>
))}
</ScrollView>
);

const AIScreen = ({
aiMessages,
aiInput,
setAiInput,
aiLoading,
aiError,
setAiError,
sendAIMessage,
onBack,
}: any) => (
<View style={styles.flex}>
<Header title="POCKET AI" backButton onBack={onBack} />
<FlatList
data={aiMessages}
keyExtractor={(item) => item.id}
contentContainerStyle={styles.aiList}
renderItem={({ item }) => (
<View
style={[
styles.aiMessage,
item.role === "user" ? styles.aiUser : styles.aiAssistant,
]}
>
{item.role === "assistant" && (
<Text style={styles.aiName}>Pocket AI</Text>
)}
<Text style={styles.aiMessageText}>{item.text}</Text>
</View>
)}
ListHeaderComponent={
<View>
<View style={styles.aiIntro}>
<Text style={styles.aiIntroEmoji}>🤖</Text>
<Text style={styles.aiIntroTitle}>Hey 👋 I'm Pocket AI</Text>
<Text style={styles.aiIntroText}>
Your personal AI video director and assistant.
</Text>
</View>

<ScrollView  
        horizontal  
        showsHorizontalScrollIndicator={false}  
        contentContainerStyle={styles.horizontalGap}  
      >  
        {[  
          "Generate an action AI video 🔥",  
          "Give me a romance story ❤️",  
          "Recommend a sci-fi thriller 🕵️",  
          "Surprise me with a video 🎲",  
        ].map((prompt) => (  
          <Pressable  
            key={prompt}  
            style={styles.promptChip}  
            onPress={() => sendAIMessage(prompt)}  
          >  
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>{prompt}</Text>  
          </Pressable>  
        ))}  
      </ScrollView>  

      {aiError ? (  
        <View style={styles.aiError}>  
          <Text style={styles.aiErrorText}>{aiError}</Text>  
          <Pressable onPress={() => setAiError("")}>  
            <Text style={styles.retryText}>Dismiss</Text>  
          </Pressable>  
        </View>  
      ) : null}  
    </View>  
  }  
/>  

<View style={styles.aiComposer}>  
  <TextInput  
    value={aiInput}  
    onChangeText={setAiInput}  
    placeholder="Ask Pocket AI..."  
    placeholderTextColor="#A0A0B0"  
    style={styles.aiInput}  
    multiline  
  />  
  <Pressable style={styles.aiSend} onPress={() => sendAIMessage()}>  
    <Text style={styles.aiSendText}>{aiLoading ? "…" : "➤"}</Text>  
  </Pressable>  
</View>

  </View>  
);  const CommunityScreen = ({ stories, onBack, onNavigate }: any) => (
<ScrollView contentContainerStyle={styles.scrollContent}>
<Header title="COMMUNITY" backButton onBack={onBack} />
<Text style={styles.pageTitle}>Community Feed</Text>

{[  
  ["Tasha", "Episode 12 was CRAZY 😭🔥"],  
  ["Mike", "What AI video should I watch next?"],  
  ["Nia", "The Pocket Rivals AI video originals are unmatched."],  
].map(([user, text]) => (  
  <View key={user} style={styles.communityPost}>  
    <Text style={styles.communityUser}>@{user}</Text>  
    <Text style={styles.communityText}>{text}</Text>  
  </View>  
))}  

<SectionTitle title="Explore AI Creators" />  
{stories.slice(0, 4).map((story: Story) => (  
  <Pressable  
    key={story.creator}  
    style={styles.creatorExplore}  
    onPress={() => onNavigate("creator", story)}  
  >  
    <View style={styles.creatorAvatar}>  
      <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>  
        {story.creator.charAt(0)}  
      </Text>  
    </View>  
    <View style={{ flex: 1 }}>  
      <Text style={styles.creatorName}>{story.creator}</Text>  
      <Text style={styles.creatorSub}>{story.genre}</Text>  
    </View>  
    <Text style={{ color: "#FFFFFF", fontSize: 20 }}>›</Text>  
  </Pressable>  
))}

  </ScrollView>  
);  const SettingsScreen = ({
profileName,
setProfileName,
autoPlay,
setAutoPlay,
autoUnlock,
setAutoUnlock,
notificationsEnabled,
setNotificationsEnabled,
onBack,
}: any) => (
<ScrollView contentContainerStyle={styles.scrollContent}>
<Header title="SETTINGS" backButton onBack={onBack} />
<Text style={styles.pageTitle}>App Settings</Text>

<TextInput  
  value={profileName}  
  onChangeText={setProfileName}  
  placeholder="Your name"  
  placeholderTextColor="#A0A0B0"  
  style={styles.settingsInput}  
/>  

<SettingToggle title="Auto Play AI Video" value={autoPlay} onChange={setAutoPlay} />  
<SettingToggle title="Auto Unlock Episodes" value={autoUnlock} onChange={setAutoUnlock} />  
<SettingToggle title="Push Notifications" value={notificationsEnabled} onChange={setNotificationsEnabled} />  

<View style={styles.settingRow}>  
  <Text style={styles.settingTitle}>Dark Mode</Text>  
  <Text style={styles.settingValue}>Always On</Text>  
</View>  
<View style={styles.settingRow}>  
  <Text style={styles.settingTitle}>Privacy & Security</Text>  
  <Text style={styles.settingValue}>Protected</Text>  
</View>

  </ScrollView>  
);  const PremiumScreen = ({ onBack }: any) => (
<ScrollView contentContainerStyle={styles.scrollContent}>
<Header title="PREMIUM" backButton onBack={onBack} />
<View style={styles.premiumCard}>
<Text style={styles.premiumCrown}>👑</Text>
<Text style={styles.premiumTitle}>Pocket Rivals Premium</Text>
<Text style={styles.premiumText}>Unlock ultra high definition AI video streaming.</Text>

{[  
    "Ad-free 4K AI video streaming",  
    "Exclusive AI video originals",  
    "Early episode access",  
    "Unlimited Pocket AI generation",  
  ].map((feature) => (  
    <Text key={feature} style={styles.premiumFeature}>  
      ✓ {feature}  
    </Text>  
  ))}  

  <Pressable  
    style={styles.primaryButton}  
    onPress={() => Alert.alert("Premium", "Subscription backend connected.")}  
  >  
    <Text style={styles.primaryButtonText}>Start Premium</Text>  
  </Pressable>  
</View>

  </ScrollView>  
);  const CreateScreen = ({
newStoryTitle,
setNewStoryTitle,
newStoryDescription,
setNewStoryDescription,
newStoryGenre,
setNewStoryGenre,
publishStory,
onBack,
}: any) => (
<ScrollView contentContainerStyle={styles.scrollContent}>
<Header title="CREATE AI VIDEO" backButton onBack={onBack} />
<Text style={styles.pageTitle}>New Original Video</Text>

<TextInput  
  value={newStoryTitle}  
  onChangeText={setNewStoryTitle}  
  placeholder="Video title"  
  placeholderTextColor="#A0A0B0"  
  style={styles.formInput}  
/>  

<TextInput  
  value={newStoryDescription}  
  onChangeText={setNewStoryDescription}  
  placeholder="Description"  
  placeholderTextColor="#A0A0B0"  
  multiline  
  style={[styles.formInput, styles.textArea]}  
/>  

<Text style={styles.formLabel}>Genre</Text>  
<View style={styles.genreRow}>  
  {["Drama", "Romance", "Thriller", "Fantasy", "Action", "Mystery"].map((genre) => (  
    <Pressable  
      key={genre}  
      style={[  
        styles.genreChip,  
        newStoryGenre === genre && styles.genreChipActive,  
      ]}  
      onPress={() => setNewStoryGenre(genre)}  
    >  
      <Text  
        style={{  
          color: newStoryGenre === genre ? "#08080D" : "#FFFFFF",  
          fontWeight: "800",  
        }}  
      >  
        {genre}  
      </Text>  
    </Pressable>  
  ))}  
</View>  

<Pressable style={styles.createLargeButton} onPress={publishStory}>  
  <Text style={styles.createLargeText}>🚀 Publish AI Video Original</Text>  
</Pressable>

  </ScrollView>  
);  const DownloadsScreen = ({ stories, downloaded, onBack, onNavigate }: any) => (
<ScrollView contentContainerStyle={styles.scrollContent}>
<Header title="DOWNLOADS" backButton onBack={onBack} />
{stories
.filter((story: Story) => downloaded[story.id])
.map((story: Story) => (
<StoryRow key={story.id} story={story} onPress={(s) => onNavigate("detail", s)} />
))}

{!stories.some((story: Story) => downloaded[story.id]) && (  
  <EmptyState text="Nothing downloaded yet." />  
)}

  </ScrollView>  
);  const RegisterScreen = ({
regUsername,
setRegUsername,
regEmail,
setRegEmail,
regPassword,
setRegPassword,
handleRegister,
onBack,
}: any) => (
<ScrollView contentContainerStyle={styles.scrollContent}>
<Header title="ACCOUNT REGISTRATION" backButton onBack={onBack} />
<View style={styles.profileCard}>
<Text style={styles.pageTitle}>Create Account</Text>
<Text style={styles.audioEpisode}>
Register with valid credentials to unlock full community features.
</Text>

<TextInput  
    value={regUsername}  
    onChangeText={setRegUsername}  
    placeholder="Username (min 3 chars)"  
    placeholderTextColor="#A0A0B0"  
    style={styles.settingsInput}  
  />  

  <TextInput  
    value={regEmail}  
    onChangeText={setRegEmail}  
    placeholder="Email address (e.g. user@domain.com)"  
    placeholderTextColor="#A0A0B0"  
    keyboardType="email-address"  
    autoCapitalize="none"  
    style={styles.settingsInput}  
  />  

  <TextInput  
    value={regPassword}  
    onChangeText={setRegPassword}  
    placeholder="Password (min 6 chars)"  
    placeholderTextColor="#A0A0B0"  
    secureTextEntry  
    style={styles.settingsInput}  
  />  

  <Pressable  
    style={[styles.primaryButton, { width: "100%", marginTop: 10 }]}  
    onPress={handleRegister}  
  >  
    <Text style={styles.primaryButtonText}>Register Account 🚀</Text>  
  </Pressable>  
</View>

  </ScrollView>  
);  /* =========================================================
APP COMPONENT
========================================================= */

export default function App() {
const [screen, setScreen] = useState<Screen>("home");
const [previousScreen, setPreviousScreen] = useState<Screen>("home");

const [stories, setStories] = useState<Story[]>(STORIES);
const [selectedStory, setSelectedStory] = useState<Story>(STORIES[0]);

const [liked, setLiked] = useState<Record<string, boolean>>({});
const [saved, setSaved] = useState<Record<string, boolean>>({});
const [followed, setFollowed] = useState<Record<string, boolean>>({});
const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});
const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
const [commentLiked, setCommentLiked] = useState<Record<string, boolean>>({});

const [coins, setCoins] = useState(250);
const [claimedDaily, setClaimedDaily] = useState(false);
const [searchQuery, setSearchQuery] = useState("");

const [comments, setComments] = useState<CommentItem[]>(COMMENTS);
const [commentText, setCommentText] = useState("");
const [currentEpisode, setCurrentEpisode] = useState(1);
const [speed, setSpeed] = useState(1);
const [autoPlay, setAutoPlay] = useState(true);
const [autoUnlock, setAutoUnlock] = useState(false);
const [notificationsEnabled, setNotificationsEnabled] = useState(true);
const [profileName, setProfileName] = useState("Ruddy");
const [creatorFollowing, setCreatorFollowing] = useState(false);

// Registration state with validation
const [regUsername, setRegUsername] = useState("");
const [regEmail, setRegEmail] = useState("");
const [regPassword, setRegPassword] = useState("");

const [newStoryTitle, setNewStoryTitle] = useState("");
const [newStoryDescription, setNewStoryDescription] = useState("");
const [newStoryGenre, setNewStoryGenre] = useState("Drama");

/* ---------------- AI ---------------- */

const [aiMessages, setAiMessages] = useState<AIMessage[]>([
{
id: "welcome",
role: "assistant",
text: "Hey 👋 I'm Pocket AI. Tell me what kind of story you're in the mood for and I'll find something for you.",
},
]);
const [aiInput, setAiInput] = useState("");
const [aiLoading, setAiLoading] = useState(false);
const [aiError, setAiError] = useState("");

/* ---------------- AUDIO ---------------- */

const audioSource = selectedStory.audioUrl || AUDIO_URL;
const player = useAudioPlayer(audioSource, {
updateInterval: 500,
downloadFirst: false,
preferredForwardBufferDuration: 15,
});
const audioStatus = useAudioPlayerStatus(player);

/* ---------------- VIDEO ---------------- */

const videoSource = selectedStory.videoUrl || VIDEO_URL;
const videoPlayer = useVideoPlayer(videoSource, (playerInstance) => {
playerInstance.loop = true;
playerInstance.staysActiveInBackground = false;
});

useEffect(() => {
setAudioModeAsync({
playsInSilentMode: true,
shouldPlayInBackground: false,
}).catch(() => {});
}, []);

useEffect(() => {
try {
player.playbackRate = speed;
} catch {}
}, [speed]);

/* =======================================================
NAVIGATION
======================================================= */

const navigate = (next: Screen, story?: Story) => {
setPreviousScreen(screen);
if (story) {
setSelectedStory(story);
}
setScreen(next);
};

const back = () => {
setScreen(previousScreen || "home");
};

/* =======================================================
API
======================================================= */

const loadShows = async () => {
try {
const response = await fetch(${API_URL}/api/shows);
if (!response.ok) return;
const data = await response.json();
if (Array.isArray(data) && data.length) {
setStories(data.map(normalizeShow));
}
} catch (error) {
console.log("Using offline stories:", error);
}
};

useEffect(() => {
loadShows();
}, []);

/* =======================================================
LIKES
======================================================= */

const toggleLike = async (id: string) => {
const wasLiked = !!liked[id];
const next = !wasLiked;

setLiked((old) => ({  
  ...old,  
  [id]: next,  
}));  

setStories((old) =>  
  old.map((story) =>  
    story.id === id  
      ? {  
          ...story,  
          likes: Math.max(0, story.likes + (next ? 1 : -1)),  
        }  
      : story  
  )  
);  

if (selectedStory.id === id) {  
  setSelectedStory((prev) => ({  
    ...prev,  
    likes: Math.max(0, prev.likes + (next ? 1 : -1)),  
  }));  
}  

if (!next) return;  

try {  
  await fetch(`${API_URL}/api/like`, {  
    method: "POST",  
    headers: { "Content-Type": "application/json" },  
    body: JSON.stringify({ seriesId: id, user: profileName }),  
  });  
} catch {  
  console.log("Like saved locally; server unavailable.");  
}

};

const toggleSave = (id: string) => {
setSaved((old) => ({ ...old, [id]: !old[id] }));
};

const toggleFollow = (creator: string) => {
setFollowed((old) => ({ ...old, [creator]: !old[creator] }));
};

const toggleDownload = (id: string) => {
setDownloaded((old) => ({ ...old, [id]: !old[id] }));
};

const shareStory = async (story: Story) => {
try {
await Share.share({
message: Check out "${story.title}" on Pocket Rivals 🔥,
});
} catch {}
};

const postComment = async () => {
const text = commentText.trim();
if (!text) return;

const optimistic = {  
  id: String(Date.now()),  
  user: profileName,  
  text,  
  likes: 0,  
};  

setComments((old) => [optimistic, ...old]);  
setCommentText("");  

try {  
  await fetch(`${API_URL}/api/comments`, {  
    method: "POST",  
    headers: { "Content-Type": "application/json" },  
    body: JSON.stringify({  
      seriesId: selectedStory.id,  
      user: profileName,  
      text,  
    }),  
  });  
} catch {  
  console.log("Comment saved locally.");  
}

};

const toggleCommentLike = (id: string) => {
setCommentLiked((old) => {
const next = !old[id];
setComments((current) =>
current.map((comment) =>
comment.id === id
? {
...comment,
likes: Math.max(0, comment.likes + (next ? 1 : -1)),
}
: comment
)
);
return { ...old, [id]: next };
});
};

const claimReward = () => {
if (claimedDaily) return;
setCoins((value) => value + 100);
setClaimedDaily(true);
Alert.alert("Reward claimed 🎁", "+100 coins added.");
};

const unlockEpisode = (episode: number) => {
const key = ${selectedStory.id}-${episode};
if (unlocked[key] || episode < selectedStory.lockedFrom) {
setCurrentEpisode(episode);
navigate("audio", selectedStory);
return;
}

if (coins >= 50) {  
  setCoins((value) => value - 50);  
  setUnlocked((old) => ({ ...old, [key]: true }));  
  setCurrentEpisode(episode);  
  navigate("audio", selectedStory);  
  return;  
}  

Alert.alert(  
  "Not enough coins",  
  "You need 50 coins to unlock this episode.",  
  [  
    { text: "Get Coins", onPress: () => navigate("coins") },  
    { text: "Cancel", style: "cancel" },  
  ]  
);

};

const handleRegister = () => {
const cleanUser = regUsername.trim();
const cleanEmail = regEmail.trim();
const cleanPass = regPassword.trim();

if (cleanUser.length < 3) {  
  Alert.alert("Invalid Username", "Username must be at least 3 characters long.");  
  return;  
}  
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;  
if (!emailRegex.test(cleanEmail)) {  
  Alert.alert("Invalid Email", "Please enter a valid email address (e.g., user@domain.com).");  
  return;  
}  
if (cleanPass.length < 6) {  
  Alert.alert("Weak Password", "Password must be at least 6 characters long.");  
  return;  
}  

setProfileName(cleanUser);  
Alert.alert("Success 🎉", `Account created successfully for @${cleanUser}!`);  
navigate("home");

};

const playAudio = () => {
try {
player.play();
} catch {
Alert.alert("Audio error", "This episode could not be played.");
}
};

const pauseAudio = () => {
try {
player.pause();
} catch {}
};

const seekAudio = (seconds: number) => {
try {
const next = Math.max(
0,
Math.min(audioStatus.duration || 0, audioStatus.currentTime + seconds)
);
player.seekTo(next);
} catch {}
};

const nextEpisode = () => {
if (currentEpisode >= selectedStory.episodes) return;
setCurrentEpisode((value) => value + 1);
};

const previousEpisode = () => {
setCurrentEpisode((value) => Math.max(1, value - 1));
};

const filteredStories = useMemo(() => {
const q = searchQuery.toLowerCase().trim();
if (!q) return stories;
return stories.filter(
(story) =>
story.title.toLowerCase().includes(q) ||
story.genre.toLowerCase().includes(q) ||
story.author.toLowerCase().includes(q) ||
story.creator.toLowerCase().includes(q)
);
}, [stories, searchQuery]);

const sendAIMessage = async (text?: string) => {
const message = (text ?? aiInput).trim();
if (!message || aiLoading) return;

const userMessage: AIMessage = {  
  id: `${Date.now()}-user`,  
  role: "user",  
  text: message,  
};  

const history = [...aiMessages, userMessage];  
setAiMessages(history);  
setAiInput("");  
setAiLoading(true);  
setAiError("");  

try {  
  const response = await fetch(AI_ENDPOINT, {  
    method: "POST",  
    headers: { "Content-Type": "application/json" },  
    body: JSON.stringify({  
      message,  
      messages: history,  
      app: "Pocket Rivals",  
      assistantName: "Pocket AI",  
      shows: stories.slice(0, 20).map((story) => ({  
        id: story.id,  
        title: story.title,  
        genre: story.genre,  
        description: story.description,  
      })),  
    }),  
  });  

  const data = await response.json().catch(() => ({}));  
  if (!response.ok) {  
    throw new Error(data?.message || `AI server error ${response.status}`);  
  }  

  const reply = data?.reply || data?.message || data?.output || data?.text;  
  if (!reply) throw new Error("Pocket AI returned an empty response.");  

  setAiMessages((old) => [  
    ...old,  
    { id: `${Date.now()}-ai`, role: "assistant", text: reply },  
  ]);  
} catch (error: any) {  
  setAiError(error?.message || "Pocket AI couldn't connect.");  
} finally {  
  setAiLoading(false);  
}

};

const publishStory = async () => {
if (!newStoryTitle.trim()) {
Alert.alert("Missing title", "Give your story a title first.");
return;
}

const story: Story = {  
  id: String(Date.now()),  
  title: newStoryTitle.trim(),  
  genre: newStoryGenre,  
  author: profileName,  
  creator: `${profileName} Originals`,  
  description: newStoryDescription.trim() || "A brand new Pocket Rivals original.",  
  image: FALLBACK_IMAGE,  
  plays: 0,  
  likes: 0,  
  rating: 5,  
  episodes: 1,  
  lockedFrom: 6,  
  duration: "15 min",  
  videoUrl: VIDEO_URL,  
};  

setStories((old) => [story, ...old]);  

try {  
  await fetch(`${API_URL}/api/shows`, {  
    method: "POST",  
    headers: { "Content-Type": "application/json" },  
    body: JSON.stringify({  
      ...story,  
      views: 0,  
      seasons: [{ seasonTitle: "Season 1", episodes: [] }],  
    }),  
  });  
} catch {  
  console.log("Server unavailable; story kept locally.");  
}  

setNewStoryTitle("");  
setNewStoryDescription("");  
Alert.alert("Published 🚀", "Your AI video story has been published.");  
navigate("creator", story);

};

const buyCoins = async (url: string) => {
try {
const supported = await Linking.canOpenURL(url);
if (!supported) {
Alert.alert("Paynow unavailable", "Unable to open Paynow.");
return;
}
await Linking.openURL(url);
} catch {
Alert.alert("Payment error", "Unable to open Paynow.");
}
};

/* =======================================================
SCREEN ROUTER
======================================================= */

const renderScreen = () => {
switch (screen) {
case "home":
return (
<HomeScreen  
stories={stories}  
selectedStory={selectedStory}  
saved={saved}  
coins={coins}  
onNavigate={navigate}  
onToggleSave={toggleSave}  
setSearchQuery={setSearchQuery}  
/>
);
case "trending":
return (
<TrendingScreen  
stories={stories}  
liked={liked}  
onBack={back}  
onNavigate={navigate}  
onToggleLike={toggleLike}  
/>
);
case "library":
return (
<LibraryScreen  
stories={stories}  
saved={saved}  
downloaded={downloaded}  
coins={coins}  
onNavigate={navigate}  
/>
);
case "profile":
return (
<ProfileScreen  
profileName={profileName}  
coins={coins}  
onNavigate={navigate}  
/>
);
case "search":
return (
<SearchScreen  
searchQuery={searchQuery}  
setSearchQuery={setSearchQuery}  
filteredStories={filteredStories}  
onBack={back}  
onNavigate={navigate}  
/>
);
case "detail":
return (
<DetailScreen  
selectedStory={selectedStory}  
liked={liked}  
saved={saved}  
downloaded={downloaded}  
followed={followed}  
unlocked={unlocked}  
onBack={back}  
onNavigate={navigate}  
onToggleLike={toggleLike}  
onToggleSave={toggleSave}  
onToggleDownload={toggleDownload}  
onToggleFollow={toggleFollow}  
onUnlockEpisode={unlockEpisode}  
shareStory={shareStory}  
/>
);
case "audio":
return (
<AudioScreen  
selectedStory={selectedStory}  
currentEpisode={currentEpisode}  
audioStatus={audioStatus}  
speed={speed}  
autoPlay={autoPlay}  
setAutoPlay={setAutoPlay}  
onBack={back}  
onNavigate={navigate}  
playAudio={playAudio}  
pauseAudio={pauseAudio}  
seekAudio={seekAudio}  
nextEpisode={nextEpisode}  
previousEpisode={previousEpisode}  
setSpeed={setSpeed}  
/>
);
case "video":
return (
<VideoScreen  
selectedStory={selectedStory}  
currentEpisode={currentEpisode}  
videoPlayer={videoPlayer}  
onBack={back}  
onNavigate={navigate}  
previousEpisode={previousEpisode}  
nextEpisode={nextEpisode}  
/>
);
case "comments":
return (
<CommentsScreen  
comments={comments}  
commentText={commentText}  
setCommentText={setCommentText}  
commentLiked={commentLiked}  
onBack={back}  
postComment={postComment}  
toggleCommentLike={toggleCommentLike}  
/>
);
case "creator":
return (
<CreatorScreen  
selectedStory={selectedStory}  
stories={stories}  
creatorFollowing={creatorFollowing}  
setCreatorFollowing={setCreatorFollowing}  
onBack={back}  
onNavigate={navigate}  
/>
);
case "coins":
return <CoinsScreen coins={coins} onBack={back} buyCoins={buyCoins} />;
case "rewards":
return (
<RewardsScreen  
claimedDaily={claimedDaily}  
claimReward={claimReward}  
onBack={back}  
/>
);
case "notifications":
return <NotificationsScreen onBack={back} />;
case "ai":
return (
<AIScreen  
aiMessages={aiMessages}  
aiInput={aiInput}  
setAiInput={setAiInput}  
aiLoading={aiLoading}  
aiError={aiError}  
setAiError={setAiError}  
sendAIMessage={sendAIMessage}  
onBack={back}  
/>
);
case "community":
return (
<CommunityScreen  
stories={stories}  
onBack={back}  
onNavigate={navigate}  
/>
);
case "settings":
return (
<SettingsScreen  
profileName={profileName}  
setProfileName={setProfileName}  
autoPlay={autoPlay}  
setAutoPlay={setAutoPlay}  
autoUnlock={autoUnlock}  
setAutoUnlock={setAutoUnlock}  
notificationsEnabled={notificationsEnabled}  
setNotificationsEnabled={setNotificationsEnabled}  
onBack={back}  
/>
);
case "premium":
return <PremiumScreen onBack={back} />;
case "create":
return (
<CreateScreen  
newStoryTitle={newStoryTitle}  
setNewStoryTitle={setNewStoryTitle}  
newStoryDescription={newStoryDescription}  
setNewStoryDescription={setNewStoryDescription}  
newStoryGenre={newStoryGenre}  
setNewStoryGenre={setNewStoryGenre}  
publishStory={publishStory}  
onBack={back}  
/>
);
case "downloads":
return (
<DownloadsScreen  
stories={stories}  
downloaded={downloaded}  
onBack={back}  
onNavigate={navigate}  
/>
);
case "register":
return (
<RegisterScreen  
regUsername={regUsername}  
setRegUsername={setRegUsername}  
regEmail={regEmail}  
setRegEmail={setRegEmail}  
regPassword={regPassword}  
setRegPassword={setRegPassword}  
handleRegister={handleRegister}  
onBack={back}  
/>
);
default:
return (
<HomeScreen  
stories={stories}  
selectedStory={selectedStory}  
saved={saved}  
coins={coins}  
onNavigate={navigate}  
onToggleSave={toggleSave}  
setSearchQuery={setSearchQuery}  
/>
);
}
};

const bottomScreens: Screen[] = ["home", "trending", "library", "profile"];

return (
<SafeAreaView style={styles.safe}>
<StatusBar barStyle="light-content" backgroundColor="#08080D" />
<View style={styles.flex}>
{renderScreen()}
{bottomScreens.includes(screen) && (
<BottomNav screen={screen} onNavigate={navigate} />
)}
</View>
</SafeAreaView>
);
}

/* =========================================================
STYLES (Pure White Text Theme)
========================================================= */

const styles = StyleSheet.create({
safe: {
flex: 1,
backgroundColor: "#08080D",
},
flex: {
flex: 1,
},
scrollContent: {
padding: 18,
paddingBottom: 110,
},
header: {
minHeight: 64,
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
marginBottom: 10,
},
headerLeft: {
flexDirection: "row",
alignItems: "center",
gap: 10,
},
headerRight: {
flexDirection: "row",
alignItems: "center",
gap: 8,
},
logo: {
color: "#FFFFFF",
fontSize: 21,
fontWeight: "900",
letterSpacing: 1.4,
},
tagline: {
color: "#D0D0E0",
fontSize: 11,
marginTop: 2,
fontWeight: "600",
},
iconButton: {
width: 38,
height: 38,
borderRadius: 19,
backgroundColor: "#15151D",
alignItems: "center",
justifyContent: "center",
},
iconText: {
color: "#FFFFFF",
fontSize: 28,
lineHeight: 28,
},
aiButton: {
paddingHorizontal: 11,
paddingVertical: 8,
borderRadius: 15,
backgroundColor: "#20202B",
},
aiButtonText: {
color: "#FFFFFF",
fontWeight: "900",
fontSize: 12,
},
coinSmall: {
flexDirection: "row",
alignItems: "center",
backgroundColor: "#17171F",
borderRadius: 15,
paddingHorizontal: 9,
paddingVertical: 7,
gap: 4,
},
coinText: {
color: "#FFFFFF",
fontWeight: "800",
fontSize: 12,
},
searchBox: {
height: 52,
borderRadius: 17,
backgroundColor: "#15151D",
flexDirection: "row",
alignItems: "center",
paddingHorizontal: 16,
marginBottom: 18,
},
searchIcon: {
color: "#FFFFFF",
fontSize: 22,
marginRight: 10,
},
searchPlaceholder: {
color: "#D0D0E0",
fontSize: 14,
fontWeight: "600",
},
searchInputWrap: {
height: 52,
borderRadius: 17,
backgroundColor: "#15151D",
flexDirection: "row",
alignItems: "center",
paddingHorizontal: 14,
marginHorizontal: 18,
marginBottom: 10,
},
searchInput: {
flex: 1,
color: "#FFFFFF",
fontSize: 16,
fontWeight: "600",
},
hero: {
height: 430,
borderRadius: 24,
overflow: "hidden",
marginBottom: 24,
backgroundColor: "#15151D",
},
heroImage: {
...StyleSheet.absoluteFillObject,
},
heroShade: {
...StyleSheet.absoluteFillObject,
backgroundColor: "rgba(0,0,0,0.48)",
},
heroContent: {
flex: 1,
justifyContent: "flex-end",
padding: 22,
},
heroBadge: {
color: "#FFFFFF",
fontSize: 11,
fontWeight: "900",
marginBottom: 8,
letterSpacing: 1,
},
heroTitle: {
color: "#FFFFFF",
fontSize: 32,
fontWeight: "900",
marginBottom: 8,
},
heroDescription: {
color: "#FFFFFF",
fontSize: 14,
lineHeight: 20,
marginBottom: 17,
fontWeight: "600",
},
heroButtons: {
flexDirection: "row",
gap: 10,
},
primaryButton: {
backgroundColor: "#FFFFFF",
borderRadius: 14,
paddingHorizontal: 19,
paddingVertical: 13,
alignItems: "center",
justifyContent: "center",
},
primaryButtonText: {
color: "#08080D",
fontWeight: "900",
fontSize: 14,
},
secondaryButton: {
backgroundColor: "rgba(255,255,255,0.13)",
borderWidth: 1,
borderColor: "rgba(255,255,255,0.25)",
borderRadius: 14,
paddingHorizontal: 17,
paddingVertical: 13,
alignItems: "center",
justifyContent: "center",
},
secondaryButtonText: {
color: "#FFFFFF",
fontWeight: "800",
fontSize: 14,
},
sectionHeader: {
flexDirection: "row",
justifyContent: "space-between",
alignItems: "center",
marginTop: 8,
marginBottom: 12,
},
sectionTitle: {
color: "#FFFFFF",
fontSize: 19,
fontWeight: "900",
},
sectionAction: {
color: "#FFFFFF",
fontSize: 12,
fontWeight: "800",
},
horizontalGap: {
gap: 12,
paddingBottom: 8,
},
quickChip: {
width: 104,
minHeight: 88,
backgroundColor: "#15151D",
borderRadius: 18,
padding: 13,
justifyContent: "space-between",
},
quickIcon: {
fontSize: 23,
},
quickText: {
color: "#FFFFFF",
fontWeight: "800",
fontSize: 12,
},
storyCard: {
width: width * 0.43,
backgroundColor: "#111119",
borderRadius: 18,
overflow: "hidden",
marginRight: 1,
},
storyImage: {
width: "100%",
height: 185,
},
storyOverlay: {
position: "absolute",
top: 10,
left: 10,
backgroundColor: "rgba(0,0,0,0.6)",
borderRadius: 9,
paddingHorizontal: 8,
paddingVertical: 5,
},
storyGenre: {
color: "#FFFFFF",
fontSize: 10,
fontWeight: "900",
},
storyInfo: {
padding: 12,
},
storyTitle: {
color: "#FFFFFF",
fontWeight: "900",
fontSize: 14,
minHeight: 38,
},
storyMeta: {
color: "#FFFFFF",
fontSize: 11,
marginTop: 7,
fontWeight: "700",
},
storyRow: {
flexDirection: "row",
alignItems: "center",
backgroundColor: "#111119",
borderRadius: 17,
padding: 9,
marginBottom: 9,
},
rowImage: {
width: 73,
height: 73,
borderRadius: 13,
},
rowContent: {
flex: 1,
paddingHorizontal: 11,
},
rowTitle: {
color: "#FFFFFF",
fontSize: 15,
fontWeight: "900",
},
rowGenre: {
color: "#FFFFFF",
fontSize: 11,
marginTop: 5,
fontWeight: "700",
},
rowMeta: {
color: "#FFFFFF",
fontSize: 11,
marginTop: 5,
fontWeight: "700",
},
chevron: {
color: "#FFFFFF",
fontSize: 25,
paddingHorizontal: 5,
},
moodGrid: {
flexDirection: "row",
flexWrap: "wrap",
gap: 10,
marginBottom: 20,
},
moodCard: {
width: "31.5%",
backgroundColor: "#15151D",
borderRadius: 16,
padding: 14,
minHeight: 88,
justifyContent: "space-between",
},
moodEmoji: {
fontSize: 24,
},
moodText: {
color: "#FFFFFF",
fontWeight: "800",
fontSize: 12,
},
aiBanner: {
backgroundColor: "#15151D",
borderRadius: 20,
padding: 19,
flexDirection: "row",
justifyContent: "space-between",
alignItems: "center",
marginBottom: 20,
},
aiBannerTitle: {
color: "#FFFFFF",
fontSize: 18,
fontWeight: "900",
},
aiBannerText: {
color: "#FFFFFF",
marginTop: 5,
fontWeight: "700",
},
aiArrow: {
color: "#FFFFFF",
fontSize: 28,
},
bottomNav: {
position: "absolute",
left: 10,
right: 10,
bottom: 8,
height: 69,
borderRadius: 22,
backgroundColor: "#14141C",
flexDirection: "row",
justifyContent: "space-around",
alignItems: "center",
borderWidth: 1,
borderColor: "#24242E",
},
navItem: {
alignItems: "center",
justifyContent: "center",
flex: 1,
},
navIcon: {
fontSize: 19,
color: "#A0A0B0",
},
navLabel: {
color: "#A0A0B0",
fontSize: 10,
fontWeight: "800",
marginTop: 3,
},
navActive: {
color: "#FFFFFF",
},
listContent: {
padding: 18,
paddingBottom: 30,
},
pageTitle: {
color: "#FFFFFF",
fontSize: 28,
fontWeight: "900",
marginBottom: 18,
},
trendingRow: {
flexDirection: "row",
alignItems: "center",
backgroundColor: "#111119",
borderRadius: 18,
padding: 10,
marginBottom: 10,
},
rank: {
color: "#FFFFFF",
width: 32,
fontSize: 17,
fontWeight: "900",
textAlign: "center",
},
trendingImage: {
width: 70,
height: 78,
borderRadius: 13,
},
trendingContent: {
flex: 1,
paddingHorizontal: 11,
},
trendingTitle: {
color: "#FFFFFF",
fontSize: 15,
fontWeight: "900",
},
trendingGenre: {
color: "#FFFFFF",
fontSize: 11,
marginTop: 4,
fontWeight: "700",
},
trendingMeta: {
color: "#FFFFFF",
fontSize: 11,
marginTop: 6,
fontWeight: "700",
},
heart: {
color: "#FFFFFF",
fontSize: 24,
paddingHorizontal: 8,
},
libraryTop: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
marginBottom: 18,
},
smallAction: {
backgroundColor: "#15151D",
paddingHorizontal: 13,
paddingVertical: 9,
borderRadius: 12,
},
profileCard: {
alignItems: "center",
backgroundColor: "#111119",
borderRadius: 24,
padding: 22,
marginBottom: 20,
},
avatar: {
width: 82,
height: 82,
borderRadius: 41,
backgroundColor: "#22222D",
alignItems: "center",
justifyContent: "center",
marginBottom: 12,
},
avatarText: {
color: "#FFFFFF",
fontSize: 32,
fontWeight: "900",
},
profileName: {
color: "#FFFFFF",
fontSize: 23,
fontWeight: "900",
},
profileHandle: {
color: "#FFFFFF",
marginTop: 4,
fontWeight: "700",
},
stats: {
flexDirection: "row",
width: "100%",
justifyContent: "space-around",
marginTop: 22,
},
stat: {
alignItems: "center",
},
statValue: {
color: "#FFFFFF",
fontSize: 17,
fontWeight: "900",
},
statLabel: {
color: "#FFFFFF",
fontSize: 11,
marginTop: 4,
fontWeight: "700",
},
creatorGrid: {
flexDirection: "row",
flexWrap: "wrap",
gap: 10,
},
creatorTile: {
width: "31.5%",
backgroundColor: "#15151D",
borderRadius: 17,
padding: 14,
minHeight: 100,
justifyContent: "space-between",
},
tileIcon: {
fontSize: 23,
},
tileText: {
color: "#FFFFFF",
fontSize: 11,
fontWeight: "800",
},
settingsButton: {
backgroundColor: "#15151D",
padding: 18,
borderRadius: 16,
marginTop: 14,
},
settingsText: {
color: "#FFFFFF",
fontWeight: "800",
},
detailImage: {
width: "100%",
height: 350,
borderRadius: 23,
marginBottom: 18,
},
detailTitle: {
color: "#FFFFFF",
fontSize: 29,
fontWeight: "900",
},
detailCreator: {
color: "#FFFFFF",
marginTop: 6,
fontWeight: "700",
},
detailStats: {
color: "#FFFFFF",
marginTop: 8,
fontWeight: "700",
},
detailDescription: {
color: "#FFFFFF",
lineHeight: 22,
fontSize: 14,
marginTop: 17,
marginBottom: 17,
fontWeight: "600",
},
actionRow: {
flexDirection: "row",
flexWrap: "wrap",
gap: 8,
marginBottom: 20,
},
actionButton: {
backgroundColor: "#15151D",
borderRadius: 14,
paddingHorizontal: 12,
paddingVertical: 10,
alignItems: "center",
minWidth: 72,
},
actionButtonActive: {
backgroundColor: "#25252F",
},
actionIcon: {
color: "#FFFFFF",
fontSize: 17,
},
actionText: {
color: "#FFFFFF",
fontSize: 10,
marginTop: 3,
fontWeight: "800",
},
creatorBox: {
flexDirection: "row",
alignItems: "center",
backgroundColor: "#15151D",
borderRadius: 17,
padding: 13,
marginBottom: 12,
},
creatorAvatar: {
width: 45,
height: 45,
borderRadius: 23,
backgroundColor: "#25252F",
alignItems: "center",
justifyContent: "center",
},
creatorBoxContent: {
flex: 1,
paddingHorizontal: 10,
},
creatorName: {
color: "#FFFFFF",
fontWeight: "900",
},
creatorSub: {
color: "#FFFFFF",
fontSize: 11,
marginTop: 3,
fontWeight: "700",
},
followButton: {
backgroundColor: "#FFFFFF",
borderRadius: 12,
paddingHorizontal: 12,
paddingVertical: 9,
},
followButtonLarge: {
backgroundColor: "#FFFFFF",
borderRadius: 13,
paddingHorizontal: 25,
paddingVertical: 12,
marginTop: 15,
},
followButtonText: {
color: "#08080D",
fontWeight: "900",
},
downloadBox: {
flexDirection: "row",
alignItems: "center",
backgroundColor: "#15151D",
padding: 15,
borderRadius: 17,
marginBottom: 20,
},
downloadIcon: {
color: "#FFFFFF",
fontSize: 27,
marginRight: 12,
},
downloadTitle: {
color: "#FFFFFF",
fontWeight: "900",
},
downloadSub: {
color: "#FFFFFF",
fontSize: 11,
marginTop: 3,
fontWeight: "700",
},
episodeRow: {
flexDirection: "row",
alignItems: "center",
backgroundColor: "#111119",
borderRadius: 16,
padding: 11,
marginBottom: 8,
},
episodeNumber: {
width: 42,
height: 42,
borderRadius: 12,
backgroundColor: "#22222D",
alignItems: "center",
justifyContent: "center",
marginRight: 11,
},
episodeTitle: {
color: "#FFFFFF",
fontWeight: "900",
},
episodeSub: {
color: "#FFFFFF",
fontSize: 11,
marginTop: 4,
fontWeight: "700",
},
episodeIcon: {
fontSize: 20,
},
videoContainer: {
width: "100%",
height: 240,
backgroundColor: "#000000",
justifyContent: "center",
alignItems: "center",
},
videoPlayerView: {
width: "100%",
height: "100%",
},
audioScreen: {
padding: 18,
alignItems: "center",
paddingBottom: 40,
},
audioArtwork: {
width: width * 0.78,
height: width * 0.78,
borderRadius: 28,
marginTop: 15,
marginBottom: 23,
},
audioTitle: {
color: "#FFFFFF",
fontSize: 25,
fontWeight: "900",
textAlign: "center",
},
audioEpisode: {
color: "#FFFFFF",
marginTop: 6,
fontWeight: "700",
},
progressArea: {
width: "100%",
marginTop: 25,
},
progressTrack: {
height: 5,
borderRadius: 3,
backgroundColor: "#2A2A34",
overflow: "hidden",
},
progressFill: {
height: "100%",
backgroundColor: "#FFFFFF",
},
timeRow: {
flexDirection: "row",
justifyContent: "space-between",
marginTop: 7,
},
timeText: {
color: "#FFFFFF",
fontSize: 11,
fontWeight: "700",
},
playerControls: {
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
gap: 28,
marginTop: 24,
},
playerButton: {
width: 52,
height: 52,
borderRadius: 26,
backgroundColor: "#15151D",
alignItems: "center",
justifyContent: "center",
},
playerButtonText: {
color: "#FFFFFF",
fontWeight: "900",
},
playButton: {
width: 74,
height: 74,
borderRadius: 37,
backgroundColor: "#FFFFFF",
alignItems: "center",
justifyContent: "center",
},
playButtonText: {
color: "#08080D",
fontSize: 27,
fontWeight: "900",
},
playerSecondary: {
flexDirection: "row",
alignItems: "center",
gap: 8,
marginTop: 24,
},
optionButton: {
backgroundColor: "#15151D",
borderRadius: 12,
paddingHorizontal: 12,
paddingVertical: 10,
},
autoPlayOption: {
flexDirection: "row",
alignItems: "center",
backgroundColor: "#15151D",
borderRadius: 12,
paddingLeft: 12,
paddingVertical: 8,
},
nextControls: {
width: "100%",
flexDirection: "row",
justifyContent: "space-between",
marginTop: 25,
},
nextButton: {
backgroundColor: "#15151D",
paddingHorizontal: 18,
paddingVertical: 12,
borderRadius: 13,
},
commentRow: {
flexDirection: "row",
marginBottom: 20,
},
commentAvatar: {
width: 42,
height: 42,
borderRadius: 21,
backgroundColor: "#22222D",
alignItems: "center",
justifyContent: "center",
},
commentContent: {
flex: 1,
paddingLeft: 11,
},
commentUser: {
color: "#FFFFFF",
fontWeight: "900",
},
commentText: {
color: "#FFFFFF",
marginTop: 4,
lineHeight: 20,
fontWeight: "600",
},
commentLike: {
color: "#FFFFFF",
marginTop: 7,
fontSize: 12,
fontWeight: "800",
},
commentComposer: {
flexDirection: "row",
alignItems: "center",
backgroundColor: "#15151D",
padding: 8,
margin: 10,
borderRadius: 17,
},
commentInput: {
flex: 1,
color: "#FFFFFF",
paddingHorizontal: 10,
fontWeight: "600",
},
sendButton: {
width: 42,
height: 42,
borderRadius: 21,
backgroundColor: "#FFFFFF",
alignItems: "center",
justifyContent: "center",
},
creatorHero: {
backgroundColor: "#111119",
borderRadius: 25,
padding: 25,
alignItems: "center",
marginBottom: 15,
},
creatorBigAvatar: {
width: 88,
height: 88,
borderRadius: 44,
backgroundColor: "#25252F",
alignItems: "center",
justifyContent: "center",
marginBottom: 12,
},
creatorBigText: {
color: "#FFFFFF",
fontSize: 35,
fontWeight: "900",
},
creatorHeroTitle: {
color: "#FFFFFF",
fontSize: 23,
fontWeight: "900",
},
creatorHeroSub: {
color: "#FFFFFF",
textAlign: "center",
marginTop: 6,
fontWeight: "700",
},
analyticsGrid: {
flexDirection: "row",
flexWrap: "wrap",
gap: 9,
},
analyticsCard: {
width: "48.5%",
backgroundColor: "#15151D",
borderRadius: 16,
padding: 15,
},
analyticsValue: {
color: "#FFFFFF",
fontSize: 21,
fontWeight: "900",
},
analyticsLabel: {
color: "#FFFFFF",
marginTop: 5,
fontSize: 11,
fontWeight: "700",
},
liveButton: {
backgroundColor: "#24151A",
borderRadius: 15,
padding: 15,
marginTop: 12,
alignItems: "center",
},
liveButtonText: {
color: "#FFFFFF",
fontWeight: "900",
},
createLargeButton: {
backgroundColor: "#FFFFFF",
borderRadius: 16,
padding: 16,
alignItems: "center",
marginTop: 12,
},
createLargeText: {
color: "#08080D",
fontWeight: "900",
},
walletCard: {
backgroundColor: "#15151D",
borderRadius: 24,
padding: 24,
alignItems: "center",
marginBottom: 22,
},
walletLabel: {
color: "#FFFFFF",
fontWeight: "700",
},
walletCoins: {
color: "#FFFFFF",
fontSize: 34,
fontWeight: "900",
marginTop: 8,
},
walletSub: {
color: "#FFFFFF",
marginTop: 6,
fontWeight: "700",
},
coinPackage: {
backgroundColor: "#15151D",
borderRadius: 18,
padding: 16,
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
marginBottom: 10,
},
coinPackageCoins: {
color: "#FFFFFF",
fontSize: 16,
fontWeight: "900",
},
coinPackagePrice: {
color: "#FFFFFF",
marginTop: 5,
fontWeight: "700",
},
buyButton: {
backgroundColor: "#FFFFFF",
borderRadius: 12,
paddingHorizontal: 15,
paddingVertical: 10,
},
buyButtonText: {
color: "#08080D",
fontWeight: "900",
},
paymentNote: {
color: "#FFFFFF",
fontSize: 11,
textAlign: "center",
marginTop: 8,
fontWeight: "700",
},
rewardCard: {
backgroundColor: "#15151D",
borderRadius: 24,
padding: 25,
alignItems: "center",
marginBottom: 20,
},
rewardEmoji: {
fontSize: 45,
},
rewardTitle: {
color: "#FFFFFF",
fontSize: 23,
fontWeight: "900",
marginTop: 8,
},
rewardText: {
color: "#FFFFFF",
textAlign: "center",
marginVertical: 8,
fontWeight: "700",
},
disabledButton: {
opacity: 0.45,
},
streakRow: {
flexDirection: "row",
justifyContent: "space-between",
},
streakDay: {
width: 42,
height: 42,
borderRadius: 21,
backgroundColor: "#15151D",
alignItems: "center",
justifyContent: "center",
},
streakActive: {
backgroundColor: "#FFFFFF",
},
notificationRow: {
flexDirection: "row",
backgroundColor: "#15151D",
padding: 16,
borderRadius: 15,
marginBottom: 8,
alignItems: "center",
},
notificationDot: {
width: 9,
height: 9,
borderRadius: 5,
backgroundColor: "#FFFFFF",
marginRight: 12,
},
notificationText: {
color: "#FFFFFF",
flex: 1,
fontWeight: "700",
},
aiList: {
padding: 18,
paddingBottom: 20,
},
aiIntro: {
backgroundColor: "#15151D",
borderRadius: 20,
padding: 19,
marginBottom: 12,
},
aiIntroEmoji: {
fontSize: 30,
},
aiIntroTitle: {
color: "#FFFFFF",
fontSize: 22,
fontWeight: "900",
marginTop: 7,
},
aiIntroText: {
color: "#FFFFFF",
marginTop: 5,
fontWeight: "700",
},
promptChip: {
backgroundColor: "#15151D",
paddingHorizontal: 13,
paddingVertical: 10,
borderRadius: 14,
},
aiMessage: {
maxWidth: "86%",
padding: 14,
borderRadius: 18,
marginBottom: 10,
},
aiUser: {
alignSelf: "flex-end",
backgroundColor: "#FFFFFF",
},
aiAssistant: {
alignSelf: "flex-start",
backgroundColor: "#15151D",
},
aiName: {
color: "#FFFFFF",
fontSize: 10,
fontWeight: "900",
marginBottom: 5,
},
aiMessageText: {
color: "#FFFFFF",
lineHeight: 20,
fontWeight: "700",
},
aiError: {
backgroundColor: "#25171A",
borderRadius: 14,
padding: 12,
marginTop: 10,
},
aiErrorText: {
color: "#FFFFFF",
fontWeight: "700",
},
retryText: {
color: "#FFFFFF",
fontWeight: "900",
marginTop: 7,
},
aiComposer: {
flexDirection: "row",
alignItems: "flex-end",
backgroundColor: "#15151D",
padding: 8,
margin: 9,
borderRadius: 18,
},
aiInput: {
flex: 1,
color: "#FFFFFF",
maxHeight: 100,
paddingHorizontal: 10,
paddingVertical: 9,
fontWeight: "600",
},
aiSend: {
width: 43,
height: 43,
borderRadius: 22,
backgroundColor: "#FFFFFF",
alignItems: "center",
justifyContent: "center",
},
aiSendText: {
color: "#08080D",
fontSize: 18,
fontWeight: "900",
},
communityPost: {
backgroundColor: "#15151D",
borderRadius: 17,
padding: 16,
marginBottom: 9,
},
communityUser: {
color: "#FFFFFF",
fontWeight: "900",
},
communityText: {
color: "#FFFFFF",
marginTop: 7,
fontWeight: "700",
},
creatorExplore: {
flexDirection: "row",
alignItems: "center",
backgroundColor: "#15151D",
borderRadius: 17,
padding: 12,
marginBottom: 8,
},
settingsInput: {
backgroundColor: "#15151D",
color: "#FFFFFF",
borderRadius: 15,
padding: 15,
marginBottom: 10,
fontWeight: "600",
},
settingRow: {
backgroundColor: "#15151D",
borderRadius: 15,
padding: 16,
marginBottom: 8,
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
},
settingTitle: {
color: "#FFFFFF",
fontWeight: "800",
},
settingValue: {
color: "#FFFFFF",
fontWeight: "700",
},
premiumCard: {
backgroundColor: "#15151D",
borderRadius: 25,
padding: 25,
},
premiumCrown: {
fontSize: 45,
},
premiumTitle: {
color: "#FFFFFF",
fontSize: 27,
fontWeight: "900",
marginTop: 8,
},
premiumText: {
color: "#FFFFFF",
marginVertical: 10,
fontWeight: "700",
},
premiumFeature: {
color: "#FFFFFF",
marginBottom: 11,
fontWeight: "700",
},
formInput: {
backgroundColor: "#15151D",
color: "#FFFFFF",
borderRadius: 15,
padding: 15,
marginBottom: 10,
fontWeight: "600",
},
textArea: {
height: 130,
textAlignVertical: "top",
},
formLabel: {
color: "#FFFFFF",
fontWeight: "900",
marginVertical: 8,
},
genreRow: {
flexDirection: "row",
flexWrap: "wrap",
gap: 8,
},
genreChip: {
backgroundColor: "#15151D",
borderRadius: 13,
paddingHorizontal: 13,
paddingVertical: 10,
},
genreChipActive: {
backgroundColor: "#FFFFFF",
},
emptyState: {
backgroundColor: "#111119",
borderRadius: 17,
padding: 25,
alignItems: "center",
marginBottom: 15,
},
emptyText: {
color: "#FFFFFF",
textAlign: "center",
fontWeight: "700",
},
});
