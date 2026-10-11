import type { Messages } from "./en";

// Needs review by a native Cantonese speaker before release.
export const zhHant: Messages = {
  appName: "香港健康助手",
  appDescription: "為香港市民整理健康記錄、提供用藥支援及求醫選項。",
  comingSoon: "即將推出。",
  notMedicalAdvice: "此資訊並非醫療建議。",
  navigation: {
    label: "主要導覽",
    chat: "對話",
    medications: "藥物",
    care: "尋找醫療服務",
    summary: "摘要",
  },
  language: {
    label: "語言",
    english: "English",
    traditionalChinese: "繁體中文",
  },
  // Screen: /medications (track G adds keys here only).
  medications: {
    title: "藥物",
  },
  emergency: {
    title: "緊急情況",
    message: "如現時需要救護車，請致電 999。",
    call: "致電 999",
  },
  // Screen: /summary (track H adds keys here only).
  summary: {
    title: "給醫生的摘要",
    rangeLabel: "時段",
    ranges: {
      "7d": "最近 7 日",
      "30d": "最近 30 日",
      all: "全部記錄",
    },
    since: "（由 {date} 起）",
    labelValue: "{label}：{value}",
    generated: "建立時間",
    print: "列印",
    medications: "藥物",
    dose: "劑量",
    everyDay: "每日 {times}",
    onDays: "{days} {times}",
    noMedications: "未有藥物記錄。",
    warnings: "藥物相互作用警告",
    warningKind: {
      interaction: "藥物相互作用",
      duplicate_ingredient: "相同有效成分",
    },
    warningSeverity: "嚴重程度",
    severity: {
      major: "嚴重",
      moderate: "中度",
      minor: "輕微",
    },
    involved: "涉及藥物",
    sources: "資料來源",
    symptoms: "症狀",
    symptomSeverity: "嚴重程度：{value} / 5",
    viaChat: "經對話記錄",
    noSymptoms: "此期間未有症狀記錄。",
    emptyTitle: "此期間未有任何記錄",
    emptyMessage: "在「對話」講出你的感受，或加入你的藥物，記錄便會在這裡顯示。",
    goToChat: "前往對話",
    goToMedications: "前往藥物",
    errorTitle: "暫時未能提供摘要",
    errorMessage: "目前未能讀取你的記錄，請稍後再試。",
    retry: "再試一次",
    readAloudIntro: "給醫生的摘要：{range}。",
    readAloudMedications: "藥物：{count} 種。",
    readAloudMedicationNames: "{names}。",
    readAloudWarnings: "藥物相互作用警告：{count} 項。",
    readAloudSymptoms: "症狀：{count} 項。",
  },
  care: {
    title: "尋找醫療服務",
    intro: "醫院管理局急症室現時輪候時間。",
    listLabel: "急症室輪候時間",
    updated: "更新時間",
    stale: "輪候時間可能並非最新資料。出發前請先向醫院查詢。",
    loading: "正在載入急症室輪候時間……",
    errorTitle: "暫時未能提供輪候時間",
    errorMessage: "目前未能連接輪候時間服務，請稍後再試。",
    retry: "再試一次",
  },
  careLevel: {
    call_999: "立即致電 999",
    ae: "前往急症室",
    gp: "看普通科醫生（家庭醫生）",
    specialist: "向普通科醫生查詢轉介專科",
  },
  // Shared ReadAloudButton.
  readAloud: {
    start: "讀出內容",
    stop: "停止朗讀",
  },
  // Screen: /chat, voice-first conversation (Claude).
  chat: {
    title: "對話",
  },
};
