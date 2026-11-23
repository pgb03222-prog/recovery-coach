// Design Ref: §4.5 데이터 모양 — 입력과 결과의 모양을 한 곳에 정의한다.
// 점수·강도·추천 계산 함수와 화면, 서버가 모두 이 파일의 타입을 함께 쓴다.

/** 어제 운동 종류. "none"은 "어제 운동 안 함"이다. */
export type YesterdayType =
  | "cardio" // 유산소
  | "strength" // 근력
  | "sports" // 구기·스포츠
  | "yoga" // 요가·스트레칭
  | "other" // 기타
  | "none"; // 어제 운동 안 함

/** 오늘의 운동 강도 4단계 (낮은 순서). */
export type Intensity = "rest" | "light" | "moderate" | "high";

/** 추천 운동의 종류. "rest"는 "충분히 쉬기"처럼 종류가 없는 항목이다. */
export type ExerciseCategory = "cardio" | "strength" | "sports" | "yoga" | "rest";

/** 서버로 보내는 입력 5개 */
export interface RecoveryInput {
  /** 어제 운동 종류 */
  yesterdayType: YesterdayType;
  /** 어제 운동 시간(분). 5~240, 정수. yesterdayType이 "none"이면 없다. */
  yesterdayMinutes?: number;
  /** 어제 힘든 정도. 1~10, 정수. yesterdayType이 "none"이면 없다. */
  yesterdayEffort?: number;
  /** 수면 시간. 0~14, 0.5시간 단위 */
  sleepHours: number;
  /** 근육통 정도. 1~5, 정수 */
  soreness: number;
}

/** 추천 운동 하나 */
export interface Recommendation {
  name: string;
  category: ExerciseCategory;
  /** 운동마다 미리 정해 둔 한 줄 이유 */
  reason: string;
}

/** 설명 문장을 만든 방식: 외부 AI 또는 규칙 기본 문장 */
export type ExplanationSource = "ai" | "rule";

/** 서버가 돌려주는 결과 */
export interface RecoveryResult {
  /** 회복 점수. 0~100 */
  score: number;
  /** 점수 근거. 항상 한 줄 이상 */
  scoreReasons: string[];
  /** 상담 문구 등 추가 안내 */
  notices: string[];
  intensity: Intensity;
  /** 추천 운동. 1~3개 */
  recommendations: Recommendation[];
  /** 설명 문장 */
  explanation: string;
  explanationSource: ExplanationSource;
}
