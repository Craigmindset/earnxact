const SIX_WEEK_ROI_PERCENT = 50;
const EARNING_DAYS_PER_WEEK = 5;
const EARNING_WEEKS = 6;
const DAILY_TASK_SHARE = 0.6;
const DAILY_VIDEO_SHARE = 0.4;
const DAILY_VIDEO_COUNT = 3;

export type RoiSplit = {
  sixWeekReturn: number;
  dailyTotal: number;
  taskDailyReward: number;
  videoDailyPool: number;
  perVideoReward: number;
  dailyVideoCount: number;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function getRoiSplit(amount: number): RoiSplit {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const sixWeekReturn = roundCurrency(safeAmount + safeAmount * (SIX_WEEK_ROI_PERCENT / 100));
  const dailyTotal = roundCurrency(sixWeekReturn / (EARNING_DAYS_PER_WEEK * EARNING_WEEKS));
  const taskDailyReward = roundCurrency(dailyTotal * DAILY_TASK_SHARE);
  const videoDailyPool = roundCurrency(dailyTotal * DAILY_VIDEO_SHARE);
  const perVideoReward = roundCurrency(videoDailyPool / DAILY_VIDEO_COUNT);

  return {
    sixWeekReturn,
    dailyTotal,
    taskDailyReward,
    videoDailyPool,
    perVideoReward,
    dailyVideoCount: DAILY_VIDEO_COUNT,
  };
}

export { DAILY_VIDEO_COUNT, EARNING_DAYS_PER_WEEK, EARNING_WEEKS };