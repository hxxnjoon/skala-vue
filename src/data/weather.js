/**
 * data/weather.js — Mock 데이터와 가짜 API
 *
 * 홈 화면과 상세 화면이 같은 데이터를 봐야 하는데, 각 화면에 배열을 복사해 두면
 * 한쪽만 고쳤을 때 값이 어긋난다. 데이터를 한 파일에 모아 두고
 * 두 화면이 여기서만 가져가게 한다.
 *
 * 나중에 실제 API 를 붙일 때도 이 파일의 함수 두 개만 바꾸면 된다.
 */

/** 도시 목록 (상세 페이지용 관측 정보까지 포함) */
export const MOCK_DATA = [
  {
    id: 'city_01',
    name: '서울',
    temp: 28,
    status: '맑음',
    feelsLike: 30,
    humidity: 55,
    wind: 2.4,
    rainChance: 10,
    dust: '보통',
    sunrise: '05:42',
    sunset: '19:38',
    hourly: [26, 27, 28, 29, 28, 26],
  },
  {
    id: 'city_02',
    name: '인천',
    temp: 24,
    status: '흐림',
    feelsLike: 25,
    humidity: 72,
    wind: 4.1,
    rainChance: 30,
    dust: '좋음',
    sunrise: '05:44',
    sunset: '19:41',
    hourly: [23, 23, 24, 25, 24, 23],
  },
  {
    id: 'city_03',
    name: '수원',
    temp: 24,
    status: '비',
    feelsLike: 26,
    humidity: 88,
    wind: 1.8,
    rainChance: 80,
    dust: '좋음',
    sunrise: '05:43',
    sunset: '19:37',
    hourly: [24, 24, 24, 23, 23, 22],
  },
  {
    id: 'city_04',
    name: '강릉',
    temp: 22,
    status: '구름',
    feelsLike: 22,
    humidity: 64,
    wind: 3.2,
    rainChance: 20,
    dust: '좋음',
    sunrise: '05:36',
    sunset: '19:31',
    hourly: [21, 21, 22, 23, 22, 21],
  },
  {
    id: 'city_05',
    name: '대전',
    temp: 27,
    status: '맑음',
    feelsLike: 28,
    humidity: 58,
    wind: 2.0,
    rainChance: 10,
    dust: '보통',
    sunrise: '05:47',
    sunset: '19:39',
    hourly: [25, 26, 27, 28, 27, 25],
  },
  {
    id: 'city_06',
    name: '대구',
    temp: 31,
    status: '맑음',
    feelsLike: 34,
    humidity: 49,
    wind: 1.5,
    rainChance: 0,
    dust: '나쁨',
    sunrise: '05:39',
    sunset: '19:32',
    hourly: [28, 30, 31, 33, 32, 29],
  },
  {
    id: 'city_07',
    name: '광주',
    temp: 29,
    status: '구름',
    feelsLike: 31,
    humidity: 66,
    wind: 2.7,
    rainChance: 20,
    dust: '보통',
    sunrise: '05:52',
    sunset: '19:44',
    hourly: [27, 28, 29, 30, 29, 27],
  },
  {
    id: 'city_08',
    name: '부산',
    temp: 26,
    status: '구름',
    feelsLike: 28,
    humidity: 74,
    wind: 3.9,
    rainChance: 20,
    dust: '좋음',
    sunrise: '05:41',
    sunset: '19:33',
    hourly: [25, 25, 26, 27, 26, 25],
  },
  {
    id: 'city_09',
    name: '제주',
    temp: 25,
    status: '비',
    feelsLike: 27,
    humidity: 85,
    wind: 5.3,
    rainChance: 70,
    dust: '좋음',
    sunrise: '05:50',
    sunset: '19:42',
    hourly: [25, 25, 25, 24, 24, 23],
  },
]

/** 실제 네트워크처럼 잠깐 기다리게 하는 도우미 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 도시 목록을 불러온다.
 * shouldFail 을 켜면 실패 상황을 만들 수 있다(에러 화면 확인용).
 */
export async function fetchWeatherList({ shouldFail = false } = {}) {
  await delay(700)
  if (shouldFail) throw new Error('NETWORK')
  return MOCK_DATA
}

/**
 * id 로 도시 하나를 찾는다.
 * 없는 id 면 에러를 던져, 상세 페이지가 "찾을 수 없음" 화면을 보여 주게 한다.
 */
export async function fetchCityById(cityId) {
  await delay(450)
  const city = MOCK_DATA.find((item) => item.id === cityId)
  if (!city) throw new Error('NOT_FOUND')
  return city
}
