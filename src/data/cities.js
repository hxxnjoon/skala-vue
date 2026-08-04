/**
 * data/cities.js — 조회 대상 도시 목록
 *
 * OpenWeatherMap 은 도시 목록을 제공하지 않고 한 번에 한 지점만 조회한다.
 * 따라서 어떤 도시를 보여 줄지는 앱이 직접 정해야 한다.
 *
 * [도시 이름 대신 좌표를 쓰는 이유]
 * q=Seoul 같은 이름 검색은 동명 지역이 많고, 한글 이름은 매칭이 불안정하다.
 * 좌표는 결과가 항상 같으므로 화면에 표시할 이름은 API 응답이 아니라
 * 아래 name 값을 그대로 쓴다. (응답의 영문 지명이 섞이는 것을 막는다)
 *
 * [id 를 슬러그로 둔 이유]
 * 즐겨찾기와 상세 페이지 주소(/weather/seoul)에 쓰이는 값이다.
 * 순번(city_01)보다 의미가 드러나고, 목록 순서가 바뀌어도 영향이 없다.
 */
export const CITIES = [
  { id: 'seoul', name: '서울', lat: 37.5665, lon: 126.978 },
  { id: 'incheon', name: '인천', lat: 37.4563, lon: 126.7052 },
  { id: 'suwon', name: '수원', lat: 37.2636, lon: 127.0286 },
  { id: 'gangneung', name: '강릉', lat: 37.7519, lon: 128.8761 },
  { id: 'daejeon', name: '대전', lat: 36.3504, lon: 127.3845 },
  { id: 'daegu', name: '대구', lat: 35.8714, lon: 128.6014 },
  { id: 'gwangju', name: '광주', lat: 35.1595, lon: 126.8526 },
  { id: 'busan', name: '부산', lat: 35.1796, lon: 129.0756 },
  { id: 'jeju', name: '제주', lat: 33.4996, lon: 126.5312 },
]

/** 주소의 :cityId 로 도시 정보를 찾는다. 없으면 null 을 돌려준다. */
export function findCity(cityId) {
  return CITIES.find((city) => city.id === cityId) ?? null
}
