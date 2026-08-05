/**
 * random.js — 무작위 추출용 순수 함수
 *
 * 스토어나 컴포넌트를 참조하지 않는다. 같은 입력이라도 매번 다른 결과가 나올 수 있다는
 * 점만 다를 뿐, 외부 상태를 읽거나 바꾸지 않는다는 점에서는 다른 utils 파일과 같다.
 */

/**
 * array 에서 count 개를 중복 없이 무작위로 뽑는다 (Fisher–Yates 부분 셔플).
 * count 가 array 길이보다 크면 array 전체를 섞어서 돌려준다.
 */
export function sampleRandom(array, count) {
  const pool = [...array]
  const n = Math.min(count, pool.length)
  const picked = []

  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
    picked.push(pool[i])
  }

  return picked
}
