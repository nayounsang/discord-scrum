import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import * as dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// 환경 변수에서 토큰과 채널 ID 가져오기
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN 환경 변수가 설정되지 않았습니다.");
  process.exit(1);
}

if (!CHANNEL_ID) {
  console.error("CHANNEL_ID 환경 변수가 설정되지 않았습니다.");
  process.exit(1);
}

/** 12월 25일 오후 2시 (한국 시간 기준) */
const START_DATE = new Date("2024-12-25T14:00:00+09:00");
/** 메시지 보낼 주기 (일) */
const INTERVAL_DAYS = 3; // 3일 간격
/** 보낼 메시지 */
const MESSAGE = `@everyone 스크럼 시간입니다!
- 지금까지 한 일
- 이후 할 일
- 공유 사항
`;
/**
 * 메시지 보낼 시간인지 판별하는 주기
 */
const POLLING_INTERVAL = 10 * 60 * 1000; // 10분

// 한국 시간으로 현재 시간 가져오기
function getKoreaTime(): Date {
  const now = new Date();
  const koreaTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );
  return koreaTime;
}

// 메시지를 보낼 시점인지 판별
function shouldSendMessage(now: Date): boolean {
  // 시작 시간 이전이면 전송하지 않음
  if (now < START_DATE) {
    return false;
  }

  // 현재 시간이 오후 2시~2시 10분 사이인지 확인
  const hour = now.getHours();
  const minute = now.getMinutes();
  const isTargetTime = hour === 14 && minute >= 0 && minute < 10;

  if (!isTargetTime) {
    return false;
  }

  // 시작 시간부터 경과한 시간 계산 (밀리초)
  const elapsed = now.getTime() - START_DATE.getTime();
  const intervalMs = INTERVAL_DAYS * 24 * 60 * 60 * 1000; // 3일을 밀리초로

  // 경과 시간을 3일로 나눈 나머지 계산
  const remainder = elapsed % intervalMs;

  // 나머지가 10분 이내이면 3일 간격의 정확한 시점 (오차 허용)
  const isMultipleOfInterval = remainder < POLLING_INTERVAL;

  return isMultipleOfInterval;
}

// 메시지 전송 함수
async function sendNotification(channel: TextChannel) {
  try {
    await channel.send(MESSAGE);
    const koreaTime = getKoreaTime();
    console.log(`메시지 전송 완료: ${koreaTime.toLocaleString("ko-KR")}`);
  } catch (error) {
    console.error("메시지 전송 실패:", error);
  }
}

// 10분마다 실행되는 polling 함수
async function checkAndSend() {
  const nowKoreaTime = getKoreaTime();

  if (shouldSendMessage(nowKoreaTime)) {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID!);
      if (channel instanceof TextChannel) {
        await sendNotification(channel);
      } else {
        console.error("채널을 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("채널 가져오기 실패:", error);
    }
  }
}

client.once("clientReady", async () => {
  console.log(`봇이 로그인했습니다: ${client.user?.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);

  if (!(channel instanceof TextChannel)) {
    console.error("채널을 찾을 수 없습니다.");
    process.exit(1);
  }

  console.log(`채널 연결 완료: ${channel.name}`);
  console.log(`시작 시간: ${START_DATE.toLocaleString("ko-KR")}`);
  console.log(`10분 간격 polling 시작...`);

  // 즉시 한 번 실행
  await checkAndSend();

  // 10분(600000ms)마다 반복 실행
  setInterval(checkAndSend, POLLING_INTERVAL);
});

client.login(DISCORD_TOKEN);
