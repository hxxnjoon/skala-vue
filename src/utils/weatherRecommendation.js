/**
 * weatherRecommendation.js — 날씨 → 카페 추천 문구
 *
 * 스토어나 컴포넌트를 참조하지 않는 순수 함수다. 카테고리는 더 이상 여기서 정하지 않는다 —
 * 추천은 항상 카페이고(CityDetailDialog.vue), 이 함수는 그 위에 곁들일 짧은 문구만 만든다.
 * getTempTier() 를 그대로 가져와 "더움" 판정이 카드 태그·이 문구 어디서나 어긋나지 않게 한다.
 */
import { getTempTier } from './temperature.js'

/**
 * 도시의 현재 날씨로 카페 추천 문구를 만든다.
 *
 * @param {{ status: string, temp: number }} weather
 * @returns {string}
 */
export function getCafeRecommendReason(weather) {
  const { status, temp } = weather

  if (status === '비' || status === '눈') {
    return `${status} 오는 날엔 아늑한 카페 어때요?`
  }

  const tier = getTempTier(temp)
  if (tier.key === 'very-hot') return '푹푹 찌는 날엔 시원한 카페에서 쉬어가세요.'
  if (tier.key === 'hot') return '더운 날엔 시원한 카페에서 쉬어가세요.'
  if (tier.key === 'cold') return '쌀쌀한 날엔 따뜻한 음료 한 잔 어때요?'

  return '나들이하기 좋은 날씨! 근처 카페는 어떠세요?'
}
