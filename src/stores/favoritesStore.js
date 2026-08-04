/**
 * favoritesStore.js — 즐겨찾기 도시 스토어
 *
 * 과제 요구사항은 configStore 하나지만, 즐겨찾기 역시 대시보드와 상세 페이지가
 * 함께 봐야 하는 값이라 같은 방식으로 분리했다.
 * 이전에는 대시보드 컴포넌트가 목록을 소유하고 있어서 상세 페이지에서는
 * 즐겨찾기 상태를 알 수 없었다.
 *
 * 도시 객체가 아니라 id 만 저장한다. 원본 데이터가 갱신돼도 즐겨찾기가 깨지지 않는다.
 */
import { defineStore } from 'pinia'

const STORAGE_KEY = 'weather-dashboard:favorites'

const readSavedIds = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // 저장된 값이 손상된 경우 빈 목록으로 시작한다
    return []
  }
}

export const useFavoritesStore = defineStore('favorites', {
  state: () => ({
    ids: readSavedIds(),
  }),

  getters: {
    count: (state) => state.ids.length,

    /**
     * 인자를 받는 getter. 함수를 돌려주는 형태라 결과가 캐시되지 않는다.
     * 목록 렌더링에서 호출하는 정도의 가벼운 검사이므로 이 방식을 택했다.
     */
    has: (state) => (cityId) => state.ids.includes(cityId),
  },

  actions: {
    /** 담기/빼기 토글. 담긴 상태가 되었는지를 반환해 호출부가 안내 문구를 만들 수 있게 한다. */
    toggle(cityId) {
      if (this.ids.includes(cityId)) {
        this.ids = this.ids.filter((id) => id !== cityId)
        this.persist()
        return false
      }

      this.ids = [...this.ids, cityId]
      this.persist()
      return true
    },

    clear() {
      this.ids = []
      this.persist()
    },

    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.ids))
    },
  },
})
