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
    title: "摘要",
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
