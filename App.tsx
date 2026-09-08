import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Video, ResizeMode } from "expo-av";

/* ============================================================
   POCKET RIVALS 2.0
   ============================================================ */

const API_BASE = "http://16.170.245.45:3000";

const STORAGE = {
  USER: "@pocket_rivals_user_v2",
  TOKEN: "@pocket_rivals_token_v2",
  LIKES: "@pocket_rivals_likes_v2",
  FOLLOWS: "@pocket_rivals_follows_v2",
  SAVED: "@pocket_rivals_saved_v2",
  COINS: "@pocket_rivals_coins_v2",
};

/* ============================================================
   TYPES
   ============================================================ */

type User = {
  id: string;
  username: string;
  name?: string;
  avatar?: string | null;
  bio?: string;
  followers?: number;
  following?: number;
  videos?: number;
  verified?: boolean;
};

type VideoItem = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  videoUrl?: string;
  coverUrl?: string | null;
  thumbnail?: string | null;
  views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
  creatorId?: string;
  creator?: User;
  creatorName?: string;
  creatorAvatar?: string;
  featured?: boolean;
  published?: boolean;
  access?: string;
  coinPrice?: number;
  createdAt?: string;
};

type CreatorChallenge = {
  id: string;
  title: string;
  description: string;
  category: string;
  prizePool: number;
  maxWinners: number;
  startsAt: string;
  endsAt: string;
  status: string;
  entries: number;
  createdAt?: string;
};

type CreatorWallet = {
  userId: string;
  available: number;
  pending: number;
  lifetimeEarned: number;
  lifetimePaid: number;
  xp: number;
  level: string;
  updatedAt?: string;
};

type CreatorLeaderboardItem = {
  userId: string;
  username?: string;
  name?: string;
  avatar?: string | null;
  xp?: number;
  level?: string;
  lifetimeEarned?: number;
  rank?: number;
};

type CreatorPayout = {
  id: string;
  userId: string;
  amount: number;
  method: string;
  destination: string;
  status: string;
  createdAt?: string;
};

type CreatorPaymentMethod = {
  id: string;
  userId: string;
  method: "ecocash" | "bank" | "paypal" | "onemoney" | "other";
  destination: string;
  accountName?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type CreatorSubmission = {
  id: string;
  challengeId: string;
  userId: string;
  videoId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  title?: string;
  description?: string;
  status: string;
  moderationNote?: string;
  score?: number;
  submittedAt?: string;
  moderatedAt?: string;
  winner?: boolean;
  awardedAmount?: number;
  awardedAt?: string;
};

type Comment = {
  id: string;
  userId?: string;
  username?: string;
  avatar?: string;
  text: string;
  likes?: number;
  liked?: boolean;
  createdAt?: string;
};

type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  read?: boolean;
};

type Conversation = {
  user: User;
  lastMessage?: Message;
};

type Screen =
  | "home"
  | "discover"
  | "messages"
  | "rewards"
  | "profile"
  | "video"
  | "userProfile"
  | "creatorHub";

type Tab =
  | "home"
  | "discover"
  | "messages"
  | "rewards"
  | "profile";

/* ============================================================
   HELPERS
   ============================================================ */

function absoluteUrl(value?: string | null) {
  if (!value) return undefined;

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return `${API_BASE}${value.startsWith("/") ? "" : "/"}${value}`;
}

function makeId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

function formatNumber(value = 0) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(value);
}

function timeAgo(date?: string) {
  if (!date) return "";

  const seconds =
    (Date.now() - new Date(date).getTime()) / 1000;

  if (seconds < 60) return "now";
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800)
    return `${Math.floor(seconds / 86400)}d`;

  return new Date(date).toLocaleDateString();
}

/* ============================================================
   API
   ============================================================ */

