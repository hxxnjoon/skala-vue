<script setup>
import { ref } from 'vue'

// 요구사항 1: 배열 렌더링용 데이터
const weatherList = ref([
  { id: 'city_01', name: '서울', temp: 28, status: '맑음' },
  { id: 'city_02', name: '수원', temp: 24, status: '비' },
  { id: 'city_03', name: '부산', temp: 26, status: '구름' },
])

// 요구사항 3: 검색 input 값
const searchText = ref('')

// 요구사항 4: 상태바 메시지
const statusMessage = ref('카드를 클릭하거나 검색해 보세요.')

// :value + @input 수동 바인딩 (한글 조합 중에도 즉시 반영)
const onInput = (event) => {
  searchText.value = event.target.value
}

// 카드 클릭
const selectCity = (cityName) => {
  statusMessage.value = `${cityName}이 선택되었습니다.`
}

// 상세보기 버튼
const showDetail = (cityName, status) => {
  window.alert(`${cityName}의 현재 날씨는 [${status}] 상태입니다.`)
}
</script>

<template>
  <div class="wrap">
    <h2>🌤️ 과제 1: 날씨 (Mockup)</h2>

    <!-- 요구사항 3 -->
    <section class="box">
      <h3>🔍 도시 검색</h3>
      <input type="text" placeholder="검색할 도시 이름 입력" :value="searchText" @input="onInput" />
      <p>검색 중인 도시: {{ searchText }}</p>
    </section>

    <!-- 요구사항 1, 2, 4 -->
    <section class="box">
      <h3>📊 지역별 날씨 현황</h3>
      <div v-for="city in weatherList" :key="city.id" class="card" @click="selectCity(city.name)">
        <div>
          <strong>{{ city.name }} ({{ city.status }})</strong>
          <p>현재 기온: {{ city.temp }}°C</p>

          <!-- 요구사항 2 -->
          <span v-if="city.temp >= 25" class="tag hot">🔥 더움 (25도 이상)</span>
          <span v-else class="tag cool">❄️ 선선함 (25도 미만)</span>
        </div>

        <!-- .stop = 버블링 차단 -->
        <button @click.stop="showDetail(city.name, city.status)">상세보기</button>
      </div>
    </section>

    <p class="status">{{ statusMessage }}</p>
  </div>
</template>

<style scoped>
.wrap {
  max-width: 480px;
  margin: 40px auto;
  font-family: sans-serif;
}
.box {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}
.card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 12px;
  margin-top: 10px;
  cursor: pointer;
}
.card:hover {
  background: #fafafa;
}
.tag {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #fff;
}
.hot {
  background: #e74c3c;
}
.cool {
  background: #3498db;
}
.status {
  background: #eaf7ea;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
}
</style>
