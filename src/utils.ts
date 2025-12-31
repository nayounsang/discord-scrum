import { INTERVAL_DAYS, START_DATE, UTC_TO_KST_OFFSET } from "./constants";

export const isPeriodDay = (now: Date) => {
  // 한국시간 기준으로 요일 확인 (일요일=0, 목요일=4)
  // cron이 이미 매일 12시에 실행하므로 요일만 검증
  const dayOfWeek = now.getDay();
  return dayOfWeek === 0 || dayOfWeek === 4; // 일요일 또는 목요일
};

export const convertUTCtoKST = (utcDate: Date) => {
  return new Date(utcDate.getTime() + UTC_TO_KST_OFFSET);
};