async function api(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Request failed (${response.status})`
    );
  }

  return data;
}

/* ============================================================
   FALLBACK USER
   ============================================================ */

const DEFAULT_USER: User = {
  id: "local-user",
  username: "pocketplayer",
  name: "Pocket Player",
  avatar: null,
  bio: "Welcome to Pocket Rivals.",
  followers: 0,
  following: 0,
  videos: 0,
};

/* ============================================================
   MAIN APP
   ============================================================ */

export default function App() {
  const [screen, setScreen] =
    useState<Screen>("home");

  const [tab, setTab] =
    useState<Tab>("home");

  const [user, setUser] =
    useState<User>(DEFAULT_USER);

  const [token, setToken] =
    useState<string | null>(null);

  const [videos, setVideos] =
    useState<VideoItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [selectedVideo, setSelectedVideo] =
    useState<VideoItem | null>(null);

  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);

  const [search, setSearch] =
    useState("");

  const [coins, setCoins] =
    useState(0);

  const [likedVideos, setLikedVideos] =
    useState<Record<string, boolean>>({});

  const [savedVideos, setSavedVideos] =
    useState<Record<string, boolean>>({});

  const [following, setFollowing] =
    useState<Record<string, boolean>>({});

  const [comments, setComments] =
    useState<Comment[]>([]);

  const [commentText, setCommentText] =
    useState("");

  const [showComments, setShowComments] =
    useState(false);

  const [showCoinStore, setShowCoinStore] =
    useState(false);

  const [chatUser, setChatUser] =
    useState<User | null>(null);

  const [showLogin, setShowLogin] =
    useState(false);

  const [creatorChallenges, setCreatorChallenges] =
    useState<CreatorChallenge[]>([]);
  const [creatorWallet, setCreatorWallet] =
    useState<CreatorWallet | null>(null);
  const [creatorLeaderboard, setCreatorLeaderboard] =
    useState<CreatorLeaderboardItem[]>([]);
  const [creatorSubmissions, setCreatorSubmissions] =
    useState<CreatorSubmission[]>([]);
  const [creatorPayouts, setCreatorPayouts] =
    useState<CreatorPayout[]>([]);
  const [creatorPaymentMethods, setCreatorPaymentMethods] =
    useState<CreatorPaymentMethod[]>([]);


  /* ----------------------------------------------------------
     LOAD LOCAL STATE
     ---------------------------------------------------------- */

  useEffect(() => {
    (async () => {
      try {
        const [
          savedUser,
          savedToken,
          savedLikes,
          savedFollows,
          savedSaved,
          savedCoins,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE.USER),
          AsyncStorage.getItem(STORAGE.TOKEN),
          AsyncStorage.getItem(STORAGE.LIKES),
          AsyncStorage.getItem(STORAGE.FOLLOWS),
          AsyncStorage.getItem(STORAGE.SAVED),
          AsyncStorage.getItem(STORAGE.COINS),
        ]);

        if (savedUser)
          setUser(JSON.parse(savedUser));

        if (savedToken)
          setToken(savedToken);

        if (savedLikes)
          setLikedVideos(JSON.parse(savedLikes));

        if (savedFollows)
          setFollowing(JSON.parse(savedFollows));

        if (savedSaved)
          setSavedVideos(JSON.parse(savedSaved));

        if (savedCoins)
          setCoins(Number(savedCoins));
      } catch (error) {
        console.log("Local state error:", error);
      }
    })();
  }, []);

  /* ----------------------------------------------------------
     SAVE STATE
     ---------------------------------------------------------- */

  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE.USER,
      JSON.stringify(user)
    );
  }, [user]);

  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE.LIKES,
      JSON.stringify(likedVideos)
    );
  }, [likedVideos]);

  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE.FOLLOWS,
      JSON.stringify(following)
    );
  }, [following]);

  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE.SAVED,
      JSON.stringify(savedVideos)
    );
  }, [savedVideos]);

  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE.COINS,
      String(coins)
    );
  }, [coins]);

  /* ----------------------------------------------------------
     LOAD VIDEOS
     ---------------------------------------------------------- */

  const loadVideos = useCallback(async () => {
    try {
      const data = await api("/api/videos");

      if (Array.isArray(data?.videos)) {
        setVideos(data.videos);
      }
    } catch (error) {
      console.log("Video API:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const creatorVideos = useMemo(
    () =>
      videos.filter(video => {
        const ownerId =
          video.creatorId ||
          video.creator?.id;

        return ownerId === user.id;
      }),
    [videos, user.id]
  );

  const loadCreatorData = useCallback(async () => {
    try {
      const challengesData = await api(
        "/api/creator/challenges"
      );

      setCreatorChallenges(
        Array.isArray(challengesData?.challenges)
          ? challengesData.challenges
          : []
      );

      if (token) {
        const [
          walletData,
          leaderboardData,
          submissionsData,
          payoutsData,
          paymentMethodsData,
        ] = await Promise.all([
          api("/api/creator/wallet", {}, token),
          api("/api/creator/leaderboard", {}, token),
          api("/api/creator/submissions", {}, token),
          api("/api/creator/payouts", {}, token),
          api("/api/creator/payment-methods", {}, token),
        ]);

        setCreatorWallet(walletData?.wallet || null);

        setCreatorLeaderboard(
          Array.isArray(leaderboardData?.leaderboard)
            ? leaderboardData.leaderboard
            : []
        );

        setCreatorSubmissions(
          Array.isArray(submissionsData?.submissions)
            ? submissionsData.submissions
            : []
        );

        setCreatorPayouts(Array.isArray(payoutsData?.payouts) ? payoutsData.payouts : []);

        setCreatorPaymentMethods(
          Array.isArray(paymentMethodsData?.paymentMethods)
            ? paymentMethodsData.paymentMethods
            : []
        );
      }
    } catch (error) {
      console.log("Creator API:", error);
    }
  }, [token]);

  useEffect(() => {
    loadCreatorData();
  }, [loadCreatorData]);

  const refresh = () => {
    setRefreshing(true);
    loadVideos();
  };

  /* ==========================================================
     NAVIGATION
     ========================================================== */

  function navigate(next: Screen, nextTab?: Tab) {
    setScreen(next);

    if (nextTab) {
      setTab(nextTab);
    }
  }

  function openVideo(video: VideoItem) {
    setSelectedVideo(video);
    navigate("video");
  }

  function openProfile(profile: User) {
    setSelectedUser(profile);
    navigate("userProfile");
  }

  /* ==========================================================
     LIKE
     ========================================================== */

  async function toggleLike(video: VideoItem) {
    const alreadyLiked = !!likedVideos[video.id];

    setLikedVideos(prev => ({
      ...prev,
      [video.id]: !alreadyLiked,
    }));

    setVideos(prev =>
      prev.map(item =>
        item.id === video.id
          ? {
              ...item,
              likes:
                Number(item.likes || 0) +
                (alreadyLiked ? -1 : 1),
            }
          : item
      )
    );

    try {
      await api(
        `/api/videos/${encodeURIComponent(
          video.id
        )}/like`,
        {
          method: "POST",
        },
        token
      );
    } catch (error) {
      console.log("Like API:", error);
    }
  }

  /* ==========================================================
     SAVE
     ========================================================== */

  function toggleSave(video: VideoItem) {
    setSavedVideos(prev => ({
      ...prev,
      [video.id]: !prev[video.id],
    }));
  }

  /* ==========================================================
     SHARE
     ========================================================== */

  async function shareVideo(video: VideoItem) {
    try {
      await Share.share({
        title: video.title,
        message:
          `Watch "${video.title}" on Pocket Rivals

` +
          `${absoluteUrl(video.videoUrl) || API_BASE}`,
      });

      try {
        await api(
          `/api/videos/${encodeURIComponent(
            video.id
          )}/share`,
          {
            method: "POST",
          },
          token
        );
      } catch {}
    } catch {}
  }

  /* ==========================================================
     COMMENTS
     ========================================================== */

  async function loadComments(videoId: string) {
    try {
      const data = await api(
        `/api/videos/${encodeURIComponent(
          videoId
        )}/comments`,
        {},
        token
      );

      setComments(
        Array.isArray(data?.comments)
          ? data.comments
          : []
      );
    } catch {
      setComments([]);
    }

    setShowComments(true);
  }

  async function postComment() {
    if (!selectedVideo || !commentText.trim()) {
      return;
    }

    const text = commentText.trim();

    const optimistic: Comment = {
      id: makeId(),
      userId: user.id,
      username: user.username,
      avatar: user.avatar || undefined,
      text,
      likes: 0,
      liked: false,
      createdAt: new Date().toISOString(),
    };

    setComments(prev => [optimistic, ...prev]);
    setCommentText("");

    try {
      const data = await api(
        `/api/videos/${encodeURIComponent(
          selectedVideo.id
        )}/comments`,
        {
          method: "POST",
          body: JSON.stringify({
            text,
          }),
        },
        token
      );

      if (data?.comment) {
        setComments(prev =>
          prev.map(item =>
            item.id === optimistic.id
              ? data.comment
              : item
          )
        );
      }
    } catch (error) {
      console.log("Comment API:", error);
    }
  }

  async function likeComment(comment: Comment) {
    setComments(prev =>
      prev.map(item =>
        item.id === comment.id
          ? {
              ...item,
              liked: !item.liked,
              likes:
                Number(item.likes || 0) +
                (item.liked ? -1 : 1),
            }
          : item
      )
    );

    try {
      await api(
        `/api/comments/${encodeURIComponent(
          comment.id
        )}/like`,
        {
          method: "POST",
        },
        token
      );
    } catch {}
  }

  /* ==========================================================
     FOLLOW
     ========================================================== */

  async function toggleFollow(profile: User) {
    if (profile.id === user.id) {
      return;
    }

    const isFollowing =
      !!following[profile.id];

    setFollowing(prev => ({
      ...prev,
      [profile.id]: !isFollowing,
    }));

    setSelectedUser(prev =>
      prev
        ? {
            ...prev,
            followers:
              Number(prev.followers || 0) +
              (isFollowing ? -1 : 1),
          }
        : prev
    );

    try {
      if (isFollowing) {
        await api(
          `/api/users/${encodeURIComponent(
            profile.id
          )}/follow`,
          {
            method: "DELETE",
          },
          token
        );
      } else {
        await api(
          `/api/users/${encodeURIComponent(
            profile.id
          )}/follow`,
          {
            method: "POST",
          },
          token
        );
      }
    } catch (error) {
      console.log("Follow API:", error);
    }
  }

  /* ==========================================================
     OPEN MESSAGE
     ========================================================== */

  function messageUser(profile: User) {
    if (profile.id === user.id) {
      return;
    }

    setChatUser(profile);
    navigate("messages");
  }

  /* ==========================================================
     FILTER
     ========================================================== */

  const filteredVideos = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return videos;

    return videos.filter(video => {
      const text = [
        video.title,
        video.description,
        video.category,
        video.creatorName,
        video.creator?.username,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [videos, search]);

  /* ==========================================================
     RENDER
     ========================================================== */

  if (screen === "video" && selectedVideo) {
    return (
      <VideoPlayerScreen
        video={selectedVideo}
        liked={!!likedVideos[selectedVideo.id]}
        saved={!!savedVideos[selectedVideo.id]}
        onBack={() => navigate("home")}
        onLike={() => toggleLike(selectedVideo)}
        onSave={() => toggleSave(selectedVideo)}
        onShare={() => shareVideo(selectedVideo)}
        onComments={() =>
          loadComments(selectedVideo.id)
        }
        onCreator={() => {
          if (selectedVideo.creator) {
            openProfile(selectedVideo.creator);
          }
        }}
      />
    );
  }

  if (screen === "creatorHub") {
    return (
      <CreatorHubScreen
        user={user}
        token={token}
        challenges={creatorChallenges}
        wallet={creatorWallet}
        leaderboard={creatorLeaderboard}
        submissions={creatorSubmissions}
        payouts={creatorPayouts}
        paymentMethods={creatorPaymentMethods}
        myVideos={creatorVideos}
        onBack={() => navigate("home")}
        onRefresh={loadCreatorData}
      />
    );
  }

  if (
    screen === "userProfile" &&
    selectedUser
  ) {
    return (
      <UserProfileScreen
        profile={selectedUser}
        currentUser={user}
        following={
          !!following[selectedUser.id]
        }
        videos={videos.filter(
          item =>
            item.creatorId === selectedUser.id ||
            item.creator?.id === selectedUser.id
        )}
        onBack={() => navigate("home")}
        onFollow={() =>
          toggleFollow(selectedUser)
        }
        onMessage={() =>
          messageUser(selectedUser)
        }
        onVideo={openVideo}
        onEdit={() => {}}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#070709"
      />

      {screen === "home" && (
        <HomeScreen
          user={user}
          videos={filteredVideos}
          search={search}
          setSearch={setSearch}
          loading={loading}
          refreshing={refreshing}
          onRefresh={refresh}
          onVideo={openVideo}
          onProfile={openProfile}
          onLike={toggleLike}
          likedVideos={likedVideos}
          onShare={shareVideo}
          onSave={toggleSave}
          savedVideos={savedVideos}
        />
      )}

      {screen === "discover" && (
        <DiscoverScreen
          videos={filteredVideos}
          search={search}
          setSearch={setSearch}
          onVideo={openVideo}
          onProfile={openProfile}
        />
      )}

      {screen === "messages" && (
        <MessagesScreen
          currentUser={user}
          token={token}
          initialUser={chatUser}
          onUser={setChatUser}
          onBack={() => navigate("home")}
        />
      )}

      {screen === "rewards" && (
        <RewardsScreen
          coins={coins}
          setCoins={setCoins}
          onStore={() =>
            setShowCoinStore(true)
          }
        />
      )}

      {screen === "profile" && (
        <OwnProfileScreen
          user={user}
          videos={videos.filter(
            item =>
              item.creatorId === user.id ||
              item.creator?.id === user.id
          )}
          coins={coins}
          onVideo={openVideo}
          onEdit={() => {
            Alert.alert(
              "Profile",
              "Profile editing can be connected to your user API."
            );
          }}
          onCreatorHub={() => navigate("creatorHub")}
        />
      )}

      <BottomNavigation
        active={tab}
        onChange={next => {
          setTab(next);

          if (next === "home")
            navigate("home", "home");

          if (next === "discover")
            navigate("discover", "discover");

          if (next === "messages")
            navigate("messages", "messages");

          if (next === "rewards")
            navigate("rewards", "rewards");

          if (next === "profile")
            navigate("profile", "profile");
        }}
      />

      <CommentsModal
        visible={showComments}
        comments={comments}
        text={commentText}
        setText={setCommentText}
        onClose={() => setShowComments(false)}
        onSend={postComment}
        onLike={likeComment}
      />

      <CoinStoreModal
        visible={showCoinStore}
        onClose={() => setShowCoinStore(false)}
        onBuy={(amount: number) => {
          setCoins(prev => prev + amount);
          setShowCoinStore(false);
        }}
      />

      <LoginModal
        visible={showLogin}
        onClose={() => setShowLogin(false)}
        onLogin={async (username: string) => {
          const newUser: User = {
            ...user,
            id: user.id || makeId(),
            username,
            name: username,
          };

          setUser(newUser);
          setShowLogin(false);
        }}
      />
    </SafeAreaView>
  );
}

/* ============================================================
   HOME
   ============================================================ */


function CreatorHubScreen({
  user,
  token,
  challenges,
  wallet,
  leaderboard,
  submissions,
  payouts,
  paymentMethods,
  myVideos,
  onBack,
  onRefresh,
}: {
  user: User;
  token: string | null;
  challenges: CreatorChallenge[];
  wallet: CreatorWallet | null;
  leaderboard: CreatorLeaderboardItem[];
  submissions: CreatorSubmission[];
  payouts: CreatorPayout[];
  paymentMethods: CreatorPaymentMethod[];
  myVideos: VideoItem[];
  onBack: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<CreatorPaymentMethod["method"]>("ecocash");
  const [paymentDestination, setPaymentDestination] = useState("");
  const [paymentAccountName, setPaymentAccountName] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
const [payoutModalVisible, setPayoutModalVisible] = useState(false);
const [payoutAmount, setPayoutAmount] = useState("");
const [selectedPayoutMethodId, setSelectedPayoutMethodId] = useState("");
const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  async function savePaymentMethod() {
    if (!token) {
      Alert.alert("Sign in required", "Please sign in before adding a payment method.");
      return;
    }

    if (!paymentDestination.trim()) {
      Alert.alert("Missing destination", "Enter the payout destination.");
      return;
    }

    try {
      setPaymentSaving(true);
      await api(
        "/api/creator/payment-methods",
        {
          method: "POST",
          body: JSON.stringify({
            method: paymentMethod,
            destination: paymentDestination.trim(),
            accountName: paymentAccountName.trim(),
          }),
        },
        token
      );

      setPaymentDestination("");
      setPaymentAccountName("");
      setPaymentModalVisible(false);
      await onRefresh();

      Alert.alert("Payment method saved", "Your payout destination has been saved.");
    } catch (error) {
      Alert.alert(
        "Could not save payment method",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setPaymentSaving(false);
    }
  }

  async function setDefaultPaymentMethod(id: string) {
    if (!token) return;

    try {
      await api(
        "/api/creator/payment-methods/" + id + "/default",
        { method: "PATCH" },
        token
      );
      await onRefresh();
    } catch (error) {
      Alert.alert(
        "Could not update default",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  }

  async function requestCreatorPayout() {
  if (!token) {
    Alert.alert("Sign in required", "Please sign in before requesting a payout.");
    return;
  }

  const amount = Number(payoutAmount);
  const selectedMethod = paymentMethods.find(
    method => method.id === selectedPayoutMethodId
  );

  if (!Number.isFinite(amount) || amount <= 0) {
    Alert.alert("Invalid amount", "Enter a valid payout amount.");
    return;
  }

  if (amount > Number(wallet?.available || 0)) {
    Alert.alert(
      "Insufficient balance",
      "Your payout amount cannot exceed your available balance."
    );
    return;
  }

  if (!selectedMethod) {
    Alert.alert(
      "Payment method required",
      "Select where you want your earnings sent."
    );
    return;
  }

  try {
    setPayoutSubmitting(true);

    await api(
      "/api/creator/payouts/request",
      {
        method: "POST",
        body: JSON.stringify({
          amount,
          paymentMethodId: selectedMethod.id,
        }),
      },
      token
    );

    setPayoutAmount("");
    setPayoutModalVisible(false);
    setSelectedPayoutMethodId("");
    await onRefresh();

    Alert.alert(
      "Payout submitted",
      "Your payout request has been submitted for review."
    );
  } catch (error) {
    Alert.alert(
      "Payout failed",
      error instanceof Error ? error.message : "Please try again."
    );
  } finally {
    setPayoutSubmitting(false);
  }
}

async function deletePaymentMethod(id: string) {
    if (!token) return;

    Alert.alert(
      "Remove payment method?",
      "This payout destination will be removed from your creator account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await api(
                "/api/creator/payment-methods/" + id,
                { method: "DELETE" },
                token
              );
              await onRefresh();
            } catch (error) {
              Alert.alert(
                "Could not remove payment method",
                error instanceof Error ? error.message : "Please try again."
              );
            }
          },
        },
      ]
    );
  }


  const [selectedChallenge, setSelectedChallenge] = useState<CreatorChallenge | null>(null);

  const [, setCountdownTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownTick(value => value + 1);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const [showSubmit, setShowSubmit] = useState(false);
  const [selectedSubmitVideo, setSelectedSubmitVideo] = useState<VideoItem | null>(null);
  const [submitDescription, setSubmitDescription] = useState("");
  const [submittingVideo, setSubmittingVideo] = useState(false);
  const [submissionChallenge, setSubmissionChallenge] = useState<CreatorChallenge | null>(null);

  const joinChallenge = async (challenge: CreatorChallenge) => {
    if (!token) {
      Alert.alert(
        "Creator account required",
        "Log in before joining a creator challenge."
      );
      return;
    }

    try {
      await api(
        `/api/creator/challenges/${encodeURIComponent(challenge.id)}/join`,
        { method: "POST" },
        token
      );

      setSubmissionChallenge(challenge);
      setSelectedSubmitVideo(null);
      setSubmitDescription("");
      setShowSubmit(true);
    } catch (error: any) {
      const message = error?.message || "";

      if (
        /already joined|already entered|already participating/i.test(
          message
        )
      ) {
        setSubmissionChallenge(challenge);
        setSelectedSubmitVideo(null);
        setSubmitDescription("");
        setShowSubmit(true);
        return;
      }

      Alert.alert(
        "Unable to join",
        message || "Could not join this challenge right now."
      );
    }
  };

  const submitChallengeVideo = async (
    challenge: CreatorChallenge
  ) => {
    if (!token) {
      Alert.alert(
        "Creator account required",
        "Log in before submitting a challenge video."
      );
      return;
    }

    if (!selectedSubmitVideo) {
      Alert.alert(
        "Choose a video",
        "Select one of your Pocket Rivals videos first."
      );
      return;
    }

    const videoUrl = selectedSubmitVideo.videoUrl || "";

    if (!selectedSubmitVideo.id || !videoUrl) {
      Alert.alert(
        "Video unavailable",
        "This video does not have a valid server video URL."
      );
      return;
    }

    try {
      setSubmittingVideo(true);

      const result = await api(
        `/api/creator/challenges/${encodeURIComponent(challenge.id)}/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            video: {
              id: selectedSubmitVideo.id,
              title:
                selectedSubmitVideo.title ||
                "Pocket Rivals Creator Video",
              videoUrl,
              thumbnailUrl:
                selectedSubmitVideo.thumbnail ||
                selectedSubmitVideo.coverUrl ||
                null,
            },
            title:
              selectedSubmitVideo.title ||
              "Pocket Rivals Creator Video",
            description: submitDescription.trim(),
          }),
        },
        token
      );

      Alert.alert(
        "🚀 Submitted!",
        result?.message ||
          "Your video has been submitted and is now waiting for moderation."
      );

      setSelectedSubmitVideo(null);
      setSubmitDescription("");
      setShowSubmit(false);
      setSubmissionChallenge(null);

      await onRefresh();
    } catch (error: any) {
      Alert.alert(
        "Submission failed",
        error?.message ||
          "Unable to submit this video right now."
      );
    } finally {
      setSubmittingVideo(false);
    }
  };

  const creatorAnalytics = useMemo(() => {
    const totalViews = myVideos.reduce(
      (sum, video) => sum + Number(video.views || 0),
      0
    );

    const totalLikes = myVideos.reduce(
      (sum, video) => sum + Number(video.likes || 0),
      0
    );

    const totalComments = myVideos.reduce(
      (sum, video) => sum + Number(video.comments || 0),
      0
    );

    const totalShares = myVideos.reduce(
      (sum, video) => sum + Number(video.shares || 0),
      0
    );

    const engagementRate =
      totalViews > 0
        ? ((totalLikes + totalComments + totalShares) /
            totalViews) *
          100
        : 0;

    const bestVideo = [...myVideos].sort(
      (a, b) =>
        Number(b.views || 0) -
        Number(a.views || 0)
    )[0] || null;

    return {
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      engagementRate,
      bestVideo,
    };
  }, [myVideos]);

  const refresh = async () => {
    setLoading(true);
    try {
      await onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const getChallengeTimeLeft = (endsAt: string) => {
    const diff = new Date(endsAt).getTime() - Date.now();

    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;

    return `${minutes}m left`;
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <Text style={styles.topTitle}>Creator Hub</Text>

        <Pressable
          onPress={refresh}
          style={styles.refreshButton}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.refreshText}>↻</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.creatorHubContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.creatorHero}>
          <Text style={styles.creatorHeroEmoji}>🔥</Text>

          <View style={{ flex: 1 }}>
            <Text style={styles.creatorHeroTitle}>
              Creator Hub
            </Text>

            <Text style={styles.creatorHeroText}>
              Turn your Pocket Rivals videos into challenges,
              XP and creator rewards.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Creator Dashboard
        </Text>

        <View style={styles.creatorStatsGrid}>
          <View style={styles.creatorStatCard}>
            <Text style={styles.creatorStatValue}>
              ${Number(wallet?.available || 0).toFixed(2)}
            </Text>
            <Text style={styles.creatorStatLabel}>
              Available
            </Text>
          </View>

          <View style={styles.creatorStatCard}>
            <Text style={styles.creatorStatValue}>
              {Number(wallet?.xp || 0)}
            </Text>
            <Text style={styles.creatorStatLabel}>
              XP
            </Text>
          </View>

          <View style={styles.creatorStatCard}>
            <Text style={styles.creatorStatValue}>
              {wallet?.level || "Rookie"}
            </Text>
            <Text style={styles.creatorStatLabel}>
              Level
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Creator Analytics
        </Text>

        <View style={styles.creatorAnalyticsCard}>
          <View style={styles.creatorAnalyticsGrid}>
            <View style={styles.creatorMetric}>
              <Text style={styles.creatorMetricIcon}>👁️</Text>
              <Text style={styles.creatorMetricValue}>
                {creatorAnalytics.totalViews.toLocaleString()}
              </Text>
              <Text style={styles.creatorMetricLabel}>
                Views
              </Text>
            </View>

            <View style={styles.creatorMetric}>
              <Text style={styles.creatorMetricIcon}>❤️</Text>
              <Text style={styles.creatorMetricValue}>
                {creatorAnalytics.totalLikes.toLocaleString()}
              </Text>
              <Text style={styles.creatorMetricLabel}>
                Likes
              </Text>
            </View>

            <View style={styles.creatorMetric}>
              <Text style={styles.creatorMetricIcon}>💬</Text>
              <Text style={styles.creatorMetricValue}>
                {creatorAnalytics.totalComments.toLocaleString()}
              </Text>
              <Text style={styles.creatorMetricLabel}>
                Comments
              </Text>
            </View>

            <View style={styles.creatorMetric}>
              <Text style={styles.creatorMetricIcon}>🔄</Text>
              <Text style={styles.creatorMetricValue}>
                {creatorAnalytics.totalShares.toLocaleString()}
              </Text>
              <Text style={styles.creatorMetricLabel}>
                Shares
              </Text>
            </View>
          </View>

          <View style={styles.creatorEngagementCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.creatorEngagementLabel}>
                ENGAGEMENT RATE
              </Text>

              <Text style={styles.creatorEngagementValue}>
                {creatorAnalytics.engagementRate.toFixed(2)}%
              </Text>
            </View>

            <Text style={styles.creatorEngagementIcon}>
              📈
            </Text>
          </View>

          {creatorAnalytics.bestVideo ? (
            <View style={styles.creatorBestVideo}>
              <Text style={styles.creatorBestLabel}>
                🏆 TOP PERFORMING VIDEO
              </Text>

              <Text
                style={styles.creatorBestTitle}
                numberOfLines={1}
              >
                {creatorAnalytics.bestVideo.title}
              </Text>

              <Text style={styles.creatorBestViews}>
                {Number(
                  creatorAnalytics.bestVideo.views || 0
                ).toLocaleString()}{" "}
                views
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>
          Creator Progress
        </Text>

        <View style={styles.creatorXpCard}>
          <View style={styles.creatorXpHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.creatorXpLabel}>
                CREATOR LEVEL
              </Text>

              <Text style={styles.creatorXpLevel}>
                {wallet?.level || "Rookie"}
              </Text>
            </View>

            <View style={styles.creatorXpBadge}>
              <Text style={styles.creatorXpBadgeText}>
                ⭐ {Number(wallet?.xp || 0)} XP
              </Text>
            </View>
          </View>

          <View style={styles.creatorXpTrack}>
            <View
              style={[
                styles.creatorXpFill,
                {
                  width: `${Math.min(
                    100,
                    (Number(wallet?.xp || 0) % 1000) / 10
                  )}%`,
                },
              ]}
            />
          </View>

          <View style={styles.creatorXpFooter}>
            <Text style={styles.creatorXpFooterText}>
              {Number(wallet?.xp || 0) % 1000} / 1000 XP
            </Text>

            <Text style={styles.creatorXpFooterText}>
              {1000 - (Number(wallet?.xp || 0) % 1000)} XP to next level
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Wallet & Earnings
        </Text>

        <View style={styles.creatorWalletCard}>
  <View style={styles.creatorWalletMain}>
    <Text style={styles.creatorWalletLabel}>
      AVAILABLE BALANCE
    </Text>

    <Text style={styles.creatorWalletAmount}>
      ${Number(wallet?.available || 0).toFixed(2)}
    </Text>

    <Text style={styles.creatorWalletHint}>
      Ready for eligible creator payouts
    </Text>
  </View>

  <View style={styles.creatorWalletActions}>
    <View style={styles.creatorWalletPending}>
      <Text style={styles.creatorWalletPendingLabel}>PENDING</Text>
      <Text style={styles.creatorWalletPendingAmount}>
        ${Number(wallet?.pending || 0).toFixed(2)}
      </Text>
    </View>

    <Pressable
      disabled={
        Number(wallet?.available || 0) <= 0 ||
        paymentMethods.length === 0
      }
      onPress={() => {
        const defaultMethod =
          paymentMethods.find(method => method.isDefault) ||
          paymentMethods[0];

        setSelectedPayoutMethodId(defaultMethod?.id || "");
        setPayoutAmount("");
        setPayoutModalVisible(true);
      }}
      style={[
        styles.creatorPayoutButton,
        (Number(wallet?.available || 0) <= 0 ||
          paymentMethods.length === 0) &&
          styles.creatorPayoutButtonDisabled
      ]}
    >
      <Text style={styles.creatorPayoutButtonText}>
        {paymentMethods.length === 0
          ? "Add Payment Method First"
          : "Request Payout"}
      </Text>
    </Pressable>
  </View>
</View>

<Text style={styles.sectionTitle}>
          Payment Methods
        </Text>

        <View style={styles.creatorPaymentCard}>
          <Text style={styles.creatorPaymentTitle}>Where should we send your earnings?</Text>
          <Text style={styles.creatorPaymentSubtitle}>Add a payout destination for your creator earnings.</Text>

          {paymentMethods.length === 0 ? (
            <View style={styles.creatorPaymentEmpty}>
              <Text style={styles.creatorPaymentEmptyIcon}>+</Text>
              <Text style={styles.creatorPaymentEmptyTitle}>No payment methods yet</Text>
              <Text style={styles.creatorPaymentEmptyText}>Add EcoCash, bank, PayPal, OneMoney or another payout method.</Text>
            </View>
          ) : (
            paymentMethods.map(method => (
              <View key={method.id} style={styles.creatorPaymentMethod}>
                <Text style={styles.creatorPaymentMethodName}>{method.method}</Text>
                <Text style={styles.creatorPaymentDestination}>{method.destination}</Text>
                {method.isDefault && (
                  <Text style={styles.creatorPaymentDefaultText}>DEFAULT</Text>
                )}
                {!method.isDefault && (
                  <Pressable onPress={() => setDefaultPaymentMethod(method.id)}>
                    <Text>Set default</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => deletePaymentMethod(method.id)}>
                  <Text>Remove</Text>
                </Pressable>
              </View>
            ))
          )}

          <Pressable
            onPress={() => setPaymentModalVisible(true)}
            style={styles.creatorPaymentAddButton}
          >
            <Text style={styles.creatorPaymentAddText}>
              + Add Payment Method
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>
          Active Challenges
        </Text>

        {challenges.length === 0 ? (
          <View style={styles.creatorEmptyCard}>
            <Text style={styles.creatorEmptyTitle}>
              No challenges yet
            </Text>
            <Text style={styles.creatorEmptyText}>
              New creator challenges will appear here.
            </Text>
          </View>
        ) : (
          challenges.map(challenge => (
            <View
              key={challenge.id}
              style={styles.challengeCard}
            >
              <Text style={styles.challengeTitle}>
                {challenge.title}
              </Text>

              <Text style={styles.challengeDescription}>
                {challenge.description}
              </Text>

              <View style={styles.challengeMeta}>
                <Text style={styles.challengePrize}>
                  💰 ${Number(challenge.prizePool || 0).toFixed(0)}
                </Text>

                <Text style={styles.challengeEntries}>
                  👥 {Number(challenge.entries || 0)} entries
                </Text>
              </View>

              <Pressable
                style={styles.challengeButton}
                onPress={() => joinChallenge(challenge)}
              >
                <Text style={styles.challengeButtonText}>
                  🔥 JOIN & SUBMIT VIDEO
                </Text>
              </Pressable>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>
          Your Videos
        </Text>

        <View style={styles.creatorVideoCountCard}>
          <Text style={styles.creatorVideoCount}>
            {myVideos.length}
          </Text>

          <Text style={styles.creatorVideoText}>
            published videos available for challenges
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Submission Center
        </Text>

        {submissions.length === 0 ? (
          <View style={styles.creatorEmptyCard}>
            <Text style={styles.creatorEmptyTitle}>
              No submissions yet
            </Text>
            <Text style={styles.creatorEmptyText}>
              Join a challenge and submit your best video to start competing.
            </Text>
          </View>
        ) : (
          submissions.slice(0, 10).map(item => {
            const status = String(item.status || "").toLowerCase();

            const isWinner = item.winner || status === "winner";
            const isApproved =
              status === "approved" ||
              status === "winner";

            const isRejected = status === "rejected";

            return (
              <View
                key={item.id}
                style={styles.creatorSubmissionCard}
              >
                <View style={styles.creatorSubmissionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={styles.submissionTitle}
                      numberOfLines={1}
                    >
                      {item.title || "Creator submission"}
                    </Text>

                    <Text style={styles.creatorSubmissionDate}>
                      {item.submittedAt
                        ? new Date(item.submittedAt).toLocaleDateString()
                        : "Recently submitted"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.creatorStatusBadge,
                      isWinner
                        ? styles.creatorStatusWinner
                        : isRejected
                        ? styles.creatorStatusRejected
                        : isApproved
                        ? styles.creatorStatusApproved
                        : styles.creatorStatusPending,
                    ]}
                  >
                    <Text style={styles.creatorStatusText}>
                      {isWinner
                        ? "🏆 WINNER"
                        : isRejected
                        ? "REJECTED"
                        : isApproved
                        ? "APPROVED"
                        : "UNDER REVIEW"}
                    </Text>
                  </View>
                </View>

                <View style={styles.creatorSubmissionTimeline}>
                  <View style={styles.creatorTimelineStep}>
                    <View style={styles.creatorTimelineDotActive} />
                    <Text style={styles.creatorTimelineText}>
                      Submitted
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.creatorTimelineLine,
                      isApproved || isRejected
                        ? styles.creatorTimelineLineActive
                        : null,
                    ]}
                  />

                  <View style={styles.creatorTimelineStep}>
                    <View
                      style={[
                        styles.creatorTimelineDot,
                        isApproved || isRejected
                          ? styles.creatorTimelineDotActive
                          : null,
                      ]}
                    />
                    <Text style={styles.creatorTimelineText}>
                      Review
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.creatorTimelineLine,
                      isApproved || isRejected
                        ? styles.creatorTimelineLineActive
                        : null,
                    ]}
                  />

                  <View style={styles.creatorTimelineStep}>
                    <View
                      style={[
                        styles.creatorTimelineDot,
                        isApproved
                          ? styles.creatorTimelineDotActive
                          : null,
                      ]}
                    />
                    <Text style={styles.creatorTimelineText}>
                      Decision
                    </Text>
                  </View>
                </View>

                {typeof item.score === "number" ? (
                  <View style={styles.creatorSubmissionInfo}>
                    <Text style={styles.creatorSubmissionInfoLabel}>
                      REVIEW SCORE
                    </Text>

                    <Text style={styles.creatorSubmissionScore}>
                      {item.score}/100
                    </Text>
                  </View>
                ) : null}

                {item.moderationNote ? (
                  <View style={styles.creatorModerationNote}>
                    <Text style={styles.creatorModerationNoteLabel}>
                      MODERATION NOTE
                    </Text>

                    <Text style={styles.creatorModerationNoteText}>
                      {item.moderationNote}
                    </Text>
                  </View>
                ) : null}

                {Number(item.awardedAmount || 0) > 0 ? (
                  <View style={styles.creatorAwardBanner}>
                    <Text style={styles.creatorAwardText}>
                      💰 ${Number(item.awardedAmount).toFixed(2)} AWARDED
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        <Text style={styles.sectionTitle}>
          Creator Leaderboard
        </Text>

        {leaderboard.slice(0, 10).map((item, index) => (
          <View
            key={item.userId}
            style={styles.leaderboardRow}
          >
            <Text style={styles.leaderboardRank}>
              #{item.rank || index + 1}
            </Text>

            <View style={{ flex: 1 }}>
              <Text style={styles.leaderboardName}>
                {item.name ||
                  item.username ||
                  "Creator"}
              </Text>

              <Text style={styles.leaderboardLevel}>
                {item.level || "Rookie"}
              </Text>
            </View>

            <Text style={styles.leaderboardXp}>
              {Number(item.xp || 0)} XP
            </Text>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={!!selectedChallenge}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedChallenge(null)}
      >
        <View style={styles.creatorModalBackdrop}>
          <View style={styles.creatorChallengeModal}>
            <View style={styles.creatorModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.creatorModalTitle}>
                  {selectedChallenge?.title || "Challenge"}
                </Text>

                <Text style={styles.creatorModalSubtitle}>
                  {selectedChallenge?.category || "Creator Challenge"}
                </Text>
              </View>

              <Pressable
                style={styles.creatorModalClose}
                onPress={() => setSelectedChallenge(null)}
              >
                <Text style={styles.creatorModalCloseText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              <View style={styles.creatorChallengeHero}>
                <View style={styles.creatorChallengeHeroBlock}>
                  <Text style={styles.creatorChallengeHeroLabel}>
                    PRIZE POOL
                  </Text>

                  <Text style={styles.creatorChallengeHeroValue}>
                    ${Number(selectedChallenge?.prizePool || 0).toFixed(0)}
                  </Text>
                </View>

                <View style={styles.creatorChallengeHeroBlock}>
                  <Text style={styles.creatorChallengeHeroLabel}>
                    WINNERS
                  </Text>

                  <Text style={styles.creatorChallengeHeroValue}>
                    {Number(selectedChallenge?.maxWinners || 0)}
                  </Text>
                </View>
              </View>

              <View style={styles.creatorCountdownCard}>
                <Text style={styles.creatorCountdownIcon}>⏳</Text>

                <View style={{ flex: 1 }}>
                  <Text style={styles.creatorCountdownLabel}>
                    SUBMISSIONS CLOSE
                  </Text>

                  <Text style={styles.creatorCountdownValue}>
                    {selectedChallenge
                      ? getChallengeTimeLeft(selectedChallenge.endsAt)
                      : ""}
                  </Text>
                </View>
              </View>

              <View style={styles.creatorChallengeStats}>
                <View style={styles.creatorChallengeStat}>
                  <Text style={styles.creatorChallengeStatValue}>
                    {Number(selectedChallenge?.entries || 0)}
                  </Text>

                  <Text style={styles.creatorChallengeStatLabel}>
                    Entries
                  </Text>
                </View>

                <View style={styles.creatorChallengeStat}>
                  <Text style={styles.creatorChallengeStatValue}>
                    {selectedChallenge?.category || "General"}
                  </Text>

                  <Text style={styles.creatorChallengeStatLabel}>
                    Category
                  </Text>
                </View>
              </View>

              <Text style={styles.creatorChallengeDescription}>
                {selectedChallenge?.description ||
                  "Create your best original Pocket Rivals video and submit it for review."}
              </Text>

              <Text style={styles.creatorRulesTitle}>
                CREATOR RULES
              </Text>

              <View style={styles.creatorRuleRow}>
                <Text style={styles.creatorRuleNumber}>01</Text>
                <Text style={styles.creatorRuleText}>
                  Submit original content that you created.
                </Text>
              </View>

              <View style={styles.creatorRuleRow}>
                <Text style={styles.creatorRuleNumber}>02</Text>
                <Text style={styles.creatorRuleText}>
                  Keep your submission relevant to the challenge.
                </Text>
              </View>

              <View style={styles.creatorRuleRow}>
                <Text style={styles.creatorRuleNumber}>03</Text>
                <Text style={styles.creatorRuleText}>
                  Videos are reviewed before winners are selected.
                </Text>
              </View>

              <View style={styles.creatorRuleRow}>
                <Text style={styles.creatorRuleNumber}>04</Text>
                <Text style={styles.creatorRuleText}>
                  Follow Pocket Rivals community and safety standards.
                </Text>
              </View>

              <Pressable
                style={styles.creatorChallengeJoinButton}
                onPress={async () => {
                  if (!selectedChallenge) return;

                  const challenge = selectedChallenge;
                  setSelectedChallenge(null);
                  await joinChallenge(challenge);
                }}
              >
                <Text style={styles.creatorChallengeJoinText}>
                  🔥 JOIN & SUBMIT VIDEO
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!paymentSaving) setPaymentModalVisible(false);
        }}
      >
        <View style={styles.creatorModalBackdrop}>
          <View style={styles.creatorPaymentModal}>
            <View style={styles.creatorModalHeader}>
              <View style={{flex:1}}>
                <Text style={styles.creatorModalTitle}>Add Payment Method</Text>
                <Text style={styles.creatorModalSubtitle}>Choose where your creator earnings should go</Text>
              </View>
              <Pressable
                style={styles.creatorModalClose}
                onPress={() => !paymentSaving && setPaymentModalVisible(false)}
              >
                <Text style={styles.creatorModalCloseText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{paddingBottom:18}}
            >
              <Text style={styles.creatorPaymentFormLabel}>PAYMENT METHOD</Text>

              <View style={styles.creatorPaymentOptions}>
                {([
                  ["ecocash","EcoCash","📱"],
                  ["bank","Bank Account","🏦"],
                  ["paypal","PayPal","💳"],
                  ["onemoney","OneMoney","📲"],
                  ["other","Other","🌐"],
                ] as const).map(([value,label,icon]) => (
                  <Pressable
                    key={value}
                    onPress={() => setPaymentMethod(value)}
                    style={[
                      styles.creatorPaymentOption,
                      paymentMethod === value && styles.creatorPaymentOptionActive
                    ]}
                  >
                    <Text style={styles.creatorPaymentOptionIcon}>{icon}</Text>
                    <Text style={[
                      styles.creatorPaymentOptionText,
                      paymentMethod === value && styles.creatorPaymentOptionTextActive
                    ]}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.creatorPaymentFormLabel}>ACCOUNT NAME</Text>
              <TextInput
                value={paymentAccountName}
                onChangeText={setPaymentAccountName}
                placeholder="Name on the account"
                placeholderTextColor="#666"
                style={styles.creatorPaymentInput}
                autoCapitalize="words"
              />

              <Text style={styles.creatorPaymentFormLabel}>PAYOUT DESTINATION</Text>
              <TextInput
                value={paymentDestination}
                onChangeText={setPaymentDestination}
                placeholder={
                  paymentMethod === "ecocash" ? "EcoCash number" :
                  paymentMethod === "bank" ? "Account number" :
                  paymentMethod === "paypal" ? "PayPal email" :
                  paymentMethod === "onemoney" ? "OneMoney number" :
                  "Account, wallet or payout details"
                }
                placeholderTextColor="#666"
                style={styles.creatorPaymentInput}
                autoCapitalize="none"
                keyboardType={paymentMethod === "paypal" ? "email-address" : "default"}
              />

              <View style={styles.creatorPaymentSecurityNote}>
                <Text style={styles.creatorPaymentSecurityIcon}>🔒</Text>
                <Text style={styles.creatorPaymentSecurityText}>
                  Your payout destination is stored securely with your creator account.
                </Text>
              </View>

              <Pressable
                disabled={paymentSaving}
                onPress={savePaymentMethod}
                style={[
                  styles.creatorPaymentSaveButton,
                  paymentSaving && styles.creatorPaymentSaveButtonDisabled
                ]}
              >
                <Text style={styles.creatorPaymentSaveText}>
                  {paymentSaving ? "Saving..." : "Save Payment Method"}
                </Text>
              </Pressable>

              <Pressable
                disabled={paymentSaving}
                onPress={() => setPaymentModalVisible(false)}
                style={styles.creatorPaymentCancelButton}
              >
                <Text style={styles.creatorPaymentCancelText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={payoutModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => { if (!payoutSubmitting) setPayoutModalVisible(false); }}
        >
          <View style={styles.creatorModalBackdrop}>
            <View style={styles.creatorPaymentModal}>
              <View style={styles.creatorModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creatorModalTitle}>Request Payout</Text>
                  <Text style={styles.creatorModalSubtitle}>Transfer your creator earnings to a saved payment method.</Text>
                </View>
                <Pressable style={styles.creatorModalClose} onPress={() => !payoutSubmitting && setPayoutModalVisible(false)}>
                  <Text style={styles.creatorModalCloseText}>×</Text>
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 18 }}>
                <Text style={styles.creatorPaymentFormLabel}>AVAILABLE</Text>
                <Text style={styles.creatorPayoutAvailable}>${Number(wallet?.available || 0).toFixed(2)}</Text>
                <Text style={styles.creatorPaymentFormLabel}>PAYOUT AMOUNT</Text>
                <TextInput value={payoutAmount} onChangeText={setPayoutAmount} placeholder="0.00" placeholderTextColor="#666" style={styles.creatorPaymentInput} keyboardType="decimal-pad" />
                <Text style={styles.creatorPaymentFormLabel}>SEND TO</Text>
                {paymentMethods.map(method => (
                  <Pressable key={method.id} onPress={() => setSelectedPayoutMethodId(method.id)} style={[styles.creatorPayoutMethod, selectedPayoutMethodId === method.id && styles.creatorPayoutMethodActive]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.creatorPayoutMethodName}>{method.method}</Text>
                      <Text style={styles.creatorPayoutMethodDestination}>{method.destination}</Text>
                      {method.isDefault && <Text style={styles.creatorPaymentDefaultText}>DEFAULT</Text>}
                    </View>
                    <View style={[styles.creatorPayoutRadio, selectedPayoutMethodId === method.id && styles.creatorPayoutRadioActive]}>
                      {selectedPayoutMethodId === method.id && <View style={styles.creatorPayoutRadioDot} />}
                    </View>
                  </Pressable>
                ))}
                <View style={styles.creatorPaymentSecurityNote}>
                  <Text style={styles.creatorPaymentSecurityIcon}>🔒</Text>
                  <Text style={styles.creatorPaymentSecurityText}>Payouts are submitted for review before they are processed.</Text>
                </View>
                <Pressable disabled={payoutSubmitting} onPress={requestCreatorPayout} style={[styles.creatorPaymentSaveButton, payoutSubmitting && styles.creatorPaymentSaveButtonDisabled]}>
                  <Text style={styles.creatorPaymentSaveText}>{payoutSubmitting ? "Submitting..." : "Confirm Payout"}</Text>
                </Pressable>
                <Pressable disabled={payoutSubmitting} onPress={() => setPayoutModalVisible(false)} style={styles.creatorPaymentCancelButton}>
                  <Text style={styles.creatorPaymentCancelText}>Cancel</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
        <Modal
          visible={showSubmit}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!submittingVideo) {
            setShowSubmit(false);
            setSubmissionChallenge(null);
          }
        }}
      >
        <View style={styles.creatorModalBackdrop}>
          <View style={styles.creatorSubmitModal}>
            <View style={styles.creatorModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.creatorModalTitle}>
                  Submit to Challenge
                </Text>

                <Text style={styles.creatorModalSubtitle}>
                  {submissionChallenge?.title || "Creator Challenge"}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  if (!submittingVideo) {
                    setShowSubmit(false);
                    setSubmissionChallenge(null);
                  }
                }}
                style={styles.creatorModalClose}
              >
                <Text style={styles.creatorModalCloseText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.creatorPrizeBanner}>
              <Text style={styles.creatorPrizeText}>
                💰 Prize Pool ${Number(
                  submissionChallenge?.prizePool || 0
                ).toFixed(0)}
              </Text>

              <Text style={styles.creatorPrizeSubtext}>
                Select your best published video
              </Text>
            </View>

            <Text style={styles.creatorModalSection}>
              YOUR VIDEOS
            </Text>

            {myVideos.length === 0 ? (
              <View style={styles.creatorNoVideoCard}>
                <Text style={styles.creatorNoVideoTitle}>
                  No published videos
                </Text>

                <Text style={styles.creatorNoVideoText}>
                  Publish a video first, then come back and enter
                  this challenge.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 8,
                }}
              >
                {myVideos.map(video => {
                  const selected =
                    selectedSubmitVideo?.id === video.id;

                  return (
                    <Pressable
                      key={video.id}
                      onPress={() =>
                        setSelectedSubmitVideo(video)
                      }
                      style={[
                        styles.creatorVideoChoice,
                        selected &&
                          styles.creatorVideoChoiceSelected,
                      ]}
                    >
                      {video.coverUrl ||
                      video.thumbnail ? (
                        <Image
                          source={{
                            uri:
                              absoluteUrl(
                                video.coverUrl ||
                                  video.thumbnail
                              ) || "",
                          }}
                          style={styles.creatorVideoThumb}
                        />
                      ) : (
                        <View
                          style={styles.creatorVideoThumbFallback}
                        >
                          <Text style={{ fontSize: 28 }}>
                            ▶
                          </Text>
                        </View>
                      )}

                      <Text
                        numberOfLines={2}
                        style={styles.creatorVideoChoiceTitle}
                      >
                        {video.title || "Untitled video"}
                      </Text>

                      {selected ? (
                        <View
                          style={styles.creatorSelectedBadge}
                        >
                          <Text
                            style={
                              styles.creatorSelectedBadgeText
                            }
                          >
                            ✓ SELECTED
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Text style={styles.creatorModalSection}>
              DESCRIPTION
            </Text>

            <TextInput
              value={submitDescription}
              onChangeText={setSubmitDescription}
              placeholder="Tell the judges why this video deserves to win..."
              placeholderTextColor="#666"
              multiline
              maxLength={500}
              style={styles.creatorDescriptionInput}
            />

            <Pressable
              disabled={
                submittingVideo ||
                !selectedSubmitVideo ||
                !submissionChallenge
              }
              onPress={() => {
                if (submissionChallenge) {
                  submitChallengeVideo(
                    submissionChallenge
                  );
                }
              }}
              style={[
                styles.creatorSubmitButton,
                (submittingVideo ||
                  !selectedSubmitVideo) &&
                  styles.creatorSubmitButtonDisabled,
              ]}
            >
              {submittingVideo ? (
                <ActivityIndicator color="#111" />
              ) : (
                <Text style={styles.creatorSubmitButtonText}>
                  🚀 SUBMIT FOR REVIEW
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function HomeScreen({
  user,
  videos,
  search,
  setSearch,
  loading,
  refreshing,
  onRefresh,
  onVideo,
  onProfile,
  onLike,
  likedVideos,
  onShare,
  onSave,
  savedVideos,
}: any) {
  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>
            POCKET <Text style={styles.brandAccent}>RIVALS</Text>
          </Text>
          <Text style={styles.subtitle}>
            Your world. Your rivals.
          </Text>
        </View>

        <Pressable
          style={styles.avatarSmall}
          onPress={() => onProfile(user)}
        >
          {user.avatar ? (
            <Image
              source={{ uri: absoluteUrl(user.avatar) }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarLetter}>
              {user.username?.[0]?.toUpperCase() ||
                "P"}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search videos, creators..."
          placeholderTextColor="#777"
          style={styles.searchInput}
        />

        {search.length > 0 && (
          <Pressable
            onPress={() => setSearch("")}
          >
            <Text style={styles.clear}>×</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>
            Loading Pocket Rivals...
          </Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={item => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          contentContainerStyle={
            styles.videoList
          }
          renderItem={({ item }) => (
            <VideoCard
              video={item}
              liked={!!likedVideos[item.id]}
              saved={!!savedVideos[item.id]}
              onPress={() => onVideo(item)}
              onLike={() => onLike(item)}
              onShare={() => onShare(item)}
              onSave={() => onSave(item)}
              onProfile={() => {
                if (item.creator) {
                  onProfile(item.creator);
                }
              }}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No videos yet"
              text="Published videos will appear here."
            />
          }
        />
      )}
    </View>
  );
}

/* ============================================================
   VIDEO CARD
   ============================================================ */

function VideoCard({
  video,
  liked,
  saved,
  onPress,
  onLike,
  onShare,
  onSave,
  onProfile,
}: any) {
  return (
    <View style={styles.videoCard}>
      <Pressable onPress={onPress}>
        <View style={styles.coverWrap}>
          {video.coverUrl ||
          video.thumbnail ? (
            <Image
              source={{
                uri: absoluteUrl(
                  video.coverUrl ||
                    video.thumbnail
                ),
              }}
              style={styles.cover}
            />
          ) : (
            <View style={styles.coverFallback}>
              <Text style={styles.playLarge}>
                ▶
              </Text>
            </View>
          )}

          <View style={styles.playButton}>
            <Text style={styles.playText}>
              ▶
            </Text>
          </View>

          {video.featured && (
            <View style={styles.featured}>
              <Text style={styles.featuredText}>
                FEATURED
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.videoInfo}>
        <View style={styles.videoTitleRow}>
          <Text
            style={styles.videoTitle}
            numberOfLines={2}
          >
            {video.title}
          </Text>

          {video.access === "premium" && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>
                {video.coinPrice || 0} 🪙
              </Text>
            </View>
          )}
        </View>

        <Text
          style={styles.description}
          numberOfLines={2}
        >
          {video.description ||
            "Watch this Pocket Rivals video."}
        </Text>

        <Pressable
          style={styles.creatorRow}
          onPress={onProfile}
        >
          <View style={styles.creatorAvatar}>
            {video.creatorAvatar ? (
              <Image
                source={{
                  uri: absoluteUrl(
                    video.creatorAvatar
                  ),
                }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarLetter}>
                {(video.creatorName ||
                  video.creator?.username ||
                  "P")[0].toUpperCase()}
              </Text>
            )}
          </View>

          <Text style={styles.creatorName}>
            {video.creatorName ||
              video.creator?.username ||
              "Pocket Rivals"}
          </Text>
        </Pressable>

        <View style={styles.statsRow}>
          <Pressable
            style={styles.action}
            onPress={onLike}
          >
            <Text
              style={[
                styles.actionIcon,
                liked && styles.liked,
              ]}
            >
              {liked ? "♥" : "♡"}
            </Text>

            <Text style={styles.actionText}>
              {formatNumber(
                Number(video.likes || 0)
              )}
            </Text>
          </Pressable>

          <Pressable
            style={styles.action}
            onPress={onPress}
          >
            <Text style={styles.actionIcon}>
              💬
            </Text>
            <Text style={styles.actionText}>
              {formatNumber(
                Number(video.comments || 0)
              )}
            </Text>
          </Pressable>

          <Pressable
            style={styles.action}
            onPress={onShare}
          >
            <Text style={styles.actionIcon}>
              ↗
            </Text>
            <Text style={styles.actionText}>
              {formatNumber(
                Number(video.shares || 0)
              )}
            </Text>
          </Pressable>

          <Pressable
            style={styles.action}
            onPress={onSave}
          >
            <Text style={styles.actionIcon}>
              {saved ? "★" : "☆"}
            </Text>
            <Text style={styles.actionText}>
              Save
            </Text>
          </Pressable>

          <Text style={styles.views}>
            {formatNumber(
              Number(video.views || 0)
            )}{" "}
            views
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ============================================================
   DISCOVER
   ============================================================ */

function DiscoverScreen({
  videos,
  search,
  setSearch,
  onVideo,
  onProfile,
}: any) {
  const categories = [
    "Trending",
    "Horror",
    "Drama",
    "Comedy",
    "Action",
    "Games",
    "Music",
    "Creator",
  ];

  return (
    <View style={styles.flex}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>
          Discover
        </Text>
        <Text style={styles.muted}>
          Find your next obsession.
        </Text>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search Pocket Rivals"
          placeholderTextColor="#777"
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={
          styles.categoryRow
        }
      >
        {categories.map(category => (
          <View
            key={category}
            style={styles.categoryChip}
          >
            <Text style={styles.categoryText}>
              {category}
            </Text>
          </View>
        ))}
      </ScrollView>

      <FlatList
        data={videos}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={
          styles.discoverList
        }
        renderItem={({ item }) => (
          <VideoCard
            video={item}
            liked={false}
            saved={false}
            onPress={() => onVideo(item)}
            onLike={() => {}}
            onShare={() => {}}
            onSave={() => {}}
            onProfile={() =>
              item.creator &&
              onProfile(item.creator)
            }
          />
        )}
      />
    </View>
  );
}

/* ============================================================
   OWN PROFILE
   ============================================================ */

function OwnProfileScreen({
  user,
  videos,
  coins,
  onVideo,
  onEdit,
  onCreatorHub,
}: any) {
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.profileContainer}
    >
      <View style={styles.profileTop}>
        <View style={styles.profileAvatar}>
          {user.avatar ? (
            <Image
              source={{
                uri: absoluteUrl(user.avatar),
              }}
              style={styles.profileAvatarImage}
            />
          ) : (
            <Text style={styles.profileLetter}>
              {user.username?.[0]?.toUpperCase() ||
                "P"}
            </Text>
          )}
        </View>

        <Text style={styles.profileName}>
          {user.name ||
            user.username}
        </Text>

        <Text style={styles.profileUsername}>
          @{user.username}
        </Text>

        <Text style={styles.profileBio}>
          {user.bio ||
            "Welcome to Pocket Rivals."}
        </Text>

        <TouchableOpacity
          style={styles.editButton}
          onPress={onEdit}
        >
          <Text style={styles.editText}>
            Edit Profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.creatorHubButton}
          onPress={onCreatorHub}
        >
          <Text style={styles.creatorHubButtonIcon}>
            🔥
          </Text>

          <View style={{ flex: 1 }}>
            <Text style={styles.creatorHubButtonTitle}>
              Creator Hub
            </Text>

            <Text style={styles.creatorHubButtonText}>
              Challenges • XP • Rewards • Leaderboard
            </Text>
          </View>

          <Text style={styles.creatorHubButtonArrow}>
            ›
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileStats}>
        <Stat
          value={formatNumber(
            Number(user.followers || 0)
          )}
          label="Followers"
        />

        <Stat
          value={formatNumber(
            Number(user.following || 0)
          )}
          label="Following"
        />

        <Stat
          value={formatNumber(videos.length)}
          label="Videos"
        />

        <Stat
          value={formatNumber(coins)}
          label="Coins"
        />
      </View>

      <Text style={styles.sectionTitle}>
        My Videos
      </Text>

      {videos.length === 0 ? (
        <EmptyState
          title="No videos yet"
          text="Your published videos will appear here."
        />
      ) : (
        videos.map((video: VideoItem) => (
          <VideoMini
            key={video.id}
            video={video}
            onPress={() => onVideo(video)}
          />
        ))
      )}
    </ScrollView>
  );
}

/* ============================================================
   OTHER USER PROFILE
   ============================================================ */

function UserProfileScreen({
  profile,
  currentUser,
  following,
  videos,
  onBack,
  onFollow,
  onMessage,
  onVideo,
}: {
  profile: User;
  currentUser: User;
  following: boolean;
  videos: VideoItem[];
  onBack: () => void;
  onFollow: () => void;
  onMessage: () => void;
  onVideo: (video: VideoItem) => void;
  onEdit: () => void;
}) {
  /*
   * IMPORTANT:
   *
   * This is the exact protection requested:
   *
   * Own profile:
   *   NO FOLLOW
   *   NO MESSAGE
   *
   * Other profile:
   *   FOLLOW
   *   MESSAGE
   */

  const isOwnProfile =
    String(profile.id) ===
    String(currentUser.id);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.profileContainer}
    >
      <View style={styles.otherProfileHeader}>
        <Pressable
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </Pressable>

        <Text style={styles.pageTitle}>
          Profile
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <View style={styles.profileTop}>
        <View style={styles.profileAvatar}>
          {profile.avatar ? (
            <Image
              source={{
                uri: absoluteUrl(
                  profile.avatar
                ),
              }}
              style={styles.profileAvatarImage}
            />
          ) : (
            <Text style={styles.profileLetter}>
              {profile.username?.[0]?.toUpperCase() ||
                "U"}
            </Text>
          )}
        </View>

        <Text style={styles.profileName}>
          {profile.name ||
            profile.username}
          {profile.verified ? " ✓" : ""}
        </Text>

        <Text style={styles.profileUsername}>
          @{profile.username}
        </Text>

        <Text style={styles.profileBio}>
          {profile.bio ||
            "Pocket Rivals creator."}
        </Text>

        {!isOwnProfile && (
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[
                styles.followButton,
                following &&
                  styles.followingButton,
              ]}
              onPress={onFollow}
            >
              <Text
                style={[
                  styles.followText,
                  following &&
                    styles.followingText,
                ]}
              >
                {following
                  ? "Following"
                  : "Follow"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.messageButton}
              onPress={onMessage}
            >
              <Text style={styles.messageButtonText}>
                Message
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isOwnProfile && (
          <View style={styles.ownProfileNotice}>
            <Text style={styles.ownProfileText}>
              This is your profile
            </Text>
          </View>
        )}
      </View>

      <View style={styles.profileStats}>
        <Stat
          value={formatNumber(
            Number(profile.followers || 0)
          )}
          label="Followers"
        />

        <Stat
          value={formatNumber(
            Number(profile.following || 0)
          )}
          label="Following"
        />

        <Stat
          value={formatNumber(videos.length)}
          label="Videos"
        />
      </View>

      <Text style={styles.sectionTitle}>
        Videos
      </Text>

      {videos.length === 0 ? (
        <EmptyState
          title="No public videos"
          text="This creator hasn't published anything yet."
        />
      ) : (
        videos.map(video => (
          <VideoMini
            key={video.id}
            video={video}
            onPress={() => onVideo(video)}
          />
        ))
      )}
    </ScrollView>
  );
}

/* ============================================================
   VIDEO MINI
   ============================================================ */

function VideoMini({
  video,
  onPress,
}: {
  video: VideoItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.videoMini}
      onPress={onPress}
    >
      {video.coverUrl ? (
        <Image
          source={{
            uri: absoluteUrl(
              video.coverUrl
            ),
          }}
          style={styles.miniCover}
        />
      ) : (
        <View style={styles.miniFallback}>
          <Text>▶</Text>
        </View>
      )}

      <View style={styles.miniInfo}>
        <Text
          style={styles.miniTitle}
          numberOfLines={2}
        >
          {video.title}
        </Text>

        <Text style={styles.miniStats}>
          {formatNumber(
            Number(video.views || 0)
          )}{" "}
          views ·{" "}
          {formatNumber(
            Number(video.likes || 0)
          )}{" "}
          likes
        </Text>

        <Text style={styles.miniDate}>
          {timeAgo(video.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

/* ============================================================
   MESSAGES
   ============================================================ */

function MessagesScreen({
  currentUser,
  token,
  initialUser,
  onUser,
  onBack,
}: {
  currentUser: User;
  token: string | null;
  initialUser: User | null;
  onUser: (user: User | null) => void;
  onBack: () => void;
}) {
  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const data = await api(
        "/api/messages",
        {},
        token
      );

      if (Array.isArray(data?.conversations)) {
        setConversations(
          data.conversations
        );
      }
    } catch (error) {
      console.log(
        "Messages API:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  if (initialUser) {
    return (
      <ChatScreen
        currentUser={currentUser}
        otherUser={initialUser}
        token={token}
        onBack={() => {
          onUser(null);
          loadConversations();
        }}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>
          Messages
        </Text>

        <Text style={styles.muted}>
          Private conversations
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : conversations.length === 0 ? (
        <EmptyState
          title="No messages yet"
          text="Open another user's profile and tap Message."
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item =>
            String(item.user.id)
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.conversation}
              onPress={() =>
                onUser(item.user)
              }
            >
              <Avatar user={item.user} />

              <View style={styles.conversationInfo}>
                <Text
                  style={
                    styles.conversationName
                  }
                >
                  {item.user.name ||
                    item.user.username}
                </Text>

                <Text
                  style={
                    styles.conversationLast
                  }
                  numberOfLines={1}
                >
                  {item.lastMessage?.text ||
                    "Start a conversation"}
                </Text>
              </View>

              {item.lastMessage && (
                <Text style={styles.time}>
                  {timeAgo(
                    item.lastMessage.createdAt
                  )}
                </Text>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

/* ============================================================
   CHAT
   ============================================================ */

function ChatScreen({
  currentUser,
  otherUser,
  token,
  onBack,
}: {
  currentUser: User;
  otherUser: User;
  token: string | null;
  onBack: () => void;
}) {
  const [messages, setMessages] =
    useState<Message[]>([]);

  const [text, setText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const listRef =
    useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();

    const interval = setInterval(
      loadMessages,
      5000
    );

    return () =>
      clearInterval(interval);
  }, [otherUser.id]);

  async function loadMessages() {
    try {
      const data = await api(
        `/api/messages/${encodeURIComponent(
          otherUser.id
        )}`,
        {},
        token
      );

      if (Array.isArray(data?.messages)) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.log(
        "Chat API:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const value = text.trim();

    if (!value) return;

    const optimistic: Message = {
      id: makeId(),
      senderId: currentUser.id,
      receiverId: otherUser.id,
      text: value,
      createdAt:
        new Date().toISOString(),
      read: false,
    };

    setMessages(prev => [
      ...prev,
      optimistic,
    ]);

    setText("");

    setTimeout(() => {
      listRef.current?.scrollToEnd({
        animated: true,
      });
    }, 50);

    try {
      const data = await api(
        "/api/messages",
        {
          method: "POST",
          body: JSON.stringify({
            receiverId: otherUser.id,
            text: value,
          }),
        },
        token
      );

      if (data?.message) {
        setMessages(prev =>
          prev.map(item =>
            item.id === optimistic.id
              ? data.message
              : item
          )
        );
      }
    } catch (error) {
      console.log(
        "Send message API:",
        error
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <View style={styles.chatHeader}>
        <Pressable
          onPress={onBack}
          style={styles.chatBack}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </Pressable>

        <Avatar user={otherUser} />

        <View style={styles.chatUserInfo}>
          <Text style={styles.chatName}>
            {otherUser.name ||
              otherUser.username}
          </Text>

          <Text style={styles.chatUsername}>
            @{otherUser.username}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item =>
            String(item.id)
          }
          contentContainerStyle={
            styles.chatList
          }
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({
              animated: false,
            })
          }
          renderItem={({ item }) => {
            const mine =
              String(item.senderId) ===
              String(currentUser.id);

            return (
              <View
                style={[
                  styles.messageRow,
                  mine &&
                    styles.messageRowMine,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    mine &&
                      styles.messageBubbleMine,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      mine &&
                        styles.messageTextMine,
                    ]}
                  >
                    {item.text}
                  </Text>

                  <Text
                    style={[
                      styles.messageTime,
                      mine &&
                        styles.messageTimeMine,
                    ]}
                  >
                    {timeAgo(
                      item.createdAt
                    )}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="Start chatting"
              text={`Send ${otherUser.username} a message.`}
            />
          }
        />
      )}

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write a message..."
          placeholderTextColor="#666"
          style={styles.composerInput}
          multiline
        />

        <Pressable
          style={styles.sendButton}
          onPress={send}
        >
          <Text style={styles.sendText}>
            ➤
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ============================================================
   REWARDS
   ============================================================ */

function RewardsScreen({
  coins,
  setCoins,
  onStore,
}: any) {
  const [claimed, setClaimed] =
    useState(false);

  function claim() {
    if (claimed) return;

    setCoins((prev: number) =>
      prev + 50
    );

    setClaimed(true);

    Alert.alert(
      "Reward claimed 🎉",
      "+50 coins added to your wallet."
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={
        styles.rewardsContainer
      }
    >
      <Text style={styles.pageTitle}>
        Rewards
      </Text>

      <Text style={styles.muted}>
        Play, watch and earn.
      </Text>

      <View style={styles.coinHero}>
        <Text style={styles.coinEmoji}>
          🪙
        </Text>

        <Text style={styles.coinAmount}>
          {formatNumber(coins)}
        </Text>

        <Text style={styles.coinLabel}>
          Pocket Coins
        </Text>
      </View>

      <TouchableOpacity
        style={styles.rewardCard}
        onPress={claim}
      >
        <View>
          <Text style={styles.rewardTitle}>
            Daily Reward
          </Text>

          <Text style={styles.rewardText}>
            Claim 50 coins today.
          </Text>
        </View>

        <Text style={styles.rewardAction}>
          {claimed ? "CLAIMED" : "+50 🪙"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.rewardCard}
        onPress={onStore}
      >
        <View>
          <Text style={styles.rewardTitle}>
            Coin Store
          </Text>

          <Text style={styles.rewardText}>
            Get coins for premium content.
          </Text>
        </View>

        <Text style={styles.rewardAction}>
          OPEN
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ============================================================
   VIDEO PLAYER
   ============================================================ */

function VideoPlayerScreen({
  video,
  liked,
  saved,
  onBack,
  onLike,
  onSave,
  onShare,
  onComments,
  onCreator,
}: any) {
  const videoRef =
    useRef<Video>(null);

  return (
    <SafeAreaView
      style={styles.playerScreen}
    >
      <View style={styles.playerHeader}>
        <Pressable
          onPress={onBack}
          style={styles.playerBack}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </Pressable>

        <Text
          style={styles.playerHeaderTitle}
          numberOfLines={1}
        >
          {video.title}
        </Text>
      </View>

      <View style={styles.player}>
        {video.videoUrl ? (
          <Video
            ref={videoRef}
            source={{
              uri: absoluteUrl(
                video.videoUrl
              )!,
            }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            shouldPlay
          />
        ) : (
          <View style={styles.playerEmpty}>
            <Text style={styles.playerEmptyIcon}>
              ▶
            </Text>

            <Text style={styles.playerEmptyText}>
              Video unavailable
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={
          styles.playerContent
        }
      >
        <Text style={styles.playerTitle}>
          {video.title}
        </Text>

        <Text style={styles.playerDescription}>
          {video.description ||
            "Pocket Rivals video."}
        </Text>

        <View style={styles.playerStats}>
          <Text style={styles.playerStat}>
            {formatNumber(
              Number(video.views || 0)
            )}{" "}
            views
          </Text>

          <Text style={styles.playerStat}>
            {formatNumber(
              Number(video.likes || 0)
            )}{" "}
            likes
          </Text>

          <Text style={styles.playerStat}>
            {formatNumber(
              Number(video.shares || 0)
            )}{" "}
            shares
          </Text>
        </View>

        {video.creator && (
          <Pressable
            style={styles.playerCreator}
            onPress={onCreator}
          >
            <Avatar
              user={video.creator}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={styles.playerCreatorName}
              >
                {video.creator.name ||
                  video.creator.username}
              </Text>

              <Text
                style={styles.playerCreatorHandle}
              >
                @{video.creator.username}
              </Text>
            </View>

            <Text style={styles.chevron}>
              ›
            </Text>
          </Pressable>
        )}

        <View style={styles.playerActions}>
          <PlayerAction
            icon={liked ? "♥" : "♡"}
            label="Like"
            active={liked}
            onPress={onLike}
          />

          <PlayerAction
            icon="💬"
            label="Comments"
            onPress={onComments}
          />

          <PlayerAction
            icon="↗"
            label="Share"
            onPress={onShare}
          />

          <PlayerAction
            icon={saved ? "★" : "☆"}
            label="Save"
            active={saved}
            onPress={onSave}
          />
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

/* ============================================================
   COMMENTS MODAL
   ============================================================ */

function CommentsModal({
  visible,
  comments,
  text,
  setText,
  onClose,
  onSend,
  onLike,
}: any) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.commentsSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              Comments
            </Text>

            <Pressable onPress={onClose}>
              <Text style={styles.close}>
                ×
              </Text>
            </Pressable>
          </View>

          <FlatList
            data={comments}
            keyExtractor={item =>
              String(item.id)
            }
            contentContainerStyle={
              styles.commentsList
            }
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <View style={styles.commentAvatar}>
                  <Text>
                    {(item.username ||
                      "U")[0].toUpperCase()}
                  </Text>
                </View>

                <View style={styles.commentBody}>
                  <Text style={styles.commentUser}>
                    @{item.username ||
                      "user"}
                  </Text>

                  <Text style={styles.commentText}>
                    {item.text}
                  </Text>

                  <Text style={styles.commentTime}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    onLike(item)
                  }
                >
                  <Text
                    style={[
                      styles.commentLike,
                      item.liked &&
                        styles.liked,
                    ]}
                  >
                    ♥{" "}
                    {item.likes || 0}
                  </Text>
                </Pressable>
              </View>
            )}
            ListEmptyComponent={
              <EmptyState
                title="No comments"
                text="Be the first to comment."
              />
            }
          />

          <View style={styles.commentComposer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add a comment..."
              placeholderTextColor="#666"
              style={styles.commentInput}
            />

            <Pressable
              style={styles.commentSend}
              onPress={onSend}
            >
              <Text style={styles.sendText}>
                ➤
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ============================================================
   COIN STORE
   ============================================================ */

function CoinStoreModal({
  visible,
  onClose,
  onBuy,
}: any) {
  const packages = [
    { coins: 100, price: "$0.99" },
    { coins: 500, price: "$3.99" },
    { coins: 1200, price: "$7.99" },
    { coins: 3000, price: "$14.99" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.coinSheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>
                Coin Store
              </Text>

              <Text style={styles.muted}>
                Unlock premium Pocket Rivals content.
              </Text>
            </View>

            <Pressable onPress={onClose}>
              <Text style={styles.close}>
                ×
              </Text>
            </Pressable>
          </View>

          {packages.map(item => (
            <TouchableOpacity
              key={item.coins}
              style={styles.coinPackage}
              onPress={() =>
                onBuy(item.coins)
              }
            >
              <Text style={styles.packageCoins}>
                🪙 {formatNumber(item.coins)}
              </Text>

              <Text style={styles.packagePrice}>
                {item.price}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

/* ============================================================
   LOGIN
   ============================================================ */

function LoginModal({
  visible,
  onClose,
  onLogin,
}: any) {
  const [username, setUsername] =
    useState("");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.loginBox}>
          <Text style={styles.sheetTitle}>
            Welcome to Pocket Rivals
          </Text>

          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor="#666"
            style={styles.loginInput}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (!username.trim()) {
                Alert.alert(
                  "Username required"
                );
                return;
              }

              onLogin(
                username.trim()
              );
            }}
          >
            <Text style={styles.primaryText}>
              Continue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ============================================================
   BOTTOM NAVIGATION
   ============================================================ */

function BottomNavigation({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  const items: {
    id: Tab;
    icon: string;
    label: string;
  }[] = [
    {
      id: "home",
      icon: "⌂",
      label: "Home",
    },
    {
      id: "discover",
      icon: "⌕",
      label: "Discover",
    },
    {
      id: "messages",
      icon: "◌",
      label: "Messages",
    },
    {
      id: "rewards",
      icon: "◆",
      label: "Rewards",
    },
    {
      id: "profile",
      icon: "●",
      label: "Profile",
    },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map(item => {
        const selected =
          active === item.id;

        return (
          <Pressable
            key={item.id}
            style={styles.navItem}
            onPress={() =>
              onChange(item.id)
            }
          >
            <Text
              style={[
                styles.navIcon,
                selected &&
                  styles.navIconActive,
              ]}
            >
              {item.icon}
            </Text>

            <Text
              style={[
                styles.navLabel,
                selected &&
                  styles.navLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ============================================================
   COMPONENTS
   ============================================================ */

function Avatar({
  user,
}: {
  user: User;
}) {
  return (
    <View style={styles.messageAvatar}>
      {user.avatar ? (
        <Image
          source={{
            uri: absoluteUrl(
              user.avatar
            ),
          }}
          style={styles.avatarImage}
        />
      ) : (
        <Text style={styles.avatarLetter}>
          {user.username?.[0]?.toUpperCase() ||
            "U"}
        </Text>
      )}
    </View>
  );
}

function Stat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function PlayerAction({
  icon,
  label,
  active,
  onPress,
}: any) {
  return (
    <Pressable
      style={styles.playerAction}
      onPress={onPress}
    >
      <Text
        style={[
          styles.playerActionIcon,
          active && styles.liked,
        ]}
      >
        {icon}
      </Text>

      <Text style={styles.playerActionLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>
        ◌
      </Text>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyText}>
        {text}
      </Text>
    </View>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#070709",
  },

  flex: {
    flex: 1,
    backgroundColor: "#070709",
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  brand: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
  },

  brandAccent: {
    opacity: 0.55,
  },

  subtitle: {
    color: "#777",
    marginTop: 2,
    fontSize: 12,
  },

  avatarSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#17171b",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarLetter: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },

  searchBox: {
    marginHorizontal: 16,
    marginBottom: 14,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#111115",
    borderWidth: 1,
    borderColor: "#202025",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  searchIcon: {
    color: "#aaa",
    fontSize: 25,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
  },

  clear: {
    color: "#aaa",
    fontSize: 25,
  },

  videoList: {
    paddingHorizontal: 14,
    paddingBottom: 100,
  },

  videoCard: {
    backgroundColor: "#101014",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1d1d22",
  },

  coverWrap: {
    height: 215,
    backgroundColor: "#16161a",
    position: "relative",
  },

  cover: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  coverFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  playLarge: {
    fontSize: 40,
    color: "#777",
  },

  playButton: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -25,
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,.65)",
    alignItems: "center",
    justifyContent: "center",
  },

  playText: {
    color: "#fff",
    fontSize: 19,
    marginLeft: 3,
  },

  featured: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fff",
  },

  featuredText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "900",
  },

  videoInfo: {
    padding: 15,
  },

  videoTitleRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },

  videoTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    flex: 1,
  },

  description: {
    color: "#888",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },

  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  creatorAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#202025",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  creatorName: {
    color: "#ddd",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
    gap: 13,
  },

  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  actionIcon: {
    color: "#aaa",
    fontSize: 18,
  },

  liked: {
    color: "#fff",
  },

  actionText: {
    color: "#777",
    fontSize: 11,
  },

  views: {
    marginLeft: "auto",
    color: "#666",
    fontSize: 10,
  },

  premiumBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "#202025",
  },

  premiumText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },

  pageHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },

  pageTitle: {
    color: "#fff",
    fontSize: 27,
    fontWeight: "900",
  },

  muted: {
    color: "#777",
    fontSize: 12,
    marginTop: 4,
  },

  categoryRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 14,
  },

  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#111115",
    borderWidth: 1,
    borderColor: "#24242a",
  },

  categoryText: {
    color: "#ddd",
    fontSize: 12,
    fontWeight: "700",
  },

  discoverList: {
    paddingHorizontal: 14,
    paddingBottom: 100,
  },

  profileContainer: {
    paddingBottom: 110,
  },

  profileTop: {
    alignItems: "center",
    paddingTop: 22,
    paddingHorizontal: 25,
  },

  profileAvatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: "#17171c",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#29292f",
  },

  profileAvatarImage: {
    width: "100%",
    height: "100%",
  },

  profileLetter: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
  },

  profileName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 13,
  },

  profileUsername: {
    color: "#777",
    marginTop: 3,
  },

  profileBio: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 19,
    maxWidth: 330,
  },

  editButton: {
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#35353c",
    borderRadius: 13,
    paddingHorizontal: 25,
    paddingVertical: 10,
  },

  editText: {
    color: "#fff",
    fontWeight: "800",
  },

  profileStats: {
    marginTop: 25,
    marginHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: "#101014",
    borderWidth: 1,
    borderColor: "#202025",
    flexDirection: "row",
    justifyContent: "space-around",
  },

  stat: {
    alignItems: "center",
  },

  statValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },

  statLabel: {
    color: "#666",
    fontSize: 10,
    marginTop: 4,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginHorizontal: 18,
    marginTop: 28,
    marginBottom: 12,
  },

  videoMini: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 9,
    borderRadius: 15,
    backgroundColor: "#101014",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#1d1d22",
  },

  miniCover: {
    width: 105,
    height: 70,
    borderRadius: 10,
  },

  miniFallback: {
    width: 105,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#19191d",
    alignItems: "center",
    justifyContent: "center",
  },

  miniInfo: {
    flex: 1,
    paddingLeft: 11,
    justifyContent: "center",
  },

  miniTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },

  miniStats: {
    color: "#777",
    fontSize: 10,
    marginTop: 6,
  },

  miniDate: {
    color: "#555",
    fontSize: 9,
    marginTop: 3,
  },

  socialButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  followButton: {
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 13,
    backgroundColor: "#fff",
  },

  followingButton: {
    backgroundColor: "#16161b",
    borderWidth: 1,
    borderColor: "#33333a",
  },

  followText: {
    color: "#000",
    fontWeight: "900",
  },

  followingText: {
    color: "#fff",
  },

  messageButton: {
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 13,
    backgroundColor: "#16161b",
    borderWidth: 1,
    borderColor: "#33333a",
  },

  messageButtonText: {
    color: "#fff",
    fontWeight: "800",
  },

  ownProfileNotice: {
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#111115",
  },

  ownProfileText: {
    color: "#666",
    fontSize: 11,
  },

  otherProfileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111115",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    color: "#fff",
    fontSize: 34,
    lineHeight: 35,
  },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    backgroundColor: "#0b0b0e",
    borderTopWidth: 1,
    borderTopColor: "#202025",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 9,
  },

  navItem: {
    alignItems: "center",
    width: 65,
  },

  navIcon: {
    color: "#555",
    fontSize: 21,
  },

  navIconActive: {
    color: "#fff",
  },

  navLabel: {
    color: "#555",
    fontSize: 9,
    marginTop: 4,
  },

  navLabelActive: {
    color: "#fff",
    fontWeight: "800",
  },

  messages: {},

  conversation: {
    marginHorizontal: 15,
    marginBottom: 8,
    padding: 13,
    borderRadius: 16,
    backgroundColor: "#101014",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1d1d22",
  },

  messageAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#202025",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  conversationInfo: {
    flex: 1,
    marginLeft: 12,
  },

  conversationName: {
    color: "#fff",
    fontWeight: "800",
  },

  conversationLast: {
    color: "#777",
    marginTop: 4,
    fontSize: 12,
  },

  time: {
    color: "#555",
    fontSize: 9,
  },

  chatHeader: {
    height: 68,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#202025",
    backgroundColor: "#0c0c0f",
  },

  chatBack: {
    width: 40,
  },

  chatUserInfo: {
    marginLeft: 10,
  },

  chatName: {
    color: "#fff",
    fontWeight: "800",
  },

  chatUsername: {
    color: "#666",
    fontSize: 10,
    marginTop: 2,
  },

  chatList: {
    padding: 15,
    paddingBottom: 20,
  },

  messageRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 8,
  },

  messageRowMine: {
    justifyContent: "flex-end",
  },

  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: "#16161b",
    borderBottomLeftRadius: 5,
  },

  messageBubbleMine: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 5,
  },

  messageText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 19,
  },

  messageTextMine: {
    color: "#000",
  },

  messageTime: {
    color: "#555",
    fontSize: 8,
    marginTop: 5,
  },

  messageTimeMine: {
    color: "#777",
  },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#202025",
    backgroundColor: "#0c0c0f",
  },

  composerInput: {
    flex: 1,
    minHeight: 45,
    maxHeight: 100,
    borderRadius: 16,
    backgroundColor: "#16161b",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  sendText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "900",
  },

  rewardsContainer: {
    padding: 18,
    paddingBottom: 120,
  },

  coinHero: {
    marginTop: 25,
    borderRadius: 24,
    backgroundColor: "#111115",
    borderWidth: 1,
    borderColor: "#24242a",
    padding: 30,
    alignItems: "center",
  },

  coinEmoji: {
    fontSize: 42,
  },

  coinAmount: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "900",
    marginTop: 8,
  },

  coinLabel: {
    color: "#777",
    marginTop: 3,
  },

  rewardCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 17,
    backgroundColor: "#101014",
    borderWidth: 1,
    borderColor: "#202025",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rewardTitle: {
    color: "#fff",
    fontWeight: "900",
  },

  rewardText: {
    color: "#777",
    marginTop: 5,
    fontSize: 11,
  },

  rewardAction: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },

  playerScreen: {
    flex: 1,
    backgroundColor: "#000",
  },

  playerHeader: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#08080a",
  },

  playerBack: {
    width: 42,
  },

  playerHeaderTitle: {
    flex: 1,
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  player: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
  },

  video: {
    width: "100%",
    height: "100%",
  },

  playerEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  playerEmptyIcon: {
    color: "#555",
    fontSize: 40,
  },

  playerEmptyText: {
    color: "#777",
    marginTop: 10,
  },

  playerContent: {
    padding: 17,
    paddingBottom: 100,
  },

  playerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },

  playerDescription: {
    color: "#999",
    marginTop: 10,
    lineHeight: 20,
  },

  playerStats: {
    flexDirection: "row",
    gap: 18,
    marginTop: 14,
  },

  playerStat: {
    color: "#666",
    fontSize: 11,
  },

  playerCreator: {
    marginTop: 20,
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#111115",
    flexDirection: "row",
    alignItems: "center",
  },

  playerCreatorName: {
    color: "#fff",
    fontWeight: "800",
    marginLeft: 11,
  },

  playerCreatorHandle: {
    color: "#666",
    fontSize: 10,
    marginLeft: 11,
    marginTop: 2,
  },

  chevron: {
    color: "#777",
    fontSize: 28,
  },

  playerActions: {
    marginTop: 17,
    flexDirection: "row",
    justifyContent: "space-around",
  },

  playerAction: {
    alignItems: "center",
  },

  playerActionIcon: {
    color: "#ddd",
    fontSize: 23,
  },

  playerActionLabel: {
    color: "#666",
    fontSize: 9,
    marginTop: 5,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.72)",
    justifyContent: "flex-end",
  },

  commentsSheet: {
    height: "78%",
    backgroundColor: "#0c0c0f",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 10,
  },

  coinSheet: {
    backgroundColor: "#0c0c0f",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 18,
    paddingBottom: 35,
  },

  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333",
    alignSelf: "center",
  },

  sheetHeader: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sheetTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "900",
  },

  close: {
    color: "#aaa",
    fontSize: 30,
  },

  commentsList: {
    paddingHorizontal: 15,
    paddingBottom: 80,
  },

  commentRow: {
    flexDirection: "row",
    marginBottom: 15,
  },

  commentAvatar: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "#1c1c21",
    alignItems: "center",
    justifyContent: "center",
  },

  commentBody: {
    flex: 1,
    marginLeft: 10,
  },

  commentUser: {
    color: "#ddd",
    fontSize: 11,
    fontWeight: "800",
  },

  commentText: {
    color: "#fff",
    fontSize: 13,
    marginTop: 3,
  },

  commentTime: {
    color: "#555",
    fontSize: 9,
    marginTop: 4,
  },

  commentLike: {
    color: "#777",
    fontSize: 10,
    marginLeft: 5,
  },

  commentComposer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    backgroundColor: "#0c0c0f",
    borderTopWidth: 1,
    borderTopColor: "#202025",
    flexDirection: "row",
  },

  commentInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 15,
    backgroundColor: "#17171c",
    color: "#fff",
    paddingHorizontal: 13,
  },

  commentSend: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 7,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  coinPackage: {
    marginTop: 10,
    padding: 17,
    borderRadius: 15,
    backgroundColor: "#151519",
    borderWidth: 1,
    borderColor: "#29292f",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  packageCoins: {
    color: "#fff",
    fontWeight: "900",
  },

  packagePrice: {
    color: "#aaa",
    fontWeight: "800",
  },

  loginBox: {
    margin: 20,
    padding: 22,
    borderRadius: 22,
    backgroundColor: "#101014",
    borderWidth: 1,
    borderColor: "#28282d",
  },

  loginInput: {
    marginTop: 20,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#18181d",
    color: "#fff",
    paddingHorizontal: 14,
  },

  primaryButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  primaryText: {
    color: "#000",
    fontWeight: "900",
  },

  creatorModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "flex-end",
  },

  creatorSubmitModal: {
    backgroundColor: "#101010",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 28,
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: "#292929",
  },

  creatorModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  creatorModalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },

  creatorModalSubtitle: {
    color: "#777",
    fontSize: 11,
    marginTop: 4,
  },

  creatorModalClose: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#1b1b1b",
    alignItems: "center",
    justifyContent: "center",
  },

  creatorModalCloseText: {
    color: "#fff",
    fontSize: 28,
    lineHeight: 30,
  },

  creatorPrizeBanner: {
    backgroundColor: "#181818",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#292929",
  },

  creatorPrizeText: {
    color: "#f5c542",
    fontSize: 14,
    fontWeight: "900",
  },

  creatorPrizeSubtext: {
    color: "#777",
    fontSize: 11,
    marginTop: 4,
  },

  creatorModalSection: {
    color: "#777",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
  },

  creatorNoVideoCard: {
    backgroundColor: "#171717",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },

  creatorNoVideoTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  creatorNoVideoText: {
    color: "#777",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  creatorVideoChoice: {
    width: 145,
    marginRight: 12,
    padding: 7,
    borderRadius: 17,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#252525",
  },

  creatorVideoChoiceSelected: {
    borderColor: "#fff",
    backgroundColor: "#202020",
  },

  creatorVideoThumb: {
    width: "100%",
    height: 115,
    borderRadius: 12,
    backgroundColor: "#222",
  },

  creatorVideoThumbFallback: {
    width: "100%",
    height: 115,
    borderRadius: 12,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },

  creatorVideoChoiceTitle: {
    color: "#eee",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8,
    minHeight: 30,
  },

  creatorSelectedBadge: {
    marginTop: 7,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 5,
    alignItems: "center",
  },

  creatorSelectedBadgeText: {
    color: "#111",
    fontSize: 9,
    fontWeight: "900",
  },

  creatorDescriptionInput: {
    minHeight: 85,
    maxHeight: 120,
    backgroundColor: "#181818",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#292929",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
    fontSize: 12,
    marginBottom: 14,
  },

  creatorSubmitButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  creatorSubmitButtonDisabled: {
    opacity: 0.45,
  },

  creatorSubmitButtonText: {
    color: "#111",
    fontSize: 12,
    fontWeight: "900",
  },

  creatorChallengeModal: {
    backgroundColor: "#101010",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 28,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "#292929",
  },

  creatorChallengeHero: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  creatorChallengeHeroBlock: {
    flex: 1,
    backgroundColor: "#181818",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#292929",
  },

  creatorChallengeHeroLabel: {
    color: "#777",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  creatorChallengeHeroValue: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 6,
  },

  creatorCountdownCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171717",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#292929",
  },

  creatorCountdownIcon: {
    fontSize: 25,
    marginRight: 13,
  },

  creatorCountdownLabel: {
    color: "#777",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  creatorCountdownValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
  },

  creatorChallengeStats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  creatorChallengeStat: {
    flex: 1,
    backgroundColor: "#151515",
    borderRadius: 15,
    padding: 13,
    borderWidth: 1,
    borderColor: "#242424",
  },

  creatorChallengeStatValue: {
    color: "#eee",
    fontSize: 14,
    fontWeight: "900",
  },

  creatorChallengeStatLabel: {
    color: "#666",
    fontSize: 9,
    marginTop: 4,
  },

  creatorChallengeDescription: {
    color: "#aaa",
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 20,
  },

  creatorRulesTitle: {
    color: "#777",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
  },

  creatorRuleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  creatorRuleNumber: {
    color: "#f5c542",
    fontSize: 10,
    fontWeight: "900",
    width: 32,
  },

  creatorRuleText: {
    flex: 1,
    color: "#aaa",
    fontSize: 11,
    lineHeight: 17,
  },

  creatorChallengeJoinButton: {
    height: 54,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  creatorChallengeJoinText: {
    color: "#111",
    fontSize: 12,
    fontWeight: "900",
  },

  creatorHubButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171717",
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#292929",
  },

  creatorHubButtonIcon: {
    fontSize: 25,
    marginRight: 13,
  },

  creatorHubButtonTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },

  creatorHubButtonText: {
    color: "#777",
    fontSize: 10,
    marginTop: 4,
  },

  creatorHubButtonArrow: {
    color: "#fff",
    fontSize: 27,
    marginLeft: 10,
  },

  screen: { flex: 1, backgroundColor: "#0b0b0b" },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14 },

  topTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },

  refreshButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#181818", alignItems: "center", justifyContent: "center" },

  refreshText: { color: "#fff", fontSize: 25, fontWeight: "700" },

  creatorHubContent: {
    padding: 18,
    paddingBottom: 40,
  },

  creatorHero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171717",
    borderRadius: 22,
    padding: 18,
    marginBottom: 24,
  },

  creatorHeroEmoji: {
    fontSize: 34,
    marginRight: 14,
  },

  creatorHeroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },

  creatorHeroText: {
    color: "#999",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  creatorStatsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },

  creatorStatCard: {
    flex: 1,
    backgroundColor: "#151515",
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: "#252525",
  },

  creatorStatValue: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },

  creatorStatLabel: {
    color: "#777",
    fontSize: 11,
    marginTop: 5,
  },

  creatorEmptyCard: {
    backgroundColor: "#141414",
    borderRadius: 18,
    padding: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#242424",
  },

  creatorEmptyTitle: {
    color: "#ddd",
    fontSize: 15,
    fontWeight: "800",
  },

  creatorEmptyText: {
    color: "#777",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },

  challengeCard: {
    backgroundColor: "#161616",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#282828",
  },

  challengeTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },

  challengeDescription: {
    color: "#888",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },

  challengeMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    marginBottom: 14,
  },

  challengePrize: {
    color: "#f5c542",
    fontSize: 13,
    fontWeight: "800",
  },

  challengeEntries: {
    color: "#888",
    fontSize: 12,
  },

  challengeButton: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },

  challengeButtonText: {
    color: "#111",
    fontSize: 12,
    fontWeight: "900",
  },

  creatorAnalyticsCard: {
  backgroundColor: "#151515",
  borderRadius: 22,
  padding: 16,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: "#292929",
},

creatorAnalyticsGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
},

creatorMetric: {
  width: "48%",
  backgroundColor: "#1a1a1a",
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: "#252525",
},

creatorMetricIcon: {
  fontSize: 17,
},

creatorMetricValue: {
  color: "#fff",
  fontSize: 18,
  fontWeight: "900",
  marginTop: 6,
},

creatorMetricLabel: {
  color: "#666",
  fontSize: 10,
  marginTop: 3,
},

creatorEngagementCard: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#1a1a1a",
  borderRadius: 16,
  padding: 15,
  marginTop: 10,
  borderWidth: 1,
  borderColor: "#252525",
},

creatorEngagementLabel: {
  color: "#777",
  fontSize: 9,
  fontWeight: "900",
  letterSpacing: 1,
},

creatorEngagementValue: {
  color: "#fff",
  fontSize: 23,
  fontWeight: "900",
  marginTop: 4,
},

creatorEngagementIcon: {
  fontSize: 30,
  marginLeft: 10,
},

creatorBestVideo: {
  backgroundColor: "#1a1a1a",
  borderRadius: 16,
  padding: 15,
  marginTop: 10,
  borderWidth: 1,
  borderColor: "#252525",
},

creatorBestLabel: {
  color: "#f5c542",
  fontSize: 9,
  fontWeight: "900",
  letterSpacing: 1,
},

