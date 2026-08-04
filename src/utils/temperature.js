/**
 * temperature.js — 단위와 무관한 순수 계산 함수
 *
 * 스토어나 컴포넌트를 전혀 참조하지 않는다. 입력이 같으면 항상 같은 값을 돌려주므로
 * 테스트하기 쉽고, 어디서 호출하든 결과가 달라지지 않는다.
 * 스토어의 현재 단위와 연결하는 일은 composables/useTemperature.js 가 맡는다.
 */

/** 섭씨를 화씨로 변환 */
export function celsiusToFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32)
}

/**
 * 25도 기준 분기.
 * 판단은 반드시 섭씨 원본으로 한다. 화씨 값(77)을 25와 비교하면 전부 '더움'이 된다.
 */
export function isHot(celsius) {
  return celsius >= 25
}

/** 기온을 게이지 길이(%)로. 10℃~35℃ 를 0~100% 에 대응시킨다. */
export function gaugePercent(celsius) {
  const ratio = ((celsius - 10) / 25) * 100
  return Math.min(100, Math.max(6, Math.round(ratio)))
}
