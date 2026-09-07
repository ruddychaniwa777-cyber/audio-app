import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type GameKey =
  | "DOORS"
  | "NIGHT"
  | "LOVE"
  | "FASHION"
  | "CAFE"
  | "ISLAND"
  | "MANSION"
  | "SCHOOL"
  | "CITY"
  | "FOREST"
  | "HOSPITAL"
  | "TRAIN"
  | "HOTEL"
  | "PRISON"
  | "SPACE"
  | "UNDERWATER"
  | "KINGDOM"
  | "CIRCUS"
  | "ZOMBIE"
  | "DREAM";

type Choice = {
  id: number;
  title: string;
  emoji: string;
  description: string;
};

export type GameDefinition = {
  key: GameKey;
  emoji: string;
  title: string;
  subtitle: string;
  category: string;
};

export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    key: "DOORS",
    emoji: "🚪",
    title: "DOORS",
    subtitle: "Choose What Comes Next",
    category: "Horror & Mystery",
  },
  {
    key: "NIGHT",
    emoji: "🌙",
    title: "NIGHT",
    subtitle: "Survive Until Morning",
    category: "Survival",
  },
  {
    key: "LOVE",
    emoji: "❤️",
    title: "LOVE",
    subtitle: "Every Choice Changes Everything",
    category: "Drama",
  },
  {
    key: "FASHION",
    emoji: "👗",
    title: "FASHION",
    subtitle: "Style or Disaster",
    category: "Fashion",
  },
  {
    key: "CAFE",
    emoji: "☕",
    title: "CAFE",
    subtitle: "The Midnight Café",
    category: "Time & Strategy",
  },
  {
    key: "ISLAND",
    emoji: "🏝️",
    title: "ISLAND",
    subtitle: "Lost With No Way Home",
    category: "Survival",
  },
  {
    key: "MANSION",
    emoji: "🏚️",
    title: "MANSION",
    subtitle: "Something Is Inside",
    category: "Horror",
  },
  {
    key: "SCHOOL",
    emoji: "🏫",
    title: "SCHOOL",
    subtitle: "After-School Secrets",
    category: "Mystery",
  },
  {
    key: "CITY",
    emoji: "🌆",
    title: "CITY",
    subtitle: "Nobody Knows You Here",
    category: "Adventure",
  },
  {
    key: "FOREST",
    emoji: "🌲",
    title: "FOREST",
    subtitle: "Whispers Between The Trees",
    category: "Horror",
  },
  {
    key: "HOSPITAL",
    emoji: "🏥",
    title: "HOSPITAL",
    subtitle: "The Night Shift",
    category: "Horror",
  },
  {
    key: "TRAIN",
    emoji: "🚆",
    title: "TRAIN",
    subtitle: "The Last Train",
    category: "Mystery",
  },
  {
    key: "HOTEL",
    emoji: "🏨",
    title: "HOTEL",
    subtitle: "Room 2000",
    category: "Mystery",
  },
  {
    key: "PRISON",
    emoji: "⛓️",
    title: "PRISON",
    subtitle: "Escape Protocol",
    category: "Strategy",
  },
  {
    key: "SPACE",
    emoji: "🚀",
    title: "SPACE",
    subtitle: "Lost Beyond Earth",
    category: "Sci-Fi",
  },
  {
    key: "UNDERWATER",
    emoji: "🌊",
    title: "UNDERWATER",
    subtitle: "Below The Surface",
    category: "Survival",
  },
  {
    key: "KINGDOM",
    emoji: "👑",
    title: "KINGDOM",
    subtitle: "Build Or Lose Everything",
    category: "Strategy",
  },
  {
    key: "CIRCUS",
    emoji: "🎪",
    title: "CIRCUS",
    subtitle: "The Silent Circus",
    category: "Horror",
  },
  {
    key: "ZOMBIE",
    emoji: "🧟",
    title: "ZOMBIE",
    subtitle: "Zero Hour",
    category: "Survival",
  },
  {
    key: "DREAM",
    emoji: "🌀",
    title: "DREAM",
    subtitle: "Never Wake Up",
    category: "Psychological",
  },
];