creatorPaymentModal: { width: "94%", maxHeight: "88%", borderRadius: 26, backgroundColor: "#111", padding: 20, borderWidth: 1, borderColor: "#2b2b2b" },
creatorPaymentFormLabel: { color: "#777", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginTop: 12, marginBottom: 8 },
creatorPaymentOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
creatorPaymentOption: { width: "31%", minHeight: 72, borderRadius: 15, backgroundColor: "#1b1b1b", borderWidth: 1, borderColor: "#292929", alignItems: "center", justifyContent: "center", padding: 8 },
creatorPaymentOptionActive: { backgroundColor: "#222", borderColor: "#8fffba" },
creatorPaymentOptionIcon: { fontSize: 21, marginBottom: 5 },
creatorPaymentOptionText: { color: "#999", fontSize: 11, fontWeight: "800", textAlign: "center" },
creatorPaymentOptionTextActive: { color: "#fff" },
creatorPaymentInput: { minHeight: 50, borderRadius: 14, backgroundColor: "#1b1b1b", borderWidth: 1, borderColor: "#292929", color: "#fff", paddingHorizontal: 14, fontSize: 14, marginBottom: 6 },
creatorPaymentSecurityNote: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 13, marginTop: 14, marginBottom: 16, borderRadius: 15, backgroundColor: "#171717", borderWidth: 1, borderColor: "#252525" },
creatorPaymentSecurityIcon: { fontSize: 16 },
creatorPaymentSecurityText: { flex: 1, color: "#777", fontSize: 11, lineHeight: 17 },
creatorPaymentSaveButton: { minHeight: 52, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", marginBottom: 9 },
creatorPaymentSaveButtonDisabled: { opacity: 0.55 },
creatorPaymentSaveText: { color: "#111", fontSize: 14, fontWeight: "900" },
creatorPaymentCancelButton: { minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#1b1b1b" },
creatorPaymentCancelText: { color: "#aaa", fontSize: 13, fontWeight: "800" },
creatorPaymentCard: { marginBottom: 18, padding: 18, borderRadius: 22, backgroundColor: "#151515", borderWidth: 1, borderColor: "#292929" },
  creatorPaymentTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  creatorPaymentSubtitle: { color: "#888", fontSize: 13, lineHeight: 19, marginBottom: 16 },
  creatorPaymentEmpty: { alignItems: "center", paddingVertical: 18 },
  creatorPaymentEmptyIcon: { width: 42, height: 42, borderRadius: 21, textAlign: "center", textAlignVertical: "center", backgroundColor: "#222", color: "#fff", fontSize: 26, fontWeight: "300", marginBottom: 10 },
  creatorPaymentEmptyTitle: { color: "#ddd", fontSize: 15, fontWeight: "800", marginBottom: 5 },
  creatorPaymentEmptyText: { color: "#777", fontSize: 12, lineHeight: 18, textAlign: "center", maxWidth: 280 },
  creatorPaymentMethod: { padding: 14, borderRadius: 16, backgroundColor: "#1d1d1d", marginBottom: 10, borderWidth: 1, borderColor: "#2b2b2b" },
  creatorPaymentMethodName: { color: "#fff", fontSize: 15, fontWeight: "800", textTransform: "capitalize", marginBottom: 5 },
  creatorPaymentDestination: { color: "#999", fontSize: 13, marginBottom: 8 },
  creatorPaymentDefaultText: { color: "#8fffba", fontSize: 10, fontWeight: "900", letterSpacing: 1, marginBottom: 8 },
  creatorPaymentAddButton: { marginTop: 6, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#222", borderWidth: 1, borderColor: "#333" },
  creatorPaymentAddText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  creatorBestTitle: {
  color: "#eee",
  fontSize: 13,
  fontWeight: "800",
  marginTop: 7,
},

creatorBestViews: {
  color: "#666",
  fontSize: 10,
  marginTop: 4,
},

creatorXpCard: {
  backgroundColor: "#151515",
  borderRadius: 22,
  padding: 18,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: "#292929",
},

creatorXpHeader: {
  flexDirection: "row",
  alignItems: "center",
},

creatorXpLabel: {
  color: "#777",
  fontSize: 9,
  fontWeight: "900",
  letterSpacing: 1,
},

creatorXpLevel: {
  color: "#fff",
  fontSize: 22,
  fontWeight: "900",
  marginTop: 5,
},

creatorXpBadge: {
  backgroundColor: "#202020",
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderWidth: 1,
  borderColor: "#303030",
},

creatorXpBadgeText: {
  color: "#f5c542",
  fontSize: 10,
  fontWeight: "900",
},

creatorXpTrack: {
  height: 9,
  backgroundColor: "#282828",
  borderRadius: 10,
  overflow: "hidden",
  marginTop: 18,
},

creatorXpFill: {
  height: "100%",
  backgroundColor: "#fff",
  borderRadius: 10,
},

creatorXpFooter: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 8,
},

creatorXpFooterText: {
  color: "#666",
  fontSize: 9,
},

creatorWalletCard: {
  backgroundColor: "#151515",
  borderRadius: 22,
  padding: 18,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: "#292929",
},

creatorWalletActions: {
  marginTop: 16,
  gap: 12,
},
creatorWalletPending: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 13,
  paddingVertical: 10,
  borderRadius: 13,
  backgroundColor: "#1b1b1b",
},
creatorWalletPendingLabel: {
  color: "#777",
  fontSize: 10,
  fontWeight: "900",
  letterSpacing: 1,
},
creatorWalletPendingAmount: {
  color: "#aaa",
  fontSize: 13,
  fontWeight: "800",
},
creatorPayoutButton: {
  minHeight: 50,
  borderRadius: 15,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#fff",
},
creatorPayoutButtonDisabled: {
  opacity: 0.45,
},
creatorPayoutButtonText: {
  color: "#111",
  fontSize: 14,
  fontWeight: "900",
},
creatorPayoutAvailable: {
  color: "#fff",
  fontSize: 30,
  fontWeight: "900",
  marginBottom: 4,
},
creatorPayoutMethod: {
  flexDirection: "row",
  alignItems: "center",
  padding: 14,
  borderRadius: 16,
  backgroundColor: "#1b1b1b",
  borderWidth: 1,
  borderColor: "#292929",
  marginBottom: 9,
},
creatorPayoutMethodActive: {
  borderColor: "#8fffba",
  backgroundColor: "#202020",
},
creatorPayoutMethodName: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "900",
  textTransform: "capitalize",
  marginBottom: 4,
},
creatorPayoutMethodDestination: {
  color: "#888",
  fontSize: 12,
  marginBottom: 5,
},
creatorPayoutRadio: {
  width: 22,
  height: 22,
  borderRadius: 11,
  borderWidth: 2,
  borderColor: "#555",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 12,
},
creatorPayoutRadioActive: {
  borderColor: "#8fffba",
},
creatorPayoutRadioDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#8fffba",
},
creatorWalletMain: {
  flex: 1,
},

