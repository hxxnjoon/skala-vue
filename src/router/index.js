/**
 * router/index.js — 라우트 규칙 정의
 *
 * 라우터는 "주소(URL) ↔ 화면(컴포넌트)" 대응표다.
 *
 * 도시 상세보기는 페이지가 아니라 모달(CityDetailDialog)로 뜨지만, 화면은 여전히
 * WeatherHomeView 하나를 공유하면서 주소만 /weather/:cityId 로 바뀐다.
 * 덕분에 주소창에 도시 상세 링크를 직접 입력하거나 새로고침해도 그 도시의
 * 모달이 열린 채로 복원되고, 뒤로 가기를 누르면 모달만 닫힌다.
 */
import { createRouter, createWebHashHistory } from 'vue-router'

// 홈은 접속하자마자 무조건 필요하므로 미리 불러온다.
// 지연 로딩을 걸면 첫 화면에서 오히려 한 번 더 기다리게 된다.
import WeatherHomeView from '../views/WeatherHomeView.vue'

const router = createRouter({
  /**
   * 히스토리 모드 선택
   */
  history: createWebHashHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'home',
      component: WeatherHomeView,
    },
    {
      /**
       * 동적 세그먼트(:cityId). 같은 WeatherHomeView 를 그대로 재사용하고,
       * 컴포넌트 안에서 route.params.cityId 유무로 상세보기 모달을 연다.
       */
      path: '/weather/:cityId',
      name: 'weather-detail',
      component: WeatherHomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/WeatherAboutView.vue'),
    },
    {
      /**
       * Catch-all Route — 위 어느 규칙에도 걸리지 않은 주소를 전부 받는다.
       */
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],

  // 페이지를 옮길 때 스크롤을 맨 위로. 뒤로 가기는 원래 위치를 복원한다.
  scrollBehavior(to, from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

export default router
