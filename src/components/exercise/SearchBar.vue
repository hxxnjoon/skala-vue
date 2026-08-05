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
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'

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
 * el-input 을 :model-value(단방향) 로만 표시하면 문제가 생긴다.
 *
 * el-input 은 매 input 이벤트마다 자기 내부 값을 nextTick 뒤에
 * "props.modelValue 기준으로 다시 맞춰 쓰는" 로직을 갖고 있다. 그런데 우리가
 * :model-value 로만 값을 흘려보내면, 새 글자가 부모(WeatherHomeView)까지 갔다가
 * 다시 이 컴포넌트로 내려오는 왕복이 끝나야 el-input 의 modelValue 가 갱신된다.
 * el-input 의 "다시 맞춰 쓰기"가 이 왕복보다 먼저 일어나면, 방금 입력하거나
 * 지운 글자가 옛 값으로 되돌아가 버려서 마치 지워지지 않는 것처럼 보인다.
 *
 * 그래서 el-input 은 로컬 ref(localQuery)에 v-model 로 묶어 자기 안에서
 * 즉시·동기적으로 값이 맞물리게 하고, 부모로는 watch 로 한 번 더 실어 보낸다.
 */
const localQuery = ref(props.query)

watch(
  () => props.query,
  (value) => {
    if (value !== localQuery.value) localQuery.value = value
  },
)

watch(localQuery, (value) => {
  emit('update-query', value)
})

/**
 * el-input 은 한글 IME 조합 중에는 input 이벤트를 막아 두고
 * 조합이 끝난 뒤(compositionend)에만 자기 모델을 갱신한다. (element-plus 의
 * handleInput 이 `if (isComposing.value) return` 으로 가로챈다.) v-model 을 써도
 * 이 가드 자체는 피할 수 없다.
 *
 * 그래서 el-input 이 감싸고 있는 진짜 <input> DOM 노드를 ref 로 직접 붙잡아
 * 거기에 네이티브 input 리스너를 따로 단다. 네이티브 input 이벤트는 조합 중에도
 * 매 글자마다 그대로 발생하므로, 이 가드를 우회해 localQuery 를 즉시 갱신할 수 있다.
 */
const elInputRef = ref(null)

const onNativeInput = (event) => {
  localQuery.value = event.target.value
}

onMounted(() => {
  elInputRef.value?.input?.addEventListener('input', onNativeInput)
})

onBeforeUnmount(() => {
  elInputRef.value?.input?.removeEventListener('input', onNativeInput)
})
</script>

<template>
  <div class="search">
    <el-input
      ref="elInputRef"
      v-model="localQuery"
      placeholder="검색할 도시 이름 입력"
      size="large"
      clearable
      :prefix-icon="Search"
    />

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