creatorWalletLabel: {
  color: "#777",
  fontSize: 9,
  fontWeight: "900",
  letterSpacing: 1,
},

creatorWalletAmount: {
  color: "#fff",
  fontSize: 30,
  fontWeight: "900",
  marginTop: 6,
},

creatorWalletHint: {
  color: "#666",
  fontSize: 10,
  marginTop: 5,
},

creatorWalletDivider: {
  height: 1,
  backgroundColor: "#292929",
  marginVertical: 16,
},

creatorWalletStats: {
  flexDirection: "row",
  justifyContent: "space-between",
},

creatorWalletSmallValue: {
  color: "#eee",
  fontSize: 15,
  fontWeight: "900",
},

creatorWalletSmallLabel: {
  color: "#666",
  fontSize: 9,
  marginTop: 4,
},

creatorVideoCountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151515",
    borderRadius: 18,
    padding: 18,
    marginBottom: 8,
  },

  creatorVideoCount: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginRight: 14,
  },

  creatorVideoText: {
    color: "#888",
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },

  creatorSubmissionCard: {
  backgroundColor: "#151515",
  borderRadius: 20,
  padding: 16,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: "#292929",
},

creatorSubmissionHeader: {
  flexDirection: "row",
  alignItems: "center",
},

creatorSubmissionDate: {
  color: "#555",
  fontSize: 9,
  marginTop: 4,
},

