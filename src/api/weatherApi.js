/**
 * api/weatherApi.js — OpenWeatherMap 응답을 앱 데이터로 변환하는 계층
 *
 * 화면 컴포넌트는 이 파일이 돌려주는 형태만 알면 되고, OpenWeatherMap 의
 * 응답 구조는 알 필요가 없다. API 사양이 바뀌더라도 수정 범위가 이 파일에 갇힌다.
 *
 * [돌려주는 형태]
 *   목록: { id, name, temp, status, description, feelsLike, humidity, wind }
 *   상세: 위 항목 + { rainChance, dust, sunrise, sunset, hourly[] }
 *
 * 이 구조는 이전 과제의 Mock 데이터와 동일하게 맞췄다.
 * 덕분에 컴포넌트·스토어·Composable 은 거의 수정 없이 실제 API 로 전환됐다.
 */
import client, { ApiError } from './client.js'
import { CITIES, findCity } from '../data/cities.js'

/**
 * OpenWeatherMap 의 날씨 코드를 앱에서 쓰는 다섯 가지 상태로 좁힌다.
 *
 * 응답의 description(lang=kr)은 '튼구름', '실 비' 처럼 종류가 매우 많아
 * 아이콘·색을 대응시키기 어렵다. 아이콘 분기는 아래 5종으로 단순화하고,
 * 상세 설명은 description 필드에 따로 보관해 상세 페이지에서 보여 준다.
 *
 * 코드 대역: 2xx 뇌우 / 3xx 이슬비 / 5xx 비 / 6xx 눈 / 7xx 안개·먼지 / 800 맑음 / 80x 구름
 */
function mapStatus(weatherItem) {
  const code = weatherItem?.id ?? 800

  if (code === 800) return '맑음'
  if (code === 801 || code === 802) return '구름'
  if (code === 803 || code === 804) return '흐림'
  if (code >= 600 && code < 700) return '눈'
  if (code >= 200 && code < 600) return '비'
  return '흐림' // 700번대(안개·황사 등)
}

/**
 * UNIX 시각을 해당 지역의 'HH:MM' 으로 바꾼다.
 *
 * 응답의 sunrise 는 UTC 기준 초 단위 값이고, timezone 은 그 지역의 UTC 오프셋(초)이다.
 * 두 값을 더한 뒤 UTC 로 읽으면 브라우저 시간대와 무관하게 현지 시각이 나온다.
 * (getHours() 를 쓰면 사용자의 시간대가 섞여 들어간다)
 */
