<!--
  ============================================================================
  BaseDashboardCard.vue — 대시보드 공통 상자 (껍데기 컴포넌트)
  ============================================================================

  [역할]
  디자인만 담당한다.
  안에 무엇이 들어갈지는 전혀 알지 못하며, 알 필요도 없다.

  [왜 만들었나]
  '도시 검색' 박스와 '지역별 날씨 현황' 박스는 테두리, 둥글기, 여백, 그림자가 완전히 같다.
  두 곳에 같은 CSS 를 복사해 두면 나중에 여백 하나를 바꿀 때 두 군데를 고쳐야 하고, 한쪽을 빠뜨리면 화면이 어긋난다.
  껍데기를 하나로 만들어 두면 이 파일만 고치면 두 상자가 함께 바뀐다.

  [받는 것 — props]
    title : 상자 제목 (필수)
    icon  : 제목 왼쪽 아이콘 종류 ('search' | 'chart')

  [올리는 것 — emits]
    없음. 이 컴포넌트는 사용자 입력을 받지 않는 순수 표시용이다.

  [슬롯]
    기본 슬롯      : 상자 본문. 부모가 넣어 준 내용이 그대로 들어온다.
    actions 슬롯   : 제목 오른쪽 자리. 개수 표시 같은 부가 정보용.
  ============================================================================
-->

<script setup>
// defineProps 는 import 없이 바로 쓸 수 있는 컴파일러 매크로다.
// 타입과 기본값을 적어 두면 잘못된 값이 들어왔을 때 콘솔에 경고가 뜬다.
defineProps({
  title: {
    type: String,
    required: true, // 제목 없는 상자는 만들 수 없게 강제한다
  },
  icon: {
    type: String,
    default: 'chart', // 지정하지 않으면 막대그래프 아이콘
  },
})

// 아이콘을 이모지 대신 SVG 경로 데이터로 관리한다.
// 이모지는 OS, 브라우저마다 모양과 크기가 달라져서 정렬이 흐트러진다.
// SVG 는 stroke="currentColor" 로 글자색을 그대로 따라가고 크기도 CSS 로 잡힌다.
const ICON_PATHS = {
  // 돋보기: 원 + 손잡이
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z', 'M16.2 16.2 21 21'],
  // 막대그래프: 막대 3개 + 바닥선
  chart: ['M4 20V10M10 20V4M16 20v-7M22 20H2'],
}
</script>

<template>
  <section class="box">
    <!-- 상자 머리: 제목 + (선택적) 오른쪽 부가 영역 -->
    <header class="box-head">
      <h2 class="box-title">
        <svg
          class="box-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <!--
            v-for 로 경로를 여러 개 그린다.
            아이콘에 따라 path 개수가 다르기 때문에(돋보기 2개, 막대 1개)
            반복문으로 처리하면 아이콘을 추가할 때 템플릿을 고칠 필요가 없다.
          -->
          <path v-for="(d, i) in ICON_PATHS[icon]" :key="i" :d="d" />
        </svg>
        {{ title }}
      </h2>

      <!--
        이름이 붙은 슬롯(named slot).
        부모가 <template #actions> 로 넘겨 준 내용만 여기 들어온다.
        아무것도 안 넘기면 빈 칸으로 남는다.
      -->
      <div class="box-actions">
        <slot name="actions" />
      </div>
    </header>

    <!--
      기본 슬롯(default slot).
      부모가 <BaseDashboardCard> ... </BaseDashboardCard> 사이에 쓴 내용이
      통째로 이 자리에 꽂힌다.

      중요: 여기 들어오는 내용은 부모의 코드다.
      따라서 그 내용에 적용할 CSS 는 이 파일이 아니라 부모의 <style scoped> 에 써야 한다.
    -->
    <div class="box-body">
      <slot />
    </div>
  </section>
</template>

<!--
  scoped 를 붙이면 이 파일의 선택자가 이 컴포넌트 안에서만 동작한다.
  다른 컴포넌트에도 .box 라는 클래스가 있어도 서로 간섭하지 않는다.
-->
<style scoped>
.box {
  /* 색, 둥글기, 그림자는 main.css 의 디자인 토큰을 참조한다.
     토큰 값 하나만 바꾸면 화면 전체 톤이 함께 바뀐다. */
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-1);
  overflow: hidden; /* 내부 요소가 둥근 모서리를 삐져나오지 않게 */
}

.box-head {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 제목은 왼쪽, actions 는 오른쪽 끝으로 */
  gap: var(--gap-2);
  padding: var(--gap-3) var(--gap-3) 0; /* 아래쪽 여백은 body 가 담당 */
}

.box-title {
  display: flex;
  align-items: center; /* 아이콘과 글자의 세로 중심을 맞춘다 */
  gap: 7px;
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--text-dim);
}

.box-icon {
  width: 15px;
  height: 15px;
  color: var(--text-faint); /* stroke="currentColor" 이므로 이 색을 따라간다 */
}

.box-actions {
  display: flex;
  align-items: center;
  gap: var(--gap-1);
}

.box-body {
  padding: var(--gap-3);
}
</style>