creatorStatusBadge: {
  borderRadius: 10,
  paddingHorizontal: 9,
  paddingVertical: 6,
  marginLeft: 8,
},

creatorStatusPending: {
  backgroundColor: "#252525",
},

creatorStatusApproved: {
  backgroundColor: "#202820",
},

creatorStatusRejected: {
  backgroundColor: "#281d1d",
},

creatorStatusWinner: {
  backgroundColor: "#2a2414",
},

creatorStatusText: {
  color: "#ddd",
  fontSize: 8,
  fontWeight: "900",
},

creatorSubmissionTimeline: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 18,
  marginBottom: 14,
},

creatorTimelineStep: {
  alignItems: "center",
},

creatorTimelineDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#333",
},

creatorTimelineDotActive: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#fff",
},

creatorTimelineLine: {
  flex: 1,
  height: 1,
  backgroundColor: "#292929",
  marginHorizontal: 7,
},

creatorTimelineLineActive: {
  backgroundColor: "#666",
},

creatorTimelineText: {
  color: "#666",
  fontSize: 8,
  marginTop: 5,
},

creatorSubmissionInfo: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#1a1a1a",
  borderRadius: 12,
  padding: 11,
  marginTop: 2,
},

creatorSubmissionInfoLabel: {
  color: "#666",
  fontSize: 9,
  fontWeight: "900",
},

