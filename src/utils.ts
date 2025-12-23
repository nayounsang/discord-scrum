import { INTERVAL_DAYS, START_DATE, UTC_TO_KST_OFFSET } from "./constants";

export const isPeriodDay = (now: Date) => {
  const diffDay = now.getDate() - START_DATE.getDate();
  if (diffDay < 0) {
    return false;
  }
  if (diffDay % INTERVAL_DAYS === 0) {
    return true;
  }
  return false;
};

export const convertUTCtoKST = (utcDate: Date) => {
  return new Date(utcDate.getTime() + UTC_TO_KST_OFFSET);
};