const CHOICES: Record<GameKey, Choice[][]> = {
  DOORS: [
    [
      {
        id: 0,
        emoji: "🚪",
        title: "Red Door",
        description: "Something is breathing behind it.",
      },
      {
        id: 1,
        emoji: "🚪",
        title: "Black Door",
        description: "There is no handle.",
      },
      {
        id: 2,
        emoji: "🚪",
        title: "White Door",
        description: "A light shines underneath.",
      },
    ],
  ],

  NIGHT: [
    [
      {
        id: 0,
        emoji: "🔦",
        title: "Check the hallway",
        description: "The lights just went out.",
      },
      {
        id: 1,
        emoji: "🛏️",
        title: "Hide under the bed",
        description: "You hear footsteps approaching.",
      },
      {
        id: 2,
        emoji: "🪟",
        title: "Look outside",
        description: "Someone is standing in the garden.",
      },
    ],
  ],

  LOVE: [
    [
      {
        id: 0,
        emoji: "💬",
        title: "Tell the truth",
        description: "You finally reveal the secret.",
      },
      {
        id: 1,
        emoji: "🤫",
        title: "Keep quiet",
        description: "Some secrets are dangerous.",
      },
      {
        id: 2,
        emoji: "❤️",
        title: "Follow your heart",
        description: "You make a risky decision.",
      },
    ],
  ],

  FASHION: [
    [
      {
        id: 0,
        emoji: "👗",
        title: "Elegant Outfit",
        description: "Perfect for the red carpet.",
      },
      {
        id: 1,
        emoji: "🧥",
        title: "Street Style",
        description: "Bold and unpredictable.",
      },
      {
        id: 2,
        emoji: "👟",
        title: "Sport Look",
        description: "Comfort comes first.",
      },
    ],
  ],

  CAFE: [
    [
      {
        id: 0,
        emoji: "☕",
        title: "Serve Coffee",
        description: "The customer is waiting.",
      },
      {
        id: 1,
        emoji: "🍰",
        title: "Serve Cake",
        description: "The order is unusual.",
      },
      {
        id: 2,
        emoji: "🧾",
        title: "Check the Order",
        description: "Something doesn't look right.",
      },
    ],
  ],

  ISLAND: [
    [
      {
        id: 0,
        emoji: "💧",
        title: "Find Water",
        description: "Your supplies are almost gone.",
      },
      {
        id: 1,
        emoji: "🌴",
        title: "Explore the Beach",
        description: "You see footprints in the sand.",
      },
      {
        id: 2,
        emoji: "🔥",
        title: "Build a Fire",
        description: "Night is approaching.",
      },
    ],
  ],

  MANSION: [
    [
      {
        id: 0,
        emoji: "🔑",
        title: "Take the Key",
        description: "It is covered in dust.",
      },
      {
        id: 1,
        emoji: "🕯️",
        title: "Light the Candle",
        description: "The room becomes visible.",
      },
      {
        id: 2,
        emoji: "🪜",
        title: "Go Upstairs",
        description: "A door slowly closes above you.",
      },
    ],
  ],

  SCHOOL: [
    [
      {
        id: 0,
        emoji: "📚",
        title: "Check the Library",
        description: "A book has been left open.",
      },
      {
        id: 1,
        emoji: "🔔",
        title: "Follow the Bell",
        description: "Nobody else heard it.",
      },
      {
        id: 2,
        emoji: "🚪",
        title: "Enter Classroom 13",
        description: "That classroom should not exist.",
      },
    ],
  ],

  CITY: [
    [
      {
        id: 0,
        emoji: "🚕",
        title: "Take a Taxi",
        description: "The driver knows your name.",
      },
      {
        id: 1,
        emoji: "🚶",
        title: "Walk",
        description: "The street suddenly becomes empty.",
      },
      {
        id: 2,
        emoji: "🚇",
        title: "Enter the Subway",
        description: "The next train has no destination.",
      },
    ],
  ],

  FOREST: [
    [
      {
        id: 0,
        emoji: "🔥",
        title: "Stay Near the Fire",
        description: "Something moves beyond the trees.",
      },
      {
        id: 1,
        emoji: "🌲",
        title: "Follow the Trail",
        description: "The footprints are fresh.",
      },
      {
        id: 2,
        emoji: "🏕️",
        title: "Return to Camp",
        description: "Your tent is no longer there.",
      },
    ],
  ],

  HOSPITAL: [
    [
      {
        id: 0,
        emoji: "🩺",
        title: "Check Room 7",
        description: "The monitor is still running.",
      },
      {
        id: 1,
        emoji: "🛗",
        title: "Take the Elevator",
        description: "The buttons have changed.",
      },
      {
        id: 2,
        emoji: "🚨",
        title: "Follow the Alarm",
        description: "The emergency lights turn red.",
      },
    ],
  ],

  TRAIN: [
    [
      {
        id: 0,
        emoji: "🚪",
        title: "Change Carriages",
        description: "Nobody is sitting in the next carriage.",
      },
      {
        id: 1,
        emoji: "🪑",
        title: "Stay Seated",
        description: "Someone takes the seat beside you.",
      },
      {
        id: 2,
        emoji: "🚉",
        title: "Pull the Emergency Brake",
        description: "The train is not moving anymore.",
      },
    ],
  ],

  HOTEL: [
    [
      {
        id: 0,
        emoji: "🔑",
        title: "Room 13",
        description: "Your key says 13.",
      },
      {
        id: 1,
        emoji: "🛎️",
        title: "Call Reception",
        description: "Someone answers before you call.",
      },
      {
        id: 2,
        emoji: "🛗",
        title: "Use the Elevator",
        description: "There is no floor button.",
      },
    ],
  ],

  PRISON: [
    [
      {
        id: 0,
        emoji: "🔧",
        title: "Find a Tool",
        description: "The guard is distracted.",
      },
      {
        id: 1,
        emoji: "🕳️",
        title: "Check the Tunnel",
        description: "Cold air comes from below.",
      },
      {
        id: 2,
        emoji: "👮",
        title: "Talk to the Guard",
        description: "He knows something.",
      },
    ],
  ],

  SPACE: [
    [
      {
        id: 0,
        emoji: "🚀",
        title: "Repair the Engine",
        description: "The ship is losing power.",
      },
      {
        id: 1,
        emoji: "🛰️",
        title: "Contact the Station",
        description: "Someone answers.",
      },
      {
        id: 2,
        emoji: "🌌",
        title: "Enter the Unknown Zone",
        description: "The instruments stop working.",
      },
    ],
  ],

  UNDERWATER: [
    [
      {
        id: 0,
        emoji: "🫧",
        title: "Surface",
        description: "Your oxygen is running low.",
      },
      {
        id: 1,
        emoji: "🔦",
        title: "Explore the Wreck",
        description: "A light is visible inside.",
      },
      {
        id: 2,
        emoji: "🐙",
        title: "Follow the Creature",
        description: "It seems to be leading you somewhere.",
      },
    ],
  ],

  KINGDOM: [
    [
      {
        id: 0,
        emoji: "⚔️",
        title: "Prepare the Army",
        description: "An enemy approaches.",
      },
      {
        id: 1,
        emoji: "🤝",
        title: "Send a Diplomat",
        description: "Peace may still be possible.",
      },
      {
        id: 2,
        emoji: "🏰",
        title: "Defend the Castle",
        description: "The gates are under attack.",
      },
    ],
  ],

  CIRCUS: [
    [
      {
        id: 0,
        emoji: "🎭",
        title: "Enter the Tent",
        description: "The audience is completely silent.",
      },
      {
        id: 1,
        emoji: "🎠",
        title: "Ride the Carousel",
        description: "It starts moving by itself.",
      },
      {
        id: 2,
        emoji: "🤡",
        title: "Follow the Clown",
        description: "He keeps looking behind you.",
      },
    ],
  ],

  ZOMBIE: [
    [
      {
        id: 0,
        emoji: "🔫",
        title: "Defend the Shelter",
        description: "Something is approaching.",
      },
      {
        id: 1,
        emoji: "🚗",
        title: "Find a Vehicle",
        description: "You need to leave before dark.",
      },
      {
        id: 2,
        emoji: "🥫",
        title: "Search for Supplies",
        description: "The building looks abandoned.",
      },
    ],
  ],

  DREAM: [
    [
      {
        id: 0,
        emoji: "🚪",
        title: "Open the Door",
        description: "You have seen this door before.",
      },
      {
        id: 1,
        emoji: "🪞",
        title: "Look in the Mirror",
        description: "Your reflection moves first.",
      },
      {
        id: 2,
        emoji: "🌀",
        title: "Follow the Spiral",
        description: "The room begins changing.",
      },
    ],
  ],
};

