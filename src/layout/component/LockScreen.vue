<script setup lang="ts">
import {ref} from 'vue'
import {Lock, User} from '@element-plus/icons-vue'
import {ElMessage} from 'element-plus'
import {useAppStore, useUserStore} from '@/stores'

const appStore = useAppStore()
const userStore = useUserStore()
const password = ref('')
const loading = ref(false)

const handleUnlock = async () => {
  if (!password.value) {
    ElMessage.warning('请输入密码')
    return
  }
  loading.value = true
}
</script>

<template>

</template>

<style scoped lang="scss">

</style>