function formatLocalTime(unixSeconds, timezoneOffsetSeconds) {
  const date = new Date((unixSeconds + timezoneOffsetSeconds) * 1000)
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mm = String(date.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** 대기질 지수(1~5)를 한글 등급으로 */
function mapAirQuality(aqi) {
  return ['좋음', '보통', '나쁨', '매우 나쁨', '위험'][aqi - 1] ?? '정보 없음'
}

/**
 * 현재 날씨 응답을 앱 형태로 변환한다.
 * 이름은 응답이 아니라 CITIES 의 한글 이름을 쓴다.
 */
function toCityWeather(city, current) {
  return {
    id: city.id,
    name: city.name,
    // 원본은 항상 섭씨로 보관한다. 화씨 변환은 화면(useTemperature)에서 처리한다.
    temp: Math.round(current.main.temp),
    feelsLike: Math.round(current.main.feels_like),
    status: mapStatus(current.weather?.[0]),
    description: current.weather?.[0]?.description ?? '',
    humidity: current.main.humidity,
    wind: Number(current.wind.speed.toFixed(1)),
  }
}

/* ────────────────────────────────────────────────────────────────
   목록 조회
   ──────────────────────────────────────────────────────────────── */

/**
 * 임의의 {id,name,lat,lon} 도시 하나의 현재 날씨를 조회한다.
 * CITIES 에 없는 도시(예: 주변 추천 페이지가 쓰는 확장 도시 목록)도 이 형태만 맞으면 재사용할 수 있다.
 */
export async function fetchCurrentWeatherFor(city) {
  const current = await client.get('/weather', { params: { lat: city.lat, lon: city.lon } })
  return toCityWeather(city, current)
}

/**
 * 모든 도시의 현재 날씨를 병렬로 조회한다.
 *
 * [Promise.all 이 아니라 allSettled 를 쓴 이유]
 * all 은 하나만 실패해도 전체가 실패한다. 도시 아홉 곳 중 한 곳만 오류가 나도 화면이 통째로 비는 것은 과한 처리다.
 * allSettled 로 성공한 것만 모으고, 전부 실패했을 때만 에러로 올린다.
 */
export async function fetchWeatherList() {
  const results = await Promise.allSettled(CITIES.map((city) => fetchCurrentWeatherFor(city)))

  const succeeded = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)

  // 한 곳도 못 받았다면 네트워크나 키 문제이므로 첫 번째 실패 사유를 그대로 전달한다
  if (succeeded.length === 0) {
    const firstRejection = results.find((result) => result.status === 'rejected')
    throw (
      firstRejection?.reason ??
      new ApiError({ kind: 'UNKNOWN', message: '날씨 정보를 불러오지 못했습니다.' })
    )
  }

  // 일부만 실패한 경우는 화면을 막지 않고 콘솔에만 남긴다
  const failedCount = results.length - succeeded.length
  if (failedCount > 0) {
    console.warn(`[api] ${failedCount}개 도시의 날씨를 불러오지 못해 목록에서 제외했습니다.`)
  }

  return succeeded
}

/* ────────────────────────────────────────────────────────────────
   상세 조회
   ──────────────────────────────────────────────────────────────── */

/**
 * 상세 페이지에 필요한 정보를 모아 온다.
 *
 * 세 개의 엔드포인트를 함께 호출한다.
 *   /weather        현재 기온·습도·풍속·일출·일몰
 *   /forecast       3시간 간격 예보 (시간대별 기온, 강수확률)
 *   /air_pollution  대기질 지수
 *
 * 앞의 두 개는 필수라 Promise.all 로 묶고, 대기질은 없어도 화면이 성립하므로
 * 실패하더라도 '정보 없음' 으로 대체한다.
 */
export async function fetchCityById(cityId) {
  const city = findCity(cityId)

  // 목록에 없는 id 는 요청을 보내기 전에 걸러 낸다
  if (!city) {
    throw new ApiError({
      kind: 'NOT_FOUND',
      message: `'${cityId}' 에 해당하는 도시를 찾을 수 없습니다.`,
    })
  }

  const params = { lat: city.lat, lon: city.lon }

  const [current, forecast] = await Promise.all([
    client.get('/weather', { params }),
    client.get('/forecast', { params }),
  ])

  // 대기질은 선택 정보 — 실패해도 전체를 실패시키지 않는다
  let dust = '정보 없음'
  try {
    const air = await client.get('/air_pollution', { params })
    dust = mapAirQuality(air.list?.[0]?.main?.aqi)
  } catch {
    console.warn('[api] 대기질 정보를 불러오지 못했습니다.')
  }

  // 예보는 3시간 간격이다. 앞의 6개(약 18시간)만 그래프에 사용한다.
  const hourly = forecast.list.slice(0, 6).map((item) => ({
    label: formatLocalTime(item.dt, forecast.city.timezone),
    temp: Math.round(item.main.temp),
  }))

  return {
    ...toCityWeather(city, current),
    // pop 은 0~1 사이 확률이므로 백분율로 바꾼다
    rainChance: Math.round((forecast.list[0]?.pop ?? 0) * 100),
    dust,
    sunrise: formatLocalTime(current.sys.sunrise, current.timezone),
    sunset: formatLocalTime(current.sys.sunset, current.timezone),
    hourly,
  }
}
