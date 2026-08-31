<script setup lang="ts">
import {useAppStore} from '@/stores'

const appStore = useAppStore()
</script>

<template>
  <div class="sidebar-logo" :class="{ collapse: !appStore.sidebar.opened }">
    <img alt="logo" src="@/assets/logo.png" class="logo-img" />
    <transition name="fade">
      <span v-if="appStore.sidebar.opened" class="logo-title">CloudSail Park</span>
    </transition>
  </div>
</template>

<style scoped lang="scss">
.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  overflow: hidden;
  white-space: nowrap;

  /* 折叠态：宽 64px，图标居中，藏文字 */
  &.collapse {
    justify-content: center;
    padding: 0;
    gap: 0;
  }
}

.logo-img {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  object-fit: contain;
}

.logo-title {
  font-size: 18px;
  font-weight: 500;
  color: #383853;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.28s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>