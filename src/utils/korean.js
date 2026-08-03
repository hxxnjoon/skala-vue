/**
 * 한글 받침 유무에 따라 알맞은 조사를 붙여 준다.
 *
 * 한글 완성형은 유니코드 0xAC00('가') ~ 0xD7A3('힣') 구간에 있고,
 * (코드 - 0xAC00) % 28 === 0 이면 받침이 없는 글자다.
 *
 *   withJosa('서울', '이/가')  ->  '서울이'   (받침 ㄹ 있음)
 *   withJosa('대구', '이/가')  ->  '대구가'   (받침 없음)
 *   withJosa('부산', '은/는')  ->  '부산은'
 */
export function withJosa(word, josa = '이/가') {
  const [withJong, withoutJong] = josa.split('/')

  if (!word) return ''

  const code = word.charCodeAt(word.length - 1)

  // 한글 완성형이 아니면(영문·숫자 등) 받침이 있는 쪽으로 처리
  if (code < 0xac00 || code > 0xd7a3) {
    return `${word}${withJong}`
  }

  const hasJongseong = (code - 0xac00) % 28 !== 0
  return `${word}${hasJongseong ? withJong : withoutJong}`
}

/** 조사만 필요할 때 (예: `${name} ${josaOnly(name, '을/를')} 선택`) */
export function josaOnly(word, josa = '이/가') {
  return withJosa(word, josa).slice(word.length)
}