creatorSubmissionScore: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "900",
},

creatorModerationNote: {
  backgroundColor: "#1a1a1a",
  borderRadius: 12,
  padding: 12,
  marginTop: 10,
},

creatorModerationNoteLabel: {
  color: "#666",
  fontSize: 8,
  fontWeight: "900",
  letterSpacing: 1,
},

creatorModerationNoteText: {
  color: "#aaa",
  fontSize: 10,
  lineHeight: 16,
  marginTop: 5,
},

creatorAwardBanner: {
  backgroundColor: "#211d10",
  borderRadius: 12,
  padding: 11,
  marginTop: 10,
  borderWidth: 1,
  borderColor: "#3a3218",
},

creatorAwardText: {
  color: "#f5c542",
  fontSize: 10,
  fontWeight: "900",
  textAlign: "center",
},

submissionCard: {
    backgroundColor: "#151515",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#242424",
  },

  submissionTitle: {
    color: "#eee",
    fontSize: 14,
    fontWeight: "800",
  },

  submissionStatus: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 7,
  },

  submissionNote: {
    color: "#777",
    fontSize: 11,
    marginTop: 7,
    lineHeight: 16,
  },

  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151515",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },

  leaderboardRank: {
    color: "#f5c542",
    width: 42,
    fontSize: 13,
    fontWeight: "900",
  },

  leaderboardName: {
    color: "#eee",
    fontSize: 13,
    fontWeight: "800",
  },

  leaderboardLevel: {
    color: "#777",
    fontSize: 10,
    marginTop: 3,
  },

  leaderboardXp: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },

  cancelText: {
    color: "#777",
    textAlign: "center",
    marginTop: 16,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  empty: {
    padding: 40,
    alignItems: "center",
  },

  emptyIcon: {
    color: "#333",
    fontSize: 42,
  },

  emptyTitle: {
    color: "#ddd",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 10,
  },

  emptyText: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});
