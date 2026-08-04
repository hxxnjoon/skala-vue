<!--
  ============================================================================
  SearchBar.vue — 도시 검색 입력창
  ============================================================================

  [역할]
  검색어를 보여 주고, 입력이 생기면 부모에게 알린다.

  [핵심: 이 컴포넌트는 검색어를 소유하지 않는다]
  searchQuery 라는 ref 가 여기에 없다는 점이 중요하다.
  값은 부모(WeatherParent)가 갖고 있고, 이 컴포넌트는 복사본을 받아 표시만 한다.

      부모의 searchQuery  ──props(:query)──▶  SearchBar 가 화면에 표시
      부모의 searchQuery  ◀──emit('update-query')──  사용자가 입력

  이렇게 하면 값이 바뀌는 지점이 부모 한 곳뿐이라 추적이 쉽다.
  이것을 단방향 데이터 흐름(one-way data flow)이라고 한다.

  [받는 것 — props]
    query : 현재 검색어 (읽기 전용. 절대 직접 수정하지 않는다)

  [올리는 것 — emits]
    update-query : 사용자가 입력하거나 지웠을 때, 새 문자열을 실어 보낸다
  ============================================================================
-->

<script setup>
// props 를 변수에 담아 두면 script 안에서도 props.query 로 읽을 수 있다.

const props = defineProps({
  query: {
    type: String,
    default: '',
  },
})

// 이 컴포넌트가 부모에게 올릴 수 있는 이벤트 목록을 선언한다.
// 목록으로 적어 두면 나중에 이 파일만 봐도 어떤 신호를 보내는지 알 수 있고,
// 오타가 있을 때 개발 도구가 잡아 준다.
const emit = defineEmits(['update-query'])

/**
 * 입력이 발생할 때마다 호출된다.
 *
 * 여기서 props.query 를 직접 바꾸지 않는다는 점에 주목.
 * props 는 읽기 전용이므로 수정하면 Vue 가 콘솔에 경고를 띄운다.
 * 대신 "값이 이렇게 바뀌었어요" 라고 부모에게 알리기만 한다.
 */
const onInput = (event) => {
  emit('update-query', event.target.value)
}

/** × 버튼 — 빈 문자열을 올려보내 검색어를 지운다 */
const onClear = () => {
  emit('update-query', '')
}
</script>

<template>
  <div class="search">
    <div class="input-wrap">
      <!--
        v-model 을 쓰지 않고 :value + @input 으로 나눈 이유

        v-model 은 한글 IME 조합이 끝난 뒤에만 값을 갱신한다.
        그래서 '서울'을 칠 때 ㅅ → 서 → 설 → 서우 로 조합되는 과정이
        화면에 나타나지 않고, 다음 글자를 치거나 스페이스를 눌러야 반영된다.

        :value 로 표시하고 @input 을 직접 받으면 조합 중인 글자도 즉시 잡힌다.
      -->
      <input
        type="text"
        placeholder="검색할 도시 이름 입력"
        :value="props.query"
        @input="onInput"
      />

      <!-- v-if: 검색어가 있을 때만 지우기 버튼을 만든다 (없으면 DOM 에서 아예 제거) -->
      <button
        v-if="props.query !== ''"
        type="button"
        class="clear"
        aria-label="검색어 지우기"
        @click="onClear"
      >
        ×
      </button>
    </div>

    <!-- 입력한 도시명을 그대로 되비쳐 준다 -->
    <p class="echo">
      검색 중인 도시:
      <strong v-if="props.query !== ''">{{ props.query }}</strong>
      <em v-else>입력 없음 — 전체 도시를 보여주는 중</em>
    </p>
  </div>
</template>

<style scoped>
.search {
  display: block;
}

/* 지우기 버튼을 입력창 안쪽에 겹쳐 놓기 위한 기준점 */
.input-wrap {
  position: relative;
}

.input-wrap input {
  width: 100%;
  /* 지우기 버튼과 글자가 겹치지 않게 */
  padding: 11px 38px 11px 13px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-md);
  background: var(--surface-sunken);
  transition:
    border-color 0.18s var(--ease),
    background 0.18s var(--ease);
}

/* 입력 중임을 색으로 알림 */
.input-wrap input:focus {
  outline: none;
  border-color: var(--cool);
  background: var(--surface);
}

.clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%); /* 세로 정중앙 정렬 */
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: var(--line);
  color: var(--text-dim);
  font-size: 16px;
  line-height: 1;
}

.clear:hover {
  background: var(--line-strong);
}

.echo {
  margin: var(--gap-2) 0 0;
  font-size: 13px;
  color: var(--text-dim);
}

.echo strong {
  color: var(--cool); /* 실제 입력값을 눈에 띄게 */
}

.echo em {
  font-style: normal; /* 기울임 대신 흐린 색으로만 구분 */
  color: var(--text-faint);
}
</style>
