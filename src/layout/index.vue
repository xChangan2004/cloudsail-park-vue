<script setup lang="ts">
import {computed} from 'vue'
import {Navbar, AppMain, TagsView} from './component'
import Sidebar from './component/Sidebar/index.vue'
import {useAppStore} from '@/stores'

const appStore = useAppStore()
const sidebarWidth = computed(() => (appStore.sidebar.opened ? '230px' : '64px'))
</script>

<template>
  <div class="app-wrapper">
    <aside class="sidebar-container" :style="{ width: sidebarWidth }">
      <Sidebar/>
    </aside>
    <main class="main-container">
      <Navbar/>
      <TagsView />
      <AppMain/>
    </main>
  </div>
</template>

<style scoped lang="scss">
.app-wrapper {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar-container {
  flex-shrink: 0;
  transition: width 0.28s;
}

.main-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
</style>