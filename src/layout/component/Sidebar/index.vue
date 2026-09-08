<script setup lang="ts">
import {computed, type Component} from 'vue'
import {useRoute} from 'vue-router'
import {Setting, PieChart, User} from '@element-plus/icons-vue'
import {useAppStore, useUserStore} from '@/stores'
import {joinPath} from '@/utils/menu'
import Logo from "./Logo.vue"

const appStore = useAppStore()
const userStore = useUserStore()
const route = useRoute()

const menus = computed(() => userStore.menus
  .filter(m => m.visible !== false)
  .map(m => {
  // 顶级单页：渲染成一级菜单
  if (m.type === 2) {
    return {
      path: m.path,
      meta: {
        title: m.name, icon: m.icon
      }
    }
  }
  // 目录
  return {
    path: m.path,
    meta: {title: m.name, icon: m.icon},
    children: (m.children ?? [])
      .filter(m => m.visible !== false)
      .map(c => ({
        path: joinPath(m.path, c.path),
        meta: {title: c.name, icon: c.icon}
      }))
  }
}))

const activeMenu = computed(() => route.path)
</script>

<template>
  <div class="sidebar">
    <Logo/>
    <el-scrollbar>
      <el-menu
        :default-active="activeMenu"
        :collapse="!appStore.sidebar.opened"
        :collapse-transition="false"
        router
        background-color="#FFF"
        text-color="#29343D"
        active-text-color="#5D87FF"
      >
        <template v-for="item in menus" :key="item.path">
          <!-- 有 children -->
          <el-sub-menu v-if="item.children?.length" :index="item.path">
            <template #title>
              <el-icon v-if="item.meta?.icon">
                <component :is="item.meta?.icon"/>
              </el-icon>
              <span>{{ item.meta?.title }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.path"
              :index="child.path"
            >
              <el-icon v-if="child.meta?.icon">
                <component :is="child.meta?.icon"/>
              </el-icon>
              <template #title>{{ child.meta?.title }}</template>
            </el-menu-item>
          </el-sub-menu>
          <!-- 无 children -->
          <el-menu-item v-else :index="item.path">
            <el-icon v-if="item.meta?.icon">
              <component :is="item.meta?.icon"/>
            </el-icon>
            <template #title>{{ item.meta?.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<style lang="scss">
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #FFF;
  border-right: 1px solid #00000014;
  padding: 0 8px;

  .el-scrollbar {
    flex: 1;
  }

  .el-menu {
    border-right: none;
    width: 100%;
  }

  .el-menu-item,
  .el-sub-menu__title {
    height: 42px;
    border-radius: 6px;
    margin-bottom: 4px;
  }

  .el-menu-item:hover,
  .el-sub-menu__title:hover {
    background-color: #F2F4F5;
  }

  .el-menu-item.is-active {
    background-color: #EEF3FF;
  }

}
</style>