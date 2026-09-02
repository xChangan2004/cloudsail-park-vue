<script setup lang="ts">
import {ref} from 'vue'
import {Fold, Expand, FullScreen} from '@element-plus/icons-vue'
import {useAppStore, useUserStore} from "@/stores";
import BreadCrumb from './Breadcrumb.vue'
import {ElMessage, ElMessageBox} from "element-plus";
import {useRouter} from "vue-router";

const router = useRouter()
const appStore = useAppStore();
const userStore = useUserStore();

// 全屏
const isFullscreen = ref(false)

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

// 用户下拉处理
const handleCommand = async (command: string) => {
  if (command === 'logout') {
    // 二次确认，防止手滑
    try {
      await ElMessageBox.confirm('确认要退出登录吗？', '提示', {
        confirmButtonText: '退出',
        cancelButtonText: '取消',
        type: 'warning'
      })
      // 路由、store、标签栏的清理都在 logout 内部统一处理
      await userStore.logout()
      await router.push('/login')
    } catch {
      // 用户点击了取消，什么也不做
    }
  } else if (command === 'profile') {
    ElMessage.info("个人中心页面待实现");
  } else if (command === 'lockScreen') {
    ElMessage.info("锁屏功能待实现");
  }
}
</script>

<template>
  <header class="navbar">
    <el-icon class="hamburger" :size="20" @click="appStore.toggleSidebar()">
      <Fold v-if="appStore.sidebar.opened"/>
      <Expand v-else/>
    </el-icon>

    <BreadCrumb/>

    <div class="right-menu">
      <!-- 全屏 -->
      <div class="right-menu-item" @click="toggleFullscreen">
        <el-icon :size="20">
          <FullScreen/>
        </el-icon>
      </div>
      <!-- 用户头像 + 下拉 -->
      <el-dropdown placement="bottom-end" @command="handleCommand">
        <el-avatar :size="32" :src="userStore.avatar"/>
        <template #dropdown>
          <el-dropdown-menu class="user-dropdown-menu">
            <div class="user-profile-header">
              <el-avatar :size="40" :src="userStore.avatar"/>
              <div class="user-info-text">
                <div class="username">{{ userStore.username || 'Super' }}</div>
                <div class="nickname">{{ userStore.nickname || 'Admin' }}</div>
              </div>
            </div>
            <div class="menu-item-group">
              <el-dropdown-item command="profile">个人中心</el-dropdown-item>
              <el-dropdown-item command="lockScreen">锁定屏幕</el-dropdown-item>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </div>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<style scoped lang="scss">
.navbar {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #FAFBFC;
  gap: 16px;

  .hamburger {
    cursor: pointer;
  }

  .right-menu {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .right-menu-item {
      display: flex;
      align-items: center;
      height: 100%;
      padding: 8px 8px;
      cursor: pointer;
      border-radius: 4px;
      transition: background-color .2s;

      &:hover {
        background-color: #EDEFF0;
      }
    }
  }
}

// 自定义用户下拉框
.user-dropdown-menu {
  width: 180px;
  padding: 16px;

  .user-profile-header {
    display: flex;
    gap: 14px;
    align-items: center;

    .user-info-text {
      display: flex;
      flex-direction: column;

      .username {
        font-size: 14px;
        font-weight: 500;
        color: #383853;
      }

      .nickname {
        font-size: 12px;
        color: #949eb7;
      }
    }
  }

  .menu-item-group {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-top: 1px solid #ebeef5;
    padding: 10px 0;

    :deep(.el-dropdown-menu__item) {
      color: #606266;
    }

    :deep(.el-dropdown-menu__item:hover) {
      background-color: #F2F4F5;
    }
  }
}
</style>