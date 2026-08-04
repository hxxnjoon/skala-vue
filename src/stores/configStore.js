/**
 * configStore.js — 앱 전역 환경 설정 스토어
 *
 * 온도 단위는 대시보드·상세 페이지·내비게이션 바가 모두 참조하는 값이다.
 * 이전 구현에서는 각 화면이 unit 을 개별 ref 로 갖고 있었고, 페이지를 이동할 때 쿼리스트링(?unit=F)으로 값을 넘겨야 했다.
 * 스토어로 옮기면서 그 전달 코드를 모두 제거
 */
import { defineStore } from 'pinia'

const STORAGE_KEY = 'weather-dashboard:unit'

/** 저장된 설정을 읽어 초기값으로 쓴다. 없거나 손상됐으면 섭씨로 시작한다. */
const readSavedUnit = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'fahrenheit' ? 'fahrenheit' : 'celsius'
}

export const useConfigStore = defineStore('config', {
  /* state — 스토어가 보관하는 원본 데이터 */
  state: () => ({
    // 'celsius' | 'fahrenheit'
    unit: readSavedUnit(),
  }),

  /* getters — state 로부터 파생되는 값. 컴포넌트의 computed 와 같은 성격이다. */
  getters: {
    /** 화면에 붙일 단위 기호 */
    unitSymbol: (state) => (state.unit === 'fahrenheit' ? '°F' : '°C'),

    /** 내비게이션 바에 표시할 사람이 읽는 이름 */
    unitLabel: (state) => (state.unit === 'fahrenheit' ? '화씨(°F)' : '섭씨(°C)'),

    /** 조건 분기를 여러 곳에서 반복하지 않도록 불리언으로 제공 */
    isFahrenheit: (state) => state.unit === 'fahrenheit',
  },

  /* actions — state 를 변경하는 유일한 통로 */
  actions: {
    /** 섭씨 ↔ 화씨 전환 */
    toggleUnit() {
      this.unit = this.unit === 'celsius' ? 'fahrenheit' : 'celsius'
      this.persist()
    },

    /** 특정 단위로 직접 지정 (허용된 값만 받는다) */
    setUnit(next) {
      if (next !== 'celsius' && next !== 'fahrenheit') return
      this.unit = next
      this.persist()
    },

    /**
     * 설정을 브라우저에 저장한다.
     * 저장 시점을 action 안에 두면 값이 바뀌는 곳과 저장하는 곳이 한 함수에 모여
     * 변경 경로를 추적하기 쉽다.
     */
    persist() {
      localStorage.setItem(STORAGE_KEY, this.unit)
    },
  },
})
