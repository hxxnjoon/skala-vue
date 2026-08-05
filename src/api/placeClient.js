/**
 * api/placeClient.js — Kakao 로컬 API(장소 검색) 전용 axios 인스턴스
 *
 * client.js(OpenWeatherMap)와 같은 구조를 따른다. 서비스마다 base URL·인증 방식·
 * 에러 응답 형태가 다르므로 외부 API 하나당 인스턴스 하나를 둔다.
 *
 * [보안에 관한 메모]
 * client.js 와 동일한 이유로 REST 키가 브라우저에 노출된다. 이번 과제는 프론트엔드
 * 학습이 목적이므로 직접 호출 방식을 택했다.
 */
import axios from 'axios'
import { ApiError } from './client.js'

const REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY

if (!REST_API_KEY) {
  console.warn(
    '[api] VITE_KAKAO_REST_API_KEY 가 비어 있습니다. .env.local 을 확인하고 dev 서버를 재시작하세요.',
  )
}

const placeClient = axios.create({
  baseURL: 'https://dapi.kakao.com/v2/local',
  timeout: 8000,
  headers: {
    Authorization: `KakaoAK ${REST_API_KEY}`,
  },
})

/* ── 응답 인터셉터 ───────────────────────────────────────────── */
placeClient.interceptors.response.use(
  (response) => response.data,

  (error) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(
        new ApiError({
          kind: 'TIMEOUT',
          message: '장소 검색 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.',
          cause: error,
        }),
      )
    }

    if (!error.response) {
      return Promise.reject(
        new ApiError({
          kind: 'NETWORK',
          message: '장소 검색 서버에 연결할 수 없습니다. 인터넷 상태를 확인해 주세요.',
          cause: error,
        }),
      )
    }

    const { status } = error.response

    // Kakao 는 open.er-api 와 달리 실패 시 일반적인 HTTP 상태 코드를 그대로 준다.
    const byStatus = {
      401: {
        kind: 'AUTH',
        message: 'Kakao API 키가 유효하지 않습니다. .env.local 의 VITE_KAKAO_REST_API_KEY 를 확인해 주세요.',
      },
      429: {
        kind: 'RATE_LIMIT',
        message: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.',
      },
    }

    const matched = byStatus[status] ?? {
      kind: status >= 500 ? 'SERVER' : 'UNKNOWN',
      message: '주변 장소를 불러오지 못했습니다.',
    }

    return Promise.reject(new ApiError({ ...matched, status, cause: error }))
  },
)

export default placeClient
