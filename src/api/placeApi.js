/**
 * api/placeApi.js — Kakao 로컬 API 응답을 앱 데이터로 변환하는 계층
 *
 * weatherApi.js 와 같은 분리 방식: 화면은 이 파일이 돌려주는 형태만 알면 되고,
 * Kakao 응답 필드명(place_name, road_address_name 등)은 알 필요가 없다.
 */
import placeClient from './placeClient.js'

/** Kakao 장소 카테고리 그룹 코드 */
export const PLACE_CATEGORY = {
  CAFE: 'CE7',
}

/**
 * 좌표 주변 장소를 카테고리별로 검색한다.
 *
 * @param {object} params
 * @param {number} params.lat 위도
 * @param {number} params.lon 경도
 * @param {string} params.categoryCode PLACE_CATEGORY 값
 * @param {number} [params.radius=1500] 반경(m). Kakao 최대치는 20000.
 */
export async function fetchNearbyPlaces({ lat, lon, categoryCode, radius = 1500 }) {
  const data = await placeClient.get('/search/category.json', {
    params: {
      category_group_code: categoryCode,
      x: lon,
      y: lat,
      radius,
      sort: 'distance',
    },
  })

  return data.documents.map((doc) => ({
    id: doc.id,
    name: doc.place_name,
    category: doc.category_name,
    address: doc.road_address_name || doc.address_name,
    phone: doc.phone,
    distance: Number(doc.distance), // 미터
    placeUrl: doc.place_url,
  }))
}
