<script setup lang="ts">
import {computed, type Component} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {Setting, PieChart, User} from '@element-plus/icons-vue'
import {useAppStore} from '@/stores'
import Logo from "./Logo.vue";

const appStore = useAppStore()
const route = useRoute()
const router = useRouter()

const menus = computed(() => {
  // getRoutes()：拿到运行时全部路由（包含后续addRoute动态添加）
  const allRoutes = router.getRoutes()
  const layoutRoute = allRoutes.find(r => r.path === '/')
  // 过滤 hidden=true 的菜单
  return (layoutRoute?.children ?? []).filter(item => !item.meta?.hidden)
})

// icon 名 -> 组件，菜单多了往这补
const iconMap: Record<string, Component> = {Setting, PieChart, User}
const getIcon = (name?: string) => iconMap[name ?? '']

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
          <el-sub-menu v-if="item.children?.length" :index="'/' + item.path">
            <template #title>
              <el-icon v-if="getIcon(item.meta?.icon)">
                <component :is="getIcon(item.meta?.icon)"/>
              </el-icon>
              <span>{{ item.meta?.title }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.path"
              :index="'/' + item.path + '/' + child.path"
            >
              <el-icon v-if="getIcon(child.meta?.icon)">
                <component :is="getIcon(child.meta?.icon)"/>
              </el-icon>
              <template #title>{{ child.meta?.title }}</template>
            </el-menu-item>
          </el-sub-menu>
          <!-- 无 children -->
          <el-menu-item v-else :index="'/' + item.path">
            <el-icon v-if="getIcon(item.meta?.icon)">
              <component :is="getIcon(item.meta?.icon)"/>
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