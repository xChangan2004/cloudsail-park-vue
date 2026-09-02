<script setup lang="ts">
import {reactive, ref} from 'vue'
import type {FormInstance, FormRules} from "element-plus";
import {ElNotification} from 'element-plus'
import {useUserStore} from '@/stores'
import {useRouter} from 'vue-router'

const router = useRouter()
const userStore = useUserStore()

// 表单ref
const loginFormRef = ref<FormInstance>()

// 表单数据
const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

// 规则
const rules = reactive<FormRules>({
  username: [
    {required: true, message: '请输入账号', trigger: 'blur'}
  ],
  password: [
    {required: true, message: '请输入密码', trigger: 'blur'},
    {min: 6, message: '密码至少 6 位', trigger: 'blur'},
  ],
})

// 登录加载
const loading = ref<boolean>(false)

// 处理登录逻辑
const handleLogin = async () => {
  if (!loginFormRef) return
  // 先通过规则校验
  await loginFormRef.value?.validate(async valid => {
    if (!valid) {
      // 校验不通过，终止执行
      return
    }

    loading.value = true
    try {
      console.log('提交登录：', loginForm)
      // 登录成功
      await userStore.login(loginForm)
      ElNotification({
        title: '提示',
        message: '登录成功，欢迎回来',
        type: 'success'
      })
      await router.push('/dashboard')
    } finally {
      loading.value = false
    }
  })
}
</script>

<template>
  <div class="login-page">
    <!-- 展示区 -->
    <div class="login-left">
      <!-- 品牌 -->
      <div class="brand">
        <img src="@/assets/logo.png" class="brand-logo"/>
        <span class="brand-name">CloudSail Park</span>
      </div>
      <!-- 底部版权 -->
      <div class="login-footer">
        Copyright &copy; 2026 CloudSail Park（云帆智泊）
      </div>
    </div>
    <!-- 登录表单 -->
    <div class="login-right">
      <div class="login-form-wrapper">
        <h3 class="form-title">欢迎回来</h3>
        <p class="form-sub-title">输入您的账号和密码登录</p>
        <el-form ref="loginFormRef" :model="loginForm" :rules="rules" class="login-form">
          <el-form-item prop="username">
            <el-input v-model="loginForm.username" placeholder="请输入账号" size="large"/>
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" size="large" show-password/>
          </el-form-item>
          <el-form-item>
            <el-row justify="space-between" align="middle" style="width: 100%">
              <el-col :span="12">
                <el-checkbox v-model="loginForm.remember">记住密码</el-checkbox>
              </el-col>
              <el-col :span="12" style="text-align: right">
                <el-text type="primary">忘记密码</el-text>
              </el-col>
            </el-row>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" class="submit-btn" size="large" @click="handleLogin">登 录</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  display: flex;
  height: 100vh;
  overflow: hidden;

  .login-left {
    position: relative;
    flex: 1.86;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #EEF3FF;

    .brand {
      position: absolute;
      top: 24px;
      left: 32px;
      display: flex;
      align-items: center;
      gap: 10px;

      .brand-logo {
        width: 46px;
      }

      .brand-name {
        font-size: 20px;
        font-weight: 500;
        color: #000;
      }
    }

    .login-footer {
      position: absolute;
      left: 32px;
      bottom: 20px;
      font-size: 12px;
    }
  }

  .login-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #fff;

    .login-form-wrapper {
      width: 440px;

      .form-title {
        font-size: 36px;
        font-weight: 600;
        color: #323251;
        line-height: 1.1;
      }

      .form-sub-title {
        font-size: 14px;
        color: #7987A1;
        margin-top: 10px;
      }

      .login-form {
        margin-top: 25px;

        .submit-btn {
          width: 100%;
        }
      }
    }
  }

  @media (max-width: 768px) {
    .login-left {
      display: none;
    }
    .login-right {
      flex: 1;
    }
  }
}
</style>