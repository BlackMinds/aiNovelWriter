<template>
  <div class="app-container dark">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  document.documentElement.classList.add('dark')
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
