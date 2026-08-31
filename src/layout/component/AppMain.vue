<script setup lang="ts">
import {ref, watch} from 'vue'
import {useRoute} from 'vue-router'

const route = useRoute()
const mainRef = ref<HTMLElement>()

// 路由变了 → 滚动容器回到顶部
watch(() => route.path, () => {
  mainRef.value?.scrollTo({top: 0})
})
</script>

<template>
  <section class="app-main">
    <router-view v-slot="{ Component }">
      <transition name="fade-transform" mode="out-in">
        <component :is="Component"/>
      </transition>
    </router-view>
  </section>
</template>

<style scoped lang="scss">
.app-main {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background-color: #FAFBFC;
}

.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all .3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>