<!--
  ============================================================================
  App.vue — 애플리케이션의 최상위 컴포넌트(루트)
  ============================================================================

  [화면이 그려지는 순서]
    index.html  →  main.js  →  App.vue  →  WeatherParent  →  자식 컴포넌트들

  main.js 가 App.vue 를 index.html 의 <div id="app"> 자리에 붙인다.
  그래서 새로 만든 컴포넌트는 반드시 이 사슬 어딘가에 연결되어야 화면에 나온다.

  [과제별로 바꿔 보려면]
  아래 import 대상만 교체하면 된다.
    · 과제 1 → './components/WeatherMockup.vue'
    · 과제 2 → './components/WeatherComposition.vue'
    · 과제 3 → './components/WeatherParent.vue'   ← 현재
  ============================================================================
-->

<script setup>
import WeatherParent from './components/WeatherParent.vue'
</script>

<template>
  <WeatherParent />
</template>