function hashString(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function getLevelSeed(game: GameKey, level: number): number {
  return hashString(`${game}:${level}:POCKET-RIVALS`);
}

function getChoices(game: GameKey, level: number): Choice[] {
  const base = CHOICES[game][0];

  const seed = getLevelSeed(game, level);

  return base.map((choice, index) => ({
    ...choice,
    id: index,
    title:
      level > 1
        ? `${choice.title} ${((seed + index) % 9) + 1}`
        : choice.title,
  }));
}

function getCorrectChoice(game: GameKey, level: number): number {
  const seed = getLevelSeed(game, level);

  return seed % 3;
}

function getDifficulty(level: number): string {
  if (level < 10) return "BEGINNER";
  if (level < 50) return "EASY";
  if (level < 250) return "NORMAL";
  if (level < 750) return "HARD";
  if (level < 1500) return "EXTREME";
  return "NIGHTMARE";
}

function requiresAd(level: number): boolean {
  if (level <= 3) return false;

  return level % 5 === 0;
}

function getReward(level: number): number {
  return 25 + Math.min(100, Math.floor(level / 25) * 5);
}

type Props = {
  game: GameKey;
  coins: number;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
  onBack: () => void;
  watchRewardedAd?: (onReward?: () => void) => Promise<boolean>;
};

export function PocketGameScreen({
  game,
  coins,
  setCoins,
  onBack,
  watchRewardedAd,
}: Props) {
  const definition = GAME_DEFINITIONS.find((item) => item.key === game)!;

  const [level, setLevel] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  const choices = useMemo(
    () => getChoices(game, level),
    [game, level]
  );

  const correctChoice = getCorrectChoice(game, level);
  const difficulty = getDifficulty(level);
  const reward = getReward(level);

  const continueToNextLevel = () => {
    setFeedback("");
    setLevel((current) => current + 1);
  };

  const completeLevel = () => {
    setCoins((current) => current + reward);

    if (requiresAd(level)) {
      Alert.alert(
        "🔒 Next Level",
        `Level ${level + 1} requires a quick unlock.`,
        [
          {
            text: "Watch Ad 🎬",
            onPress: async () => {
              if (!watchRewardedAd) {
                Alert.alert(
                  "Ads unavailable",
                  "Rewarded ads are not connected yet."
                );
                return;
              }

              setBusy(true);

              const shown = await watchRewardedAd(() => {
                setBusy(false);
                continueToNextLevel();
              });

              if (!shown) {
                setBusy(false);
              }
            },
          },
          {
            text: "Use 50 Coins 🪙",
            onPress: () => {
              if (coins < 50) {
                Alert.alert(
                  "Not enough coins",
                  "You need 50 coins to unlock the next level."
                );
                return;
              }

              setCoins((current) => current - 50);
              continueToNextLevel();
            },
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );

      return;
    }

    continueToNextLevel();
  };

  const choose = (choiceId: number) => {
    if (busy) return;

    if (choiceId === correctChoice) {
      setFeedback(
        `✅ Correct! +${reward} coins`
      );

      setTimeout(() => {
        completeLevel();
      }, 350);

      return;
    }

    setFeedback(
      "❌ Wrong choice. Try again — the correct path is still possible."
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Games</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.gameEmoji}>{definition.emoji}</Text>

          <Text style={styles.title}>
            {definition.title}
          </Text>

          <Text style={styles.subtitle}>
            {definition.subtitle}
          </Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {definition.category}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>LEVEL</Text>
            <Text style={styles.statValue}>
              {level.toLocaleString()}+
            </Text>
          </View>

          <View style={styles.stat}>
            <Text style={styles.statLabel}>DIFFICULTY</Text>
            <Text style={styles.statValue}>
              {difficulty}
            </Text>
          </View>

          <View style={styles.stat}>
            <Text style={styles.statLabel}>COINS</Text>
            <Text style={styles.statValue}>
              🪙 {coins}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progress,
              {
                width: `${Math.min(
                  100,
                  ((level % 100) || 100)
                )}%`,
              },
            ]}
          />
        </View>

        <Text style={styles.levelText}>
          Level {level.toLocaleString()} / 2,000+
        </Text>

        <View style={styles.challenge}>
          <Text style={styles.challengeSmall}>
            CHOOSE WHAT'S NEXT
          </Text>

          <Text style={styles.challengeTitle}>
            {level === 1
              ? "Your story begins..."
              : `Something unexpected happens on level ${level}.`}
          </Text>

          <Text style={styles.challengeDescription}>
            Pick one option. Every level is generated from the
            game world and level number.
          </Text>
        </View>

        {choices.map((choice) => (
          <Pressable
            key={`${game}-${level}-${choice.id}`}
            onPress={() => choose(choice.id)}
            disabled={busy}
            style={[
              styles.choice,
              busy && styles.disabled,
            ]}
          >
            <Text style={styles.choiceEmoji}>
              {choice.emoji}
            </Text>

            <View style={styles.choiceBody}>
              <Text style={styles.choiceTitle}>
                {choice.title}
              </Text>

              <Text style={styles.choiceDescription}>
                {choice.description}
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}

        {feedback ? (
          <View style={styles.feedback}>
            <Text style={styles.feedbackText}>
              {feedback}
            </Text>
          </View>
        ) : null}

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>
            🎲 Procedural World
          </Text>

          <Text style={styles.footerText}>
            This universe generates thousands of different
            situations from your level. There are no manually
            stored level files.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090909",
  },

  content: {
    padding: 18,
    paddingBottom: 50,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },

  backText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },

  hero: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 24,
  },

  gameEmoji: {
    fontSize: 58,
    marginBottom: 8,
  },

  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 1,
  },

  subtitle: {
    color: "#aaa",
    fontSize: 15,
    marginTop: 5,
    textAlign: "center",
  },

  badge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#202020",
  },

  badgeText: {
    color: "#ccc",
    fontSize: 12,
    fontWeight: "700",
  },

  stats: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },

  stat: {
    flex: 1,
    backgroundColor: "#151515",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#292929",
  },

  statLabel: {
    color: "#777",
    fontSize: 9,
    fontWeight: "800",
  },

  statValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 5,
  },

  progressTrack: {
    height: 6,
    backgroundColor: "#222",
    borderRadius: 10,
    overflow: "hidden",
  },

  progress: {
    height: "100%",
    backgroundColor: "#fff",
  },

  levelText: {
    color: "#777",
    textAlign: "center",
    marginTop: 7,
    fontSize: 11,
  },

  challenge: {
    backgroundColor: "#161616",
    borderRadius: 18,
    padding: 20,
    marginTop: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },

  challengeSmall: {
    color: "#777",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  challengeTitle: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 8,
  },

  challengeDescription: {
    color: "#999",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },

  choice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171717",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#292929",
  },

  disabled: {
    opacity: 0.5,
  },

  choiceEmoji: {
    fontSize: 32,
    width: 48,
  },

  choiceBody: {
    flex: 1,
  },

  choiceTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  choiceDescription: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  arrow: {
    color: "#777",
    fontSize: 30,
    marginLeft: 8,
  },

  feedback: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#181818",
    marginTop: 4,
  },

  feedbackText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "800",
  },

  footerCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#242424",
  },

  footerTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  footerText: {
    color: "#777",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
});
