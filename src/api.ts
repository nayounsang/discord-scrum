import dotenv from "dotenv";
import { DISCORD_API } from "./constants";
import { DIVIDER, EVERYONE_SAFE, WARNING_PREFIX } from "./messages";

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN is not set");
}

if (!CHANNEL_ID) {
  throw new Error("CHANNEL_ID is not set");
}

export const sendScrumAlertMessage = async (message: string) => {
  const response = await fetch(
    `${DISCORD_API}/channels/${CHANNEL_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
        allowed_mentions: { parse: ["everyone"] },
      }),
    }
  );

  // 응답 상태 확인 및 에러 처리
  // Discord API는 2xx 상태 코드를 반환하지만, 일부 경우 4xx/5xx도 가능
  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      `Discord API error: ${response.status} ${response.statusText}. ${
        errorData.message || ""
      }`
    );
  }

  return response.json();
};

/**
 * 채널의 모든 멤버를 가져옵니다 (봇 제외)
 * 참고: https://discord.com/developers/docs/resources/guild#list-guild-members
 *
 * @returns 채널 멤버 ID 배열
 */
export const getChannelMembers = async (): Promise<string[]> => {
  // 먼저 채널 정보를 가져와서 guild_id를 얻습니다
  const channelResponse = await fetch(`${DISCORD_API}/channels/${CHANNEL_ID}`, {
    method: "GET",
    headers: {
      Authorization: `Bot ${DISCORD_TOKEN}`,
    },
  });

  if (!channelResponse.ok) {
    const errorData = (await channelResponse.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      `Discord API error: ${channelResponse.status} ${
        channelResponse.statusText
      }. ${errorData.message || ""}`
    );
  }

  const channelData = (await channelResponse.json()) as {
    guild_id?: string;
  };

  if (!channelData.guild_id) {
    throw new Error("Channel is not in a guild");
  }

  const guildId = channelData.guild_id;
  const limit = 999;
  const url = new URL(`${DISCORD_API}/guilds/${guildId}/members`);
  url.searchParams.set("limit", limit.toString());
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bot ${DISCORD_TOKEN}`,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      `Discord API error: ${response.status} ${response.statusText}. ${
        errorData.message || ""
      }`
    );
  }

  const members = (await response.json()) as Array<{
    user: { id: string; bot?: boolean };
  }>;

  return members
    .filter((member) => !member.user.bot)
    .map((member) => member.user.id);
};

/**
 * `meetcha-scrum`이 작성한 메시지 이전까지 메시지를 입력한 사람들을 가져옵니다
 * 참고: https://discord.com/developers/docs/resources/channel#get-channel-messages
 *
 * @returns 메시지를 보낸 사용자 ID 배열 (중복 제거)
 */
export const getUsersBeforeScrumMessage = async (): Promise<string[]> => {
  const BOT_USERNAME = "meetcha-scrum";
  const limit = 100; // Discord API 최대값

  // 한 번의 요청으로 최근 메시지 가져오기
  const url = new URL(`${DISCORD_API}/channels/${CHANNEL_ID}/messages`);
  url.searchParams.set("limit", limit.toString());

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bot ${DISCORD_TOKEN}`,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      `Discord API error: ${response.status} ${response.statusText}. ${
        errorData.message || ""
      }`
    );
  }

  const messages = (await response.json()) as Array<{
    id: string;
    author: { id: string; username: string; bot?: boolean };
  }>;

  // `meetcha-scrum`이 작성한 메시지를 찾았는지 확인
  const scrumMessageIndex = messages.findIndex(
    (msg) => msg.author.username === BOT_USERNAME
  );

  const userIds = new Set<string>();

  if (scrumMessageIndex !== -1) {
    // `meetcha-scrum` 메시지 이전의 메시지만 처리
    for (let i = 0; i < scrumMessageIndex; i++) {
      const msg = messages[i];
      if (!msg.author.bot) {
        userIds.add(msg.author.id);
      }
    }
  } else {
    // `meetcha-scrum` 메시지가 없으면 모든 메시지의 작성자 추가
    messages.forEach((msg) => {
      if (!msg.author.bot) {
        userIds.add(msg.author.id);
      }
    });
  }

  return Array.from(userIds);
};

/**
 * 특정 사용자들을 멘션하는 메시지를 전송합니다
 * 참고: https://discord.com/developers/docs/resources/channel#create-message
 *
 * @param message 메시지 내용
 * @param userIds 멘션할 사용자 ID 배열
 * @returns Discord API 응답 데이터
 * @throws {Error} API 요청 실패 시 에러 발생
 */
export const sendMentionMessage = async (userIds: string[]): Promise<any> => {
  if (userIds.length === 0) {
    throw new Error("userIds array cannot be empty");
  }

  // 사용자 멘션 문자열 생성 (<@userId> 형식)
  const mentions = userIds.map((userId) => `- <@${userId}>`).join("\n");

  // 메시지 내용에 멘션 추가
  const content = `${DIVIDER}\n${
    userIds.length > 0 ? `${WARNING_PREFIX}\n${mentions}` : EVERYONE_SAFE
  }`;

  const response = await fetch(
    `${DISCORD_API}/channels/${CHANNEL_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: content,
        allowed_mentions: {
          users: userIds,
        },
      }),
    }
  );

  // 응답 상태 확인 및 에러 처리
  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      `Discord API error: ${response.status} ${response.statusText}. ${
        errorData.message || ""
      }`
    );
  }

  return response.json();
};
