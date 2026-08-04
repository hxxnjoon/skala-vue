/**
 * api/client.js — OpenWeatherMap 전용 axios 인스턴스
 *
 * 이 파일이 담당하는 것
 *   · 기본 주소와 공통 쿼리(API 키·단위·언어)를 한 곳에서 관리
 *   · 요청/응답 인터셉터로 반복 작업 처리
 *   · HTTP 상태 코드를 화면이 그대로 쓸 수 있는 에러 객체로 변환
 *
 * 호출하는 쪽(weatherApi.js)은 주소와 키를 알 필요가 없다.
 *
 * [보안에 관한 메모]
 * 브라우저에서 직접 호출하므로 API 키는 네트워크 탭에 노출된다.
 * .env.local 은 키를 저장소에서 제외할 뿐 브라우저에서 숨기지는 못한다.
 * 실제 서비스라면 키를 보관하는 백엔드를 두고 프론트는 자사 서버만 호출해야 하지만,
 * 이번 과제는 프론트엔드 학습이 목적이므로 직접 호출 방식을 택했다.
 */
import axios from 'axios'

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
const BASE_URL = import.meta.env.VITE_OPENWEATHER_BASE_URL

// 키가 없으면 401 이 반복 발생한다. 원인을 바로 알 수 있도록 시작 시점에 경고한다.
if (!API_KEY) {
  console.warn(
    '[api] VITE_OPENWEATHER_API_KEY 가 비어 있습니다. .env.local 을 확인하고 dev 서버를 재시작하세요.',
  )
}

/**
 * 사용자에게 보여 줄 문구까지 담은 에러 객체.
 *
 * 화면마다 error.response?.status 를 해석하면 같은 분기가 여러 곳에 흩어진다.
 * 여기서 한 번만 해석해 두면 컴포넌트는 message 를 그대로 출력하기만 하면 된다.
 */
export class ApiError extends Error {
  constructor({ kind, message, status = null, cause = null }) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind // 'NETWORK' | 'TIMEOUT' | 'AUTH' | 'NOT_FOUND' | 'RATE_LIMIT' | 'SERVER' | 'UNKNOWN'
    this.status = status
    this.cause = cause
    // 재시도 버튼을 보여 줄지 판단하는 기준. 키가 틀린 경우는 다시 눌러도 소용없다.
    this.retryable = kind !== 'AUTH' && kind !== 'NOT_FOUND'
  }
}

const client = axios.create({
  baseURL: BASE_URL,

  /**
   * 응답이 오지 않을 때 무한정 기다리면 로딩 화면에서 벗어날 수 없다.
   * 8초를 넘기면 실패로 처리해 사용자가 재시도할 수 있게 한다.
   */
  timeout: 8000,

  /**
   * 모든 요청에 자동으로 붙는 쿼리 파라미터.
   *
   * units: 'metric' 을 고정한 이유
   * 화씨는 API 에서 받지 않고 화면에서 변환한다(useTemperature).
   * 원본 데이터를 항상 섭씨로 유지하면 25도 기준 판정이 단순해지고,
   * 단위를 바꿀 때마다 다시 요청할 필요도 없다.
   */
  params: {
    appid: API_KEY,
    units: 'metric',
    lang: 'kr',
  },
})

/* ── 요청 인터셉터 ───────────────────────────────────────────── */
client.interceptors.request.use(
  (config) => {
    // 개발 중에만 로그를 남긴다. 빌드 결과물에는 포함되지 않는다.
    if (import.meta.env.DEV) {
      console.log(`🌐 [API 요청] ${config.url}`, config.params)
    }
    return config
  },
  (error) => Promise.reject(error),
)

/* ── 응답 인터셉터 ───────────────────────────────────────────── */
client.interceptors.response.use(
  /**
   * 성공 시 response.data 만 돌려준다.
   * 호출하는 쪽에서 매번 .data 를 붙이지 않아도 된다.
   */
  (response) => response.data,

  /**
   * 실패 시 상황을 구분해 ApiError 로 바꾼다.
   * axios 원본 에러를 그대로 흘려보내면 각 화면이 같은 분기를 반복하게 된다.
   */
  (error) => {
    // 요청이 시간 안에 끝나지 않은 경우
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(
        new ApiError({
          kind: 'TIMEOUT',
          message: '응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.',
          cause: error,
        }),
      )
    }

    // 응답 자체가 없는 경우 (오프라인, DNS 실패, CORS 차단 등)
    if (!error.response) {
      return Promise.reject(
        new ApiError({
          kind: 'NETWORK',
          message: '네트워크에 연결할 수 없습니다. 인터넷 상태를 확인해 주세요.',
          cause: error,
        }),
      )
    }

    const { status } = error.response

    const byStatus = {
      401: {
        kind: 'AUTH',
        message: 'API 키가 유효하지 않습니다. 키 발급 상태를 확인해 주세요.',
      },
      404: {
        kind: 'NOT_FOUND',
        message: '요청한 지역의 날씨 정보를 찾을 수 없습니다.',
      },
      429: {
        kind: 'RATE_LIMIT',
        message: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.',
      },
    }

    const matched = byStatus[status] ?? {
      kind: status >= 500 ? 'SERVER' : 'UNKNOWN',
      message:
        status >= 500
          ? '날씨 서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
          : '날씨 정보를 불러오지 못했습니다.',
    }

    return Promise.reject(new ApiError({ ...matched, status, cause: error }))
  },
)

export default client
