/**
 * korean.js — 한글 처리 유틸
 *
 * 한글 완성형은 0xAC00('가') ~ 0xD7A3('힣') 구간에 규칙적으로 배열돼 있다.
 * 한 글자 = (초성 19 × 중성 21 × 종성 28) 조합이므로 코드값에서 역산할 수 있다.
 *
 *   받침: (code - 0xAC00) % 28 === 0  →  받침 없음
 *   초성: Math.floor((code - 0xAC00) / 588)   (21 × 28 = 588)
 */

const HANGUL_START = 0xac00
const HANGUL_END = 0xd7a3

const CHOSEONG = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
]

/**
 * 받침에 맞는 조사를 붙인다.
 *   withJosa('서울', '이/가') → '서울이'
 *   withJosa('대구', '이/가') → '대구가'
 */
export function withJosa(word, josa = '이/가') {
  const [withJong, withoutJong] = josa.split('/')
  if (!word) return ''

  const code = word.charCodeAt(word.length - 1)
  if (code < HANGUL_START || code > HANGUL_END) return `${word}${withJong}`

  const hasJongseong = (code - HANGUL_START) % 28 !== 0
  return `${word}${hasJongseong ? withJong : withoutJong}`
}

/** 문자열의 초성만 뽑는다. getChoseong('서울') → 'ㅅㅇ' */
export function getChoseong(text) {
  return [...text]
    .map((char) => {
      const code = char.charCodeAt(0)
      if (code < HANGUL_START || code > HANGUL_END) return char
      return CHOSEONG[Math.floor((code - HANGUL_START) / 588)]
    })
    .join('')
}

/**
 * 검색어가 초성으로만 이루어져 있는지 확인한다.
 * 이 검사를 먼저 하지 않으면 일반 검색어까지 초성 비교가 돌아 엉뚱한 결과가 나온다.
 */
export function isChoseongOnly(text) {
  if (!text) return false
  return [...text].every((char) => CHOSEONG.includes(char))
}

/** 초성 검색 일치 여부. matchesChoseong('서울', 'ㅅㅇ') → true */
export function matchesChoseong(name, query) {
  if (!isChoseongOnly(query)) return false
  return getChoseong(name).includes(query)
}